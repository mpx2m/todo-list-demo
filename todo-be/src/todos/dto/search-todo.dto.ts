import { IsDateString, Min, IsOptional, IsEnum } from 'class-validator';
import { TodoPriority, TodoStatus } from '../entities/todo.entity';

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class SearchTodoDto {
  search?: string;

  @IsOptional()
  @IsDateString()
  dueDateStart?: string;

  @IsOptional()
  @IsDateString()
  dueDateEnd?: string;

  @IsOptional()
  @IsEnum(TodoStatus)
  status?: TodoStatus;

  @IsOptional()
  @IsEnum(TodoPriority)
  priority?: TodoPriority;

  @IsOptional()
  @Min(1)
  page?: number;

  @IsOptional()
  @Min(10)
  limit?: number;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}
