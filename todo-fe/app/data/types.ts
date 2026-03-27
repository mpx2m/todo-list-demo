import { Dayjs } from "dayjs"

export enum Status {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  ARCHIVED = "ARCHIVED",
}

export enum Priority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export enum Recurrence {
  NONE = "NONE",
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  CUSTOM = "CUSTOM",
}

export interface CreateFormValue {
  name: string
  description?: string
  priority: string
  status: string
  dueDate?: Dayjs
  recurrence: Recurrence
  customInterval?: number
}

export type Create = Omit<CreateFormValue, "dueDate"> & {
  dueDate?: string
  parentId?: string
}

export interface SearchFormValue {
  name?: string
  status?: Status
  priority?: Priority
  dueDateRange?: [Dayjs, Dayjs]
  dependencyStatus?: "BLOCKED" | "UNBLOCKED"
  sortBy: "dueDate" | "priority" | "status" | "name"
  sortOrder: "ASC" | "DESC"
  page: number
  limit: number
}

export type Search = Omit<SearchFormValue, "dueDateRange"> & {
  dueDateStart?: string
  dueDateEnd?: string
}

export interface TodoItem {
  _id: string
  path?: string
  depth: number
  name: string
  description?: string
  priority: Priority
  status: Status
  dueDate?: string
  recurrence: Recurrence
  customInterval?: number
  children: TodoItem[]
  createdAt: string
}
