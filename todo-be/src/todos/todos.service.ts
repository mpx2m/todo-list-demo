import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Todo } from './schemas/todo.schema';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { SearchTodoDto, SortOrder } from './dto/search-todo.dto';

@Injectable()
export class TodosService {
  constructor(@InjectModel(Todo.name) private todoModel: Model<Todo>) {}

  async create(createTodoDto: CreateTodoDto): Promise<Todo> {
    return await this.todoModel.create(createTodoDto);
  }

  async findAll(): Promise<Todo[]> {
    return this.todoModel.find().exec();
  }

  async search(query: SearchTodoDto) {
    const {
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

    if (status) {
      filter.status = status;
    }
    if (priority) {
      filter.priority = priority;
    }

    if (dueDateStart || dueDateEnd) {
      const dateFilter: Record<string, Date> = {};

      if (dueDateStart) {
        const startDate = new Date(dueDateStart);
        dateFilter.$gte = startDate;
      }
      if (dueDateEnd) {
        const endDate = new Date(dueDateEnd);
        endDate.setDate(endDate.getDate() + 1);
        dateFilter.$lt = endDate;
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

    const [total, results] = await Promise.all([
      this.todoModel.countDocuments(filter).exec(),
      this.todoModel.find(filter).sort(sort).skip(skip).limit(limit).exec(),
    ]);

    return {
      total,
      page,
      limit,
      results,
    };
  }

  async findOne(id: string): Promise<Todo | null> {
    return this.todoModel.findById(id).exec();
  }

  async update(id: string, updateTodoDto: UpdateTodoDto): Promise<Todo | null> {
    return this.todoModel
      .findByIdAndUpdate(id, updateTodoDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<Todo | null> {
    return await this.todoModel.findByIdAndDelete(id).exec();
  }
}
