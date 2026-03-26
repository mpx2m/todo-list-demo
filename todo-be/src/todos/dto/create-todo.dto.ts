import { PartialType } from '@nestjs/swagger';
import { Todo } from '../entities/todo.entity';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTodoDto extends PartialType(Todo) {
  @IsString()
  @IsNotEmpty()
  name: string;
}
