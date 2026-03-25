export enum TodoStatus {
  NOT_STARTED = 'Not Started',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  ARCHIVED = 'Archived',
}

export enum TodoPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
}

export class Todo {
  name: string;
  description: string;
  dueDate: Date;
  status: TodoStatus;
  priority: TodoPriority;
}
