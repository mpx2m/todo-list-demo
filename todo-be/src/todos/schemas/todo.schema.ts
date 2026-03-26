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

  @Prop({ enum: TodoPriority, default: TodoPriority.LOW })
  priority: TodoPriority;
}

export const TodoSchema = SchemaFactory.createForClass(Todo);

TodoSchema.index({ name: 'text', description: 'text' });
TodoSchema.index({ status: 1, priority: 1, dueDate: 1 });
