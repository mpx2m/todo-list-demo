import axios from "axios"

const TODO_API = "http://localhost:3000"

export interface CreateFormValue {
  name: string
  description?: string
  priority: string
  status: string
  dueDate?: Date
  recurrence: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM"
  custom?: number
}

export interface SearchFormValue {
  status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED"
  priority?: "LOW" | "MEDIUM" | "HIGH"
  dueDateRange?: [Date, Date]
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
  createTodo: (data: CreateFormValue) =>
    axios.post(`${TODO_API}/todo`, data).then(res => res.data),
}
