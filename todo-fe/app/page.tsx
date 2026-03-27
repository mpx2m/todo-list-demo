"use client"

import { useMemo, useState } from "react"
import { Table, Alert, message } from "antd"
import { useQueryClient } from "@tanstack/react-query"
import { useMutation, useQuery } from "@tanstack/react-query"
import { SearchFormValue, TodoItem } from "./data/types"
import { todoApi } from "./apis"
import { columns } from "./data/columns"
import { TodoModal } from "./components/TodoModal"
import { TodoSearchForm } from "./components/TodoSearchForm"
import { MinusCircleTwoTone } from "@ant-design/icons"

export default function Home() {
  const [messageApi, contextHolder] = message.useMessage()
  const queryClient = useQueryClient()
  const [searchFormValue, setSearchFormValue] = useState<SearchFormValue>({
    sortBy: "dueDate",
    sortOrder: "DESC",
    page: 1,
    limit: 10,
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<TodoItem | undefined>(
    undefined,
  )
  const [parentId, setParentId] = useState<string | undefined>(undefined)

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

  const autoExpandedRowKeys = useMemo(() => {
    const collectKeys = (rows: TodoItem[]): string[] => {
      const keys: string[] = []
      for (const row of rows) {
        keys.push(row._id)
        if (row.children?.length) {
          keys.push(...collectKeys(row.children))
        }
      }
      return keys
    }

    return collectKeys((data?.data?.results || []) as TodoItem[])
  }, [data?.data?.results])

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

  const deleteTodoMutation = useMutation({
    mutationFn: (id: string) => todoApi.deleteTodo(id),
    onSuccess: () => {
      messageApi.success("Todo deleted successfully!")
      if (searchFormValue.page !== 1) {
        setSearchFormValue(prev => ({
          ...prev,
          page: 1,
        }))
      } else {
        queryClient.invalidateQueries({ queryKey: ["todos"] })
      }
    },
    onError: error => {
      messageApi.error(error.message || "Delete failed")
    },
  })

  return (
    <main className="p-6">
      {contextHolder}
      <TodoSearchForm
        onSearch={onFinish}
        onAdd={() => {
          setEditingTodo(undefined)
          setParentId(undefined)
          setIsModalOpen(true)
        }}
      />
      {error && (
        <section className="mt-3">
          <Alert
            type="error"
            title={error.message || "Failed to fetch todos"}
          />
        </section>
      )}
      <Table
        indentSize={40}
        expandable={{
          expandedRowKeys: autoExpandedRowKeys,
          expandIcon: () => {
            return (
              <span className="mr-2">
                <MinusCircleTwoTone />
              </span>
            )
          },
        }}
        size="small"
        bordered
        loading={isLoading}
        dataSource={(data?.data?.results || []) as TodoItem[]}
        rowKey={(record: TodoItem) => record._id}
        columns={columns({
          onAddChild: record => {
            setEditingTodo(undefined)
            setParentId(record._id)
            setIsModalOpen(true)
          },
          onEdit: record => {
            setEditingTodo(record)
            setParentId(undefined)
            setIsModalOpen(true)
          },
          onDelete: record => {
            deleteTodoMutation.mutate(record._id)
          },
          isDeleting: deleteTodoMutation.isPending,
          deletingId: deleteTodoMutation.variables,
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
        parentId={parentId}
        onCancel={() => setIsModalOpen(false)}
        onSuccess={modalSuccess}
      />
    </main>
  )
}
