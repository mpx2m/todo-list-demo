import { PartialType } from '@nestjs/swagger';
import { Todo } from '../entities/todo.entity';

export class CreateTodoDto extends PartialType(Todo) {
  name: string;
}
