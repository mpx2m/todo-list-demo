import {
  IsDateString,
  Min,
  IsOptional,
  IsEnum,
  IsString,
  IsNotEmpty,
  IsMongoId,
} from 'class-validator';
import { TodoStatus, TodoPriority, Recurrence } from '../types';

export class Todo {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsMongoId()
  parentId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: Date;

  @IsOptional()
  @IsEnum(TodoStatus)
  status?: TodoStatus;

  @IsOptional()
  @IsEnum(TodoPriority)
  priority?: TodoPriority;

  @IsOptional()
  @IsEnum(Recurrence)
  recurrence?: Recurrence;

  @IsOptional()
  @Min(1)
  customInterval?: number;
}
