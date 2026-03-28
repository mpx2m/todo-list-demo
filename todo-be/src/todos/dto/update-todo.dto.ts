import { PartialType } from '@nestjs/swagger';
import { TodoDto } from './todo.dto';

export class UpdateTodoDto extends PartialType(TodoDto) {}
