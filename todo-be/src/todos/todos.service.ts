import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { Todo } from './schemas/todo.schema';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { SearchTodoDto, SortOrder } from './dto/search-todo.dto';
import {
  DependencyStatus,
  TodoStatus,
  TodoTreeNode,
  Recurrence,
} from './types';

@Injectable()
export class TodosService {
  constructor(@InjectModel(Todo.name) private todoModel: Model<Todo>) {}

  async create(createTodoDto: CreateTodoDto): Promise<Todo> {
    const { parentId, ...rest } = createTodoDto;
    const payload: Record<string, any> = {
      ...rest,
      path: null,
      depth: 0,
      dependencyStatus: DependencyStatus.UNBLOCKED,
    };

    if (!parentId) {
      return await this.todoModel.create(payload);
    }

    const session: ClientSession = await this.todoModel.db.startSession();
    session.startTransaction();

    try {
      const parent = await this.todoModel
        .findOne({ _id: parentId, deletedAt: null })
        .session(session)
        .lean()
        .exec();

      if (!parent) {
        throw new NotFoundException(
          `Parent todo with id ${parentId} not found`,
        );
      }

      const normalizedParentId = String(parent._id);
      const parentPath = parent.path
        ? `${parent.path}:${normalizedParentId}`
        : normalizedParentId;
      payload.path = parentPath;
      payload.depth = (parent.depth ?? 0) + 1;

      const [createdTodo] = await this.todoModel.create([payload], { session });

      const childStatus: TodoStatus =
        (payload.status as TodoStatus | undefined) ?? TodoStatus.NOT_STARTED;
      if (
        childStatus === TodoStatus.NOT_STARTED ||
        childStatus === TodoStatus.IN_PROGRESS
      ) {
        const ancestorIds: string[] = parentPath.split(':').filter(Boolean);
        await this.todoModel
          .updateMany(
            {
              _id: { $in: ancestorIds },
              deletedAt: null,
            },
            {
              $set: {
                status: TodoStatus.NOT_STARTED,
                dependencyStatus: DependencyStatus.BLOCKED,
              },
            },
            { session },
          )
          .exec();
      }

      await session.commitTransaction();
      return createdTodo;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async search(query: SearchTodoDto) {
    const {
      name,
      dueDateStart,
      dueDateEnd,
      status,
      priority,
      dependencyStatus,
      sortBy,
      sortOrder,
      page,
      limit,
    } = query;

    const filter: Record<string, any> = {};
    filter.path = null;
    filter.deletedAt = null;

    if (status) {
      filter.status = status;
    }
    if (priority) {
      filter.priority = priority;
    }
    if (dependencyStatus) {
      filter.dependencyStatus = dependencyStatus;
    }
    if (name?.trim()) {
      filter.$text = { $search: name.trim() };
    }

    if (dueDateStart || dueDateEnd) {
      const dateFilter: Record<string, Date> = {};

      if (dueDateStart) {
        const startDate = new Date(dueDateStart);
        dateFilter.$gte = startDate;
      }
      if (dueDateEnd) {
        dateFilter.$lte = new Date(dueDateEnd);
      }
      if (Object.keys(dateFilter).length > 0) {
        filter.dueDate = dateFilter;
      }
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === SortOrder.ASC ? 1 : -1,
      _id: -1,
    };

    const [total, rootResults] = await Promise.all([
      this.todoModel.countDocuments(filter).exec(),
      this.todoModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
    ]);

    const rootIds = rootResults.map((todo) => String(todo._id));
    const descendants =
      rootIds.length === 0
        ? []
        : await this.todoModel
            .find({
              deletedAt: null,
              $or: rootIds.map((id) => ({
                path: { $regex: `^${id}(:|$)` },
              })),
            })
            .sort(sort)
            .lean()
            .exec();

    const nodeMap = new Map<string, TodoTreeNode>();

    for (const todo of [...rootResults, ...descendants]) {
      nodeMap.set(String(todo._id), {
        ...todo,
        _id: String(todo._id),
      });
    }

    for (const todo of descendants) {
      const currentId = String(todo._id);
      const pathSegments = (todo.path as string).split(':').filter(Boolean);
      const parentId = pathSegments[pathSegments.length - 1];
      const parentNode = nodeMap.get(parentId)!;
      const currentNode = nodeMap.get(currentId)!;
      parentNode.children ??= [];
      parentNode.children.push(currentNode);
    }

    const resultsWithChildren = rootIds
      .map((id) => nodeMap.get(id))
      .filter((node): node is TodoTreeNode => node !== undefined);

    return {
      total,
      page,
      limit,
      results: resultsWithChildren,
    };
  }

  async update(id: string, updateTodoDto: UpdateTodoDto): Promise<Todo | null> {
    const setPayload = Object.fromEntries(
      Object.entries(updateTodoDto).filter(([, v]) => v !== undefined),
    );

    const updatePayload: Record<string, any> = { $set: setPayload };

    if (
      updateTodoDto.recurrence &&
      updateTodoDto.recurrence !== Recurrence.CUSTOM
    ) {
      updatePayload.$unset = { customInterval: 1 };
    }

    return this.todoModel
      .findOneAndUpdate({ _id: id, deletedAt: null }, updatePayload, {
        new: true,
      })
      .exec();
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
      const todoId = String(todo._id);
      const subtreePath = todo.path ? `${todo.path}:${todoId}` : todoId;
      const ancestorIds = todo.path?.split(':').filter(Boolean) ?? [];

      await this.todoModel
        .updateMany(
          {
            deletedAt: null,
            $or: [
              { _id: todo._id },
              { path: { $regex: `^${subtreePath}(:|$)` } },
            ],
          },
          { $set: { deletedAt: now } },
          { session },
        )
        .exec();

      const ancestors =
        ancestorIds.length === 0
          ? []
          : await this.todoModel
              .find({
                _id: { $in: ancestorIds },
                deletedAt: null,
              })
              .session(session)
              .lean()
              .exec();
      const ancestorMap = new Map(
        ancestors.map((ancestor) => [String(ancestor._id), ancestor]),
      );

      const firstAncestorId =
        ancestorIds.length > 0
          ? ancestorIds[ancestorIds.length - 1]
          : undefined;
      const firstAncestor = firstAncestorId
        ? ancestorMap.get(firstAncestorId)
        : undefined;

      // Only when the first ancestor is BLOCKED, recompute all ancestors.
      if (
        firstAncestor &&
        firstAncestor.dependencyStatus === DependencyStatus.BLOCKED
      ) {
        const ancestorsToBlocked: string[] = [];
        const ancestorsToUnblocked: string[] = [];

        // Re-evaluate dependency status for all ancestors of the removed subtree.
        for (const ancestorId of ancestorIds) {
          const ancestor = ancestorMap.get(ancestorId);

          if (!ancestor) {
            continue;
          }

          const ancestorPath = ancestor.path
            ? `${ancestor.path}:${ancestorId}`
            : ancestorId;

          const remainingDescendants = await this.todoModel
            .find({
              deletedAt: null,
              path: { $regex: `^${ancestorPath}(:|$)` },
            })
            .session(session)
            .lean()
            .exec();

          const hasPendingOrInProgressDescendant = remainingDescendants.some(
            (node) =>
              node.status === TodoStatus.NOT_STARTED ||
              node.status === TodoStatus.IN_PROGRESS,
          );
          const nextDependencyStatus = hasPendingOrInProgressDescendant
            ? DependencyStatus.BLOCKED
            : DependencyStatus.UNBLOCKED;

          if (nextDependencyStatus !== ancestor.dependencyStatus) {
            if (nextDependencyStatus === DependencyStatus.BLOCKED) {
              ancestorsToBlocked.push(ancestorId);
            } else {
              ancestorsToUnblocked.push(ancestorId);
            }
          }
        }

        if (ancestorsToBlocked.length > 0) {
          await this.todoModel
            .updateMany(
              {
                _id: { $in: ancestorsToBlocked },
                deletedAt: null,
              },
              { $set: { dependencyStatus: DependencyStatus.BLOCKED } },
              { session },
            )
            .exec();
        }

        if (ancestorsToUnblocked.length > 0) {
          await this.todoModel
            .updateMany(
              {
                _id: { $in: ancestorsToUnblocked },
                deletedAt: null,
              },
              { $set: { dependencyStatus: DependencyStatus.UNBLOCKED } },
              { session },
            )
            .exec();
        }
      }

      await session.commitTransaction();
      return todo;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
