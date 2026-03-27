import axios from "axios"
import { Search, Create } from "./data/types"
const TODO_API = "http://localhost:3000"

export const todoApi = {
  search: (data: Search) =>
    axios
      .get(`${TODO_API}/todo/search`, { params: data })
      .then(res => res.data),
  createTodo: (data: Create) =>
    axios.post(`${TODO_API}/todo`, data).then(res => res.data),
  updateTodo: (id: string, data: Partial<Create>) =>
    axios.patch(`${TODO_API}/todo/${id}`, data).then(res => res.data),
}
