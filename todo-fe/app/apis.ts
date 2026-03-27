import axios from "axios"
import { Dayjs } from "dayjs"

const TODO_API = "http://localhost:3000"

export interface CreateFormValue {
  name: string
  description?: string
  priority: string
  status: string
  dueDate?: Dayjs
  recurrence: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM"
  customInterval?: number
}

export type Create = Omit<CreateFormValue, "dueDate"> & {
  dueDate?: string
}

export interface SearchFormValue {
  name?: string
  status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED"
  priority?: "LOW" | "MEDIUM" | "HIGH"
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

export const todoApi = {
  search: (data: Search) =>
    axios
      .get(`${TODO_API}/todo/search`, { params: data })
      .then(res => res.data),
  createTodo: (data: Create) =>
    axios.post(`${TODO_API}/todo`, data).then(res => res.data),
}
