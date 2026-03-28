import axios from "axios"
import { Search, Create, Update } from "./data/types"
const TODO_API = "http://localhost:3000"

export const todoApi = {
  search: (data: Search) =>
    axios
      .get(`${TODO_API}/todo/search`, { params: data })
      .then(res => res.data),
  createTodo: (data: Create) =>
    axios.post(`${TODO_API}/todo`, data).then(res => res.data),
  updateTodo: (id: string, data: Update) =>
    axios.patch(`${TODO_API}/todo/${id}`, data).then(res => res.data),
  deleteTodo: (id: string) =>
    axios.delete(`${TODO_API}/todo/${id}`).then(res => res.data),
}
