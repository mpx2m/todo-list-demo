import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { CreateTodoDto } from './dto/create-todo.dto';
import { SearchTodoDto, SortOrder } from './dto/search-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { Todo } from './schemas/todo.schema';
import { TodoDependency } from './schemas/todo-dependency.schema';
import {
  Recurrence,
  RecurrenceConfig,
  RecurrenceUnit,
  TodoStatus,
} from './types';

@Injectable()
export class TodosService {
  constructor(
    @InjectModel(Todo.name) private todoModel: Model<Todo>,
    @InjectModel(TodoDependency.name)
    private todoDependencyModel: Model<TodoDependency>,
  ) {}

  async create(createTodoDto: CreateTodoDto): Promise<Todo> {
    this.assertDueDateForRecurrence(createTodoDto);
    const payload = this.buildTodoPayload(createTodoDto);
    return this.todoModel.create(payload);
  }

  async findOne(id: string): Promise<Todo | null> {
    return this.todoModel.findOne({ _id: id, deletedAt: null }).exec();
  }

  async search(query: SearchTodoDto) {
    const {
      name,
      dueDateStart,
      dueDateEnd,
      status,
      priority,
      sortBy,
      sortOrder,
      page,
      limit,
    } = query;

    const filter: Record<string, unknown> = { deletedAt: null };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (name?.trim()) filter.name = { $regex: name.trim(), $options: 'i' };

    if (dueDateStart || dueDateEnd) {
      const dueFilter: Record<string, Date> = {};
      if (dueDateStart) dueFilter.$gte = new Date(dueDateStart);
      if (dueDateEnd) dueFilter.$lte = new Date(dueDateEnd);
      if (Object.keys(dueFilter).length > 0) filter.dueDate = dueFilter;
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === SortOrder.ASC ? 1 : -1,
      _id: -1,
    };

    const [total, rows] = await Promise.all([
      this.todoModel.countDocuments(filter).exec(),
      this.todoModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    return {
      total,
      page,
      limit,
      results: rows,
    };
  }

  async update(id: string, updateTodoDto: UpdateTodoDto): Promise<Todo | null> {
    const session = await this.todoModel.db.startSession();
    session.startTransaction();

    try {
      const existing = await this.todoModel
        .findOne({ _id: id, deletedAt: null })
        .session(session)
        .exec();
      if (!existing) {
        await session.abortTransaction();
        return null;
      }

      const nextStatus = updateTodoDto.status ?? existing.status;

      this.assertDueDateForRecurrence({
        dueDate: updateTodoDto.dueDate,
        recurrence: updateTodoDto.recurrence,
      });

      if (
        existing.status !== TodoStatus.IN_PROGRESS &&
        nextStatus === TodoStatus.IN_PROGRESS
      ) {
        await this.ensureDependenciesReadyForInProgress(id, session);
      }

      const updatePayload = this.buildUpdatePayload(updateTodoDto);

      const updated = await this.todoModel
        .findOneAndUpdate({ _id: id, deletedAt: null }, updatePayload, {
          returnDocument: 'after',
          session,
        })
        .exec();

      if (!updated) {
        await session.abortTransaction();
        return null;
      }

      await this.createNextRecurringTodoIfNeeded(
        id,
        existing,
        updated,
        session,
      );

      await session.commitTransaction();
      return updated;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async remove(id: string): Promise<Todo | null> {
    const session: ClientSession = await this.todoModel.db.startSession();
    session.startTransaction();

    try {
      const todo = await this.todoModel
        .findOne({ _id: id, deletedAt: null })
        .session(session)
        .exec();

      if (!todo) {
        await session.abortTransaction();
        return null;
      }

      const now = new Date();
      await this.todoModel
        .updateOne(
          { _id: id, deletedAt: null },
          { $set: { deletedAt: now } },
          { session },
        )
        .exec();

      await this.todoDependencyModel
        .updateMany(
          {
            deletedAt: null,
            $or: [{ prerequisiteId: id }, { dependentId: id }],
          },
          { $set: { deletedAt: now } },
          { session },
        )
        .exec();

      await session.commitTransaction();
      return todo;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async addDependencies(dependentId: string, prerequisiteIds: string[]) {
    if (prerequisiteIds.length === 0) {
      return { dependentId, created: 0 };
    }

    const session = await this.todoModel.db.startSession();
    session.startTransaction();

    try {
      const dependentTodo = await this.todoModel
        .findOne({ _id: dependentId, deletedAt: null })
        .session(session)
        .lean()
        .exec();
      if (!dependentTodo) {
        throw new NotFoundException(`Todo with id ${dependentId} not found`);
      }

      const uniquePrerequisiteIds = [...new Set(prerequisiteIds)];
      if (uniquePrerequisiteIds.some((id) => id === dependentId)) {
        throw new BadRequestException('Todo cannot depend on itself');
      }

      const prerequisites = await this.todoModel
        .find({ _id: { $in: uniquePrerequisiteIds }, deletedAt: null })
        .session(session)
        .lean()
        .exec();
      const foundIds = new Set(prerequisites.map((item) => String(item._id)));
      const missingIds = uniquePrerequisiteIds.filter(
        (id) => !foundIds.has(id),
      );
      if (missingIds.length > 0) {
        throw new NotFoundException(
          `Prerequisite todo(s) not found: ${missingIds.join(', ')}`,
        );
      }

      for (const prerequisiteId of uniquePrerequisiteIds) {
        const hasCycle = await this.wouldCreateCycle(
          prerequisiteId,
          dependentId,
          session,
        );
        if (hasCycle) {
          throw new BadRequestException(
            `Adding edge ${prerequisiteId} -> ${dependentId} introduces a cycle`,
          );
        }
      }

      const existingEdges = await this.todoDependencyModel
        .find({
          prerequisiteId: { $in: uniquePrerequisiteIds },
          dependentId,
          deletedAt: null,
        })
        .session(session)
        .lean()
        .exec();
      const existingPrerequisiteSet = new Set(
        existingEdges.map((edge) => String(edge.prerequisiteId)),
      );

      const toCreate = uniquePrerequisiteIds
        .filter((id) => !existingPrerequisiteSet.has(id))
        .map((id) => ({ prerequisiteId: id, dependentId }));

      if (toCreate.length > 0) {
        await this.todoDependencyModel.insertMany(toCreate, { session });
      }

      await session.commitTransaction();
      return {
        dependentId,
        created: toCreate.length,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async removeDependency(dependentId: string, prerequisiteId: string) {
    const session = await this.todoModel.db.startSession();
    session.startTransaction();

    try {
      const edge = await this.todoDependencyModel
        .findOneAndUpdate(
          {
            dependentId,
            prerequisiteId,
            deletedAt: null,
          },
          {
            $set: { deletedAt: new Date() },
          },
          { returnDocument: 'after', session },
        )
        .exec();

      await session.commitTransaction();
      return { removed: Boolean(edge) };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async listDependencies(id: string) {
    const edges = await this.todoDependencyModel
      .find({ dependentId: id, deletedAt: null })
      .lean()
      .exec();
    const prerequisiteIds = [
      ...new Set(edges.map((edge) => String(edge.prerequisiteId))),
    ];
    if (prerequisiteIds.length === 0) {
      return [];
    }
    return this.todoModel
      .find({ _id: { $in: prerequisiteIds }, deletedAt: null })
      .lean()
      .exec();
  }

  async listDependents(id: string) {
    const edges = await this.todoDependencyModel
      .find({ prerequisiteId: id, deletedAt: null })
      .lean()
      .exec();
    const dependentIds = [
      ...new Set(edges.map((edge) => String(edge.dependentId))),
    ];
    if (dependentIds.length === 0) {
      return [];
    }
    return this.todoModel
      .find({ _id: { $in: dependentIds }, deletedAt: null })
      .lean()
      .exec();
  }

  private async wouldCreateCycle(
    prerequisiteId: string,
    dependentId: string,
    session: ClientSession,
  ): Promise<boolean> {
    if (prerequisiteId === dependentId) {
      return true;
    }

    const dependentObjectId = new Types.ObjectId(dependentId);
    const prerequisiteObjectId = new Types.ObjectId(prerequisiteId);

    const [result] = await this.todoModel
      .aggregate<{ hasCycle: boolean }>([
        {
          $match: {
            _id: dependentObjectId,
            deletedAt: null,
          },
        },
        {
          $graphLookup: {
            from: this.todoDependencyModel.collection.name,
            startWith: '$_id',
            connectFromField: 'dependentId',
            connectToField: 'prerequisiteId',
            as: 'reachableDependencyEdges',
            restrictSearchWithMatch: {
              deletedAt: null,
            },
          },
        },
        {
          $project: {
            hasCycle: {
              $in: [
                prerequisiteObjectId,
                '$reachableDependencyEdges.dependentId',
              ],
            },
          },
        },
      ])
      .session(session)
      .exec();

    return Boolean(result?.hasCycle);
  }

  private getNextDueDate(baseDate: Date, recurrence: RecurrenceConfig): Date {
    const next = new Date(baseDate);
    switch (recurrence.type) {
      case Recurrence.DAILY:
        next.setDate(next.getDate() + 1);
        return next;
      case Recurrence.WEEKLY:
        next.setDate(next.getDate() + 7);
        return next;
      case Recurrence.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        return next;
      case Recurrence.CUSTOM:
        return this.addCustomInterval(next, recurrence);
      default:
        return next;
    }
  }

  private normalizeRecurrence(recurrence: RecurrenceConfig): RecurrenceConfig {
    if (recurrence.type !== Recurrence.CUSTOM) {
      return {
        type: recurrence.type,
      };
    }

    if (!recurrence.interval || !recurrence.unit) {
      throw new BadRequestException(
        'Custom recurrence requires both interval and unit',
      );
    }

    return {
      type: recurrence.type,
      interval: recurrence.interval,
      unit: recurrence.unit,
    };
  }

  private addCustomInterval(date: Date, recurrence: RecurrenceConfig): Date {
    if (!recurrence.interval) {
      throw new BadRequestException(
        'Custom recurrence requires a valid interval',
      );
    }

    const interval = recurrence.interval;

    switch (recurrence.unit) {
      case RecurrenceUnit.WEEK:
        date.setDate(date.getDate() + interval * 7);
        return date;
      case RecurrenceUnit.MONTH:
        date.setMonth(date.getMonth() + interval);
        return date;
      case RecurrenceUnit.DAY:
      default:
        date.setDate(date.getDate() + interval);
        return date;
    }
  }

  private buildTodoPayload(todo: {
    name: string;
    description?: string;
    dueDate?: string | Date;
    priority?: Todo['priority'];
    recurrence?: RecurrenceConfig;
    status?: Todo['status'];
  }): Record<string, unknown> {
    const payload: Record<string, unknown> = { ...todo };

    if (todo.recurrence) {
      payload.recurrence = this.normalizeRecurrence(todo.recurrence);
    } else {
      delete payload.recurrence;
    }

    return payload;
  }

  private assertDueDateForRecurrence(todo: {
    dueDate?: string | Date;
    recurrence?: RecurrenceConfig;
  }): void {
    if (todo.recurrence && !todo.dueDate) {
      throw new BadRequestException(
        'Due date is required when recurrence is provided',
      );
    }
  }

  private buildUpdatePayload(
    updateTodoDto: UpdateTodoDto,
  ): Record<string, unknown> {
    const setPayload = Object.fromEntries(
      Object.entries(updateTodoDto).filter(([, v]) => v !== undefined),
    );
    const unsetPayload: Record<string, 1> = {};

    if (updateTodoDto.dueDate === undefined) {
      unsetPayload.dueDate = 1;
    }

    if (updateTodoDto.recurrence) {
      setPayload.recurrence = this.normalizeRecurrence(
        updateTodoDto.recurrence,
      );
    } else {
      delete setPayload.recurrence;
      unsetPayload.recurrence = 1;
    }

    const updatePayload: Record<string, unknown> = {};
    if (Object.keys(setPayload).length > 0) {
      updatePayload.$set = setPayload;
    }
    if (Object.keys(unsetPayload).length > 0) {
      updatePayload.$unset = unsetPayload;
    }

    return updatePayload;
  }

  private async createNextRecurringTodoIfNeeded(
    todoId: string,
    existing: Todo,
    updated: Todo,
    session: ClientSession,
  ): Promise<void> {
    if (
      existing.status === TodoStatus.COMPLETED ||
      updated.status !== TodoStatus.COMPLETED ||
      !updated.recurrence
    ) {
      return;
    }

    const baseDueDate = updated.dueDate
      ? new Date(updated.dueDate)
      : new Date();
    const nextDueDate = this.getNextDueDate(baseDueDate, updated.recurrence);

    const [nextTodo] = await this.todoModel.create(
      [
        this.buildTodoPayload({
          name: updated.name,
          description: updated.description,
          dueDate: nextDueDate,
          priority: updated.priority,
          recurrence: updated.recurrence,
          status: TodoStatus.NOT_STARTED,
        }),
      ],
      { session },
    );

    const activePrerequisiteEdges = await this.todoDependencyModel
      .find({ dependentId: todoId, deletedAt: null })
      .session(session)
      .lean()
      .exec();

    if (activePrerequisiteEdges.length === 0) {
      return;
    }

    const copyEdges = activePrerequisiteEdges.map((edge) => ({
      prerequisiteId: edge.prerequisiteId,
      dependentId: nextTodo._id,
    }));
    await this.todoDependencyModel.insertMany(copyEdges, { session });
  }

  private async ensureDependenciesReadyForInProgress(
    todoId: string,
    session: ClientSession,
  ): Promise<void> {
    const edges = await this.todoDependencyModel
      .find({ dependentId: todoId, deletedAt: null })
      .session(session)
      .lean()
      .exec();

    if (edges.length === 0) {
      return;
    }

    const prerequisiteIds = [
      ...new Set(edges.map((edge) => String(edge.prerequisiteId))),
    ];

    const prerequisites = await this.todoModel
      .find({
        _id: { $in: prerequisiteIds },
        deletedAt: null,
      })
      .session(session)
      .select({ _id: 1, name: 1, status: 1 })
      .lean()
      .exec();

    const readyStatuses = new Set([TodoStatus.COMPLETED, TodoStatus.ARCHIVED]);
    const blockedPrerequisites = prerequisites.filter(
      (todo) => !readyStatuses.has(todo.status),
    );

    const foundIds = new Set(prerequisites.map((todo) => String(todo._id)));
    const missingIds = prerequisiteIds.filter((item) => !foundIds.has(item));

    if (blockedPrerequisites.length === 0 && missingIds.length === 0) {
      return;
    }

    const blockedLabels = blockedPrerequisites.map(
      (todo) => `${todo.name ?? String(todo._id)} (${todo.status})`,
    );
    const messages = [...blockedLabels, ...missingIds];

    throw new BadRequestException(
      `Todo cannot move to IN_PROGRESS until dependencies are COMPLETED or ARCHIVED: ${messages.join(', ')}`,
    );
  }
}
