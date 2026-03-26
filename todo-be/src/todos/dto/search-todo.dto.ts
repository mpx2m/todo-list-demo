import { IsDateString, Min, IsOptional, IsEnum } from 'class-validator';
import { TodoPriority, TodoStatus } from '../entities/todo.entity';

export enum DependencyStatus {
  BLOCKED = 'BLOCKED',
  UNBLOCKED = 'UNBLOCKED',
}

export enum SortBy {
  DUE_DATE = 'dueDate',
  PRIORITY = 'priority',
  STATUS = 'status',
  NAME = 'name',
}

export enum SortOrder {
  DESC = 'DESC',
  ASC = 'ASC',
}

export class SearchTodoDto {
  @IsOptional()
  @IsEnum(TodoStatus)
  status?: TodoStatus;

  @IsOptional()
  @IsEnum(TodoPriority)
  priority?: TodoPriority;

  @IsOptional()
  @IsDateString()
  dueDateStart?: string;

  @IsOptional()
  @IsDateString()
  dueDateEnd?: string;

  @IsOptional()
  @IsEnum(DependencyStatus)
  dependencyStatus?: DependencyStatus;

  @IsOptional()
  @IsEnum(SortBy)
  sortBy: SortBy = SortBy.DUE_DATE;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;

  @IsOptional()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Min(10)
  limit: number = 10;
}
