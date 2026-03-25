import { PartialType } from '@nestjs/swagger';
import { Todo } from '../entities/todo.entity';

export class UpdateTodoDto extends PartialType(Todo) {}
