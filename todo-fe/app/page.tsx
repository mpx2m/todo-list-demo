"use client"

import { useState } from "react"
import { Input, Select, Table, Alert, Button, Form, DatePicker } from "antd"
import { useQueryClient } from "@tanstack/react-query"
import { EditOutlined, SearchOutlined } from "@ant-design/icons"
import { useQuery } from "@tanstack/react-query"
import { SearchFormValue, TodoItem } from "./data/types"
import { todoApi } from "./apis"
import { columns } from "./data/columns"
import { statusOptions, priorityOptions } from "./data/options"
import { TodoModal } from "./components/TodoModal"

const { RangePicker } = DatePicker

export default function Home() {
  const queryClient = useQueryClient()
  const [searchForm] = Form.useForm()
  const [searchFormValue, setSearchFormValue] = useState<SearchFormValue>({
    sortBy: "dueDate",
    sortOrder: "DESC",
    page: 1,
    limit: 10,
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<TodoItem | null>(null)

  const buildSearchParams = (value: SearchFormValue) => ({
    ...value,
    dueDateRange: undefined,
    dueDateStart: value.dueDateRange?.[0]?.startOf("day").toISOString(),
    dueDateEnd: value.dueDateRange?.[1]?.endOf("day").toISOString(),
  })

  const params = buildSearchParams(searchFormValue)

  const { data, isLoading, error } = useQuery({
    queryKey: ["todos", JSON.stringify(params)],
    queryFn: () => todoApi.search(params),
  })

  const onFinish = (values: SearchFormValue) => {
    setSearchFormValue(prev => ({
      ...prev,
      ...values,
      page: 1,
    }))
  }

  const modalSuccess = () => {
    setIsModalOpen(false)
    queryClient.invalidateQueries({ queryKey: ["todos"] })
  }

  return (
    <main className="p-6">
      <Form
        layout={"inline"}
        className="gap-3"
        form={searchForm}
        initialValues={{
          sortBy: "dueDate",
          sortOrder: "DESC",
        }}
        onFinish={onFinish}
      >
        <Form.Item label="Name" name="name">
          <Input allowClear style={{ width: 150 }} placeholder="Name" />
        </Form.Item>
        <Form.Item label="Status" name="status">
          <Select
            allowClear
            style={{ width: 150 }}
            placeholder="Status"
            options={statusOptions}
          />
        </Form.Item>
        <Form.Item label="Priority" name="priority">
          <Select
            allowClear
            style={{ width: 150 }}
            placeholder="Priority"
            options={priorityOptions}
          />
        </Form.Item>
        <Form.Item label="Due day" name="dueDateRange">
          <RangePicker allowClear />
        </Form.Item>
        <Form.Item label="Dependency" name="dependencyStatus">
          <Select
            allowClear
            style={{ width: 150 }}
            placeholder="Status"
            options={[
              { value: "BLOCKED", label: "Blocked" },
              { value: "UNBLOCKED", label: "Unblocked" },
            ]}
          />
        </Form.Item>
        <Form.Item label="Sort by" name="sortBy">
          <Select
            style={{ width: 120 }}
            placeholder="Sort by"
            options={[
              { value: "dueDate", label: "Due date" },
              { value: "priority", label: "Priority" },
              { value: "status", label: "Status" },
              { value: "name", label: "Name" },
            ]}
          />
        </Form.Item>
        <Form.Item label="Sort Order" name="sortOrder">
          <Select
            style={{ width: 120 }}
            placeholder="Sort Order"
            options={[
              { value: "DESC", label: "Desc" },
              { value: "ASC", label: "Asc" },
            ]}
          />
        </Form.Item>
        <Form.Item>
          <Button
            color="primary"
            variant="outlined"
            htmlType="submit"
            icon={<SearchOutlined />}
          >
            Search
          </Button>
        </Form.Item>
        <Form.Item>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              setEditingTodo(null)
              setIsModalOpen(true)
            }}
          >
            Add Todo
          </Button>
        </Form.Item>
      </Form>
      {error && (
        <section className="mt-3">
          <Alert
            type="error"
            title={error.message || "Failed to fetch todos"}
          />
        </section>
      )}
      <Table
        loading={isLoading}
        dataSource={(data?.data?.results || []) as TodoItem[]}
        rowKey={(record: TodoItem) => record._id}
        columns={columns({
          onEdit: record => {
            setEditingTodo(record)
            setIsModalOpen(true)
          },
        })}
        className="mt-3"
        pagination={{
          showTotal: total => `Total ${total} items`,
          current: searchFormValue.page,
          pageSize: searchFormValue.limit,
          total: data?.data?.total || 0,
          onChange: page => {
            setSearchFormValue(prev => ({
              ...prev,
              page,
            }))
          },
        }}
      />
      <TodoModal
        open={isModalOpen}
        editingTodo={editingTodo}
        onCancel={() => setIsModalOpen(false)}
        onSuccess={modalSuccess}
      />
    </main>
  )
}
