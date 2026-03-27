import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession } from 'mongoose';
import { Todo } from './schemas/todo.schema';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { SearchTodoDto, SortOrder } from './dto/search-todo.dto';
import { TodoTreeNode, Recurrence } from './types';

@Injectable()
export class TodosService {
  constructor(@InjectModel(Todo.name) private todoModel: Model<Todo>) {}

  async create(createTodoDto: CreateTodoDto): Promise<Todo> {
    const { parentId, ...rest } = createTodoDto;
    const payload: Record<string, any> = {
      ...rest,
      path: null,
      depth: 0,
    };

    if (!parentId) {
      return await this.todoModel.create(payload);
    }

    const session: ClientSession = await this.todoModel.db.startSession();
    session.startTransaction();

    try {
      const parent = await this.todoModel
        .findById(parentId)
        .session(session)
        .lean()
        .exec();

      if (!parent) {
        throw new NotFoundException(
          `Parent todo with id ${parentId} not found`,
        );
      }

      const normalizedParentId = String(parent._id);
      payload.path = parent.path
        ? `${parent.path}:${normalizedParentId}`
        : normalizedParentId;
      payload.depth = (parent.depth ?? 0) + 1;

      const [createdTodo] = await this.todoModel.create([payload], { session });
      await session.commitTransaction();
      return createdTodo;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async findAll(): Promise<Todo[]> {
    return this.todoModel.find().exec();
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

    const filter: Record<string, any> = {};
    filter.path = null;

    if (status) {
      filter.status = status;
    }
    if (priority) {
      filter.priority = priority;
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
        children: [],
      });
    }

    for (const todo of descendants) {
      const currentId = String(todo._id);
      const pathSegments = (todo.path as string).split(':').filter(Boolean);
      const parentId = pathSegments[pathSegments.length - 1];
      const parentNode = nodeMap.get(parentId)!;
      const currentNode = nodeMap.get(currentId)!;
      parentNode.children.push(currentNode);
    }

    const resultsWithChildren = rootIds.map((id) => nodeMap.get(id));

    return {
      total,
      page,
      limit,
      results: resultsWithChildren,
    };
  }

  async findOne(id: string): Promise<Todo | null> {
    return this.todoModel.findById(id).exec();
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
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .exec();
  }

  async remove(id: string): Promise<Todo | null> {
    return await this.todoModel.findByIdAndDelete(id).exec();
  }
}
