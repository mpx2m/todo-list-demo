import axios from "axios"

const TODO_API = "http://localhost:3000/todo"

export const todoApi = {
  search: () => axios.get(`${TODO_API}/search`).then(res => res.data),
}
