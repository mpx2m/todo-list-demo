import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  NotFoundException,
} from '@nestjs/common';
import { TodosService } from './todos.service';
import { CreateTodoDto } from './dto/create-todo.dto';
import { UpdateTodoDto } from './dto/update-todo.dto';
import { MongoIdPipe } from './mongo-id.pipe';
import { SearchTodoDto } from './dto/search-todo.dto';

@Controller('todo')
export class TodosController {
  constructor(private readonly todoService: TodosService) {}

  @Post()
  create(@Body() createTodoDto: CreateTodoDto) {
    return this.todoService.create(createTodoDto);
  }

  @Get('all')
  findAll() {
    return this.todoService.findAll();
  }

  @Get('search')
  search(@Query() query: SearchTodoDto) {
    return this.todoService.search(query);
  }

  @Patch(':id')
  async update(
    @Param('id', MongoIdPipe) id: string,
    @Body() updateTodoDto: UpdateTodoDto,
  ) {
    const todo = await this.todoService.update(id, updateTodoDto);
    if (!todo) {
      throw new NotFoundException(`Todo with id ${id} not found`);
    }
    return todo;
  }

  @Delete(':id')
  async remove(@Param('id', MongoIdPipe) id: string) {
    const todo = await this.todoService.remove(id);
    if (!todo) {
      throw new NotFoundException(`Todo with id ${id} not found`);
    }
    return todo;
  }
}
