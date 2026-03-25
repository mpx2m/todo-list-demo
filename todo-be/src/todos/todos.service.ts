import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Todo } from './schemas/todo.schema';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';

@Injectable()
export class TodosService {
  constructor(@InjectModel(Todo.name) private todoModel: Model<Todo>) {}

  async create(createTodoDto: CreateTodoDto): Promise<Todo> {
    return await this.todoModel.create(createTodoDto);
  }

  async findAll(): Promise<Todo[]> {
    return this.todoModel.find().exec();
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
