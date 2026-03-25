import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TodoStatus, TodoPriority } from '../entities/todo.entity';

export type TodoDocument = HydratedDocument<Todo>;

@Schema({ timestamps: true })
export class Todo {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  dueDate?: Date;

  @Prop({ enum: TodoStatus, default: TodoStatus.NOT_STARTED })
  status: TodoStatus;

  @Prop({ enum: TodoPriority, default: TodoPriority.MEDIUM })
  priority: TodoPriority;
}

export const TodoSchema = SchemaFactory.createForClass(Todo);
