import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TodoStatus, TodoPriority, Recurrence } from '../types';

export type TodoDocument = HydratedDocument<Todo>;

@Schema({ timestamps: true })
export class Todo {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop()
  dueDate?: Date;

  @Prop()
  path?: string;

  @Prop({ default: 0 })
  depth: number;

  @Prop({ enum: TodoStatus, default: TodoStatus.NOT_STARTED })
  status: TodoStatus;

  @Prop({ enum: TodoPriority, default: TodoPriority.LOW })
  priority: TodoPriority;

  @Prop({ enum: Recurrence, default: Recurrence.NONE })
  recurrence: Recurrence;

  @Prop()
  customInterval?: number;

  @Prop()
  deletedAt?: Date;
}

export const TodoSchema = SchemaFactory.createForClass(Todo);

TodoSchema.index({ name: 'text' });
TodoSchema.index({ status: 1, priority: 1, dueDate: 1 });
TodoSchema.index({ path: 1 });
