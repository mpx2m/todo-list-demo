import { PartialType, OmitType } from '@nestjs/swagger';
import { Todo } from './todo.dto';

export class UpdateTodoDto extends OmitType(PartialType(Todo), [
  'parentId',
] as const) {}
