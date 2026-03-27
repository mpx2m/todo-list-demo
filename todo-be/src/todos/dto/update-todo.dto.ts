import { PartialType, OmitType } from '@nestjs/swagger';
import { Todo } from '../entities/todo.entity';

export class UpdateTodoDto extends OmitType(PartialType(Todo), [
  'parentId',
] as const) {}
