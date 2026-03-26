import axios from "axios"

const TODO_API = "http://localhost:3000"

export interface CreateFormValue {
  name: string
  description?: string
  priority: string
  status: string
  dueDate?: Date
  recurring: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM"
  custom?: number
}

export const todoApi = {
  search: () => axios.get(`${TODO_API}/todo/search`).then(res => res.data),
  createTodo: (data: CreateFormValue) =>
    axios.post(`${TODO_API}/todo`, data).then(res => res.data),
}
