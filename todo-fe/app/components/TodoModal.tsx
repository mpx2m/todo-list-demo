"use client"

import { useEffect } from "react"
import dayjs from "dayjs"
import {
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Radio,
  Select,
} from "antd"
import { useMutation } from "@tanstack/react-query"
import { Create, CreateFormValue, TodoItem } from "../data/types"
import {
  recurrenceOptions,
  priorityOptions,
  statusOptions,
} from "../data/options"
import { todoApi } from "../apis"

interface TodoModalProps {
  open: boolean
  editingTodo?: TodoItem
  parentId?: string
  onCancel: () => void
  onSuccess: () => void
}

export function TodoModal({
  open,
  editingTodo,
  parentId,
  onCancel,
  onSuccess,
}: TodoModalProps) {
  const [messageApi, contextHolder] = message.useMessage()
  const [todoForm] = Form.useForm<CreateFormValue>()

  useEffect(() => {
    if (!open) {
      return
    }

    if (editingTodo) {
      todoForm.setFieldsValue({
        ...editingTodo,
        dueDate: editingTodo.dueDate ? dayjs(editingTodo.dueDate) : undefined,
      })
    } else {
      todoForm.resetFields()
    }
  }, [open, editingTodo, todoForm])

  const createTodoMutation = useMutation({
    mutationFn: todoApi.createTodo,
    onSuccess: res => {
      if (res.success) {
        messageApi.success("Todo created successfully!")
        onSuccess()
      }
    },
    onError: error => {
      messageApi.error(error.message || "Request failed")
    },
  })

  const updateTodoMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Create> }) =>
      todoApi.updateTodo(id, data),
    onSuccess: res => {
      if (res.success) {
        messageApi.success("Todo updated successfully!")
        onSuccess()
      }
    },
    onError: error => {
      messageApi.error(error.message || "Request failed")
    },
  })

  const onFinish = (values: CreateFormValue) => {
    const payload: Create = {
      ...values,
      dueDate: values.dueDate?.toISOString(),
      parentId: !editingTodo ? parentId || undefined : undefined,
      customInterval:
        values.recurrence === "CUSTOM" ? values.customInterval : undefined,
    }

    if (editingTodo) {
      updateTodoMutation.mutate({
        id: editingTodo._id,
        data: payload,
      })
      return
    }

    createTodoMutation.mutate(payload)
  }

  return (
    <>
      {contextHolder}
      <Modal
        confirmLoading={
          createTodoMutation.isPending || updateTodoMutation.isPending
        }
        centered
        destroyOnHidden
        title={editingTodo ? "Edit Todo" : "Add Todo"}
        open={open}
        onOk={() => todoForm.submit()}
        onCancel={onCancel}
      >
        <Form
          layout={"horizontal"}
          labelCol={{ span: 5 }}
          wrapperCol={{ span: 17 }}
          form={todoForm}
          initialValues={{
            layout: "horizontal",
            status: "NOT_STARTED",
            priority: "LOW",
            recurrence: "NONE",
          }}
          onFinish={onFinish}
        >
          <Form.Item
            label="Name"
            name="name"
            rules={[{ required: true, message: "Please input your name" }]}
          >
            <Input allowClear placeholder="name" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea
              allowClear
              placeholder="Description"
              rows={2}
              style={{ resize: "none" }}
            />
          </Form.Item>
          <Form.Item label="Status" name="status">
            <Select placeholder="Status" options={statusOptions} />
          </Form.Item>
          <Form.Item label="Priority" name="priority">
            <Select placeholder="Priority" options={priorityOptions} />
          </Form.Item>
          <Form.Item name="dueDate" label="Due date">
            <DatePicker />
          </Form.Item>
          <Form.Item label="Recurrence" name="recurrence">
            <Radio.Group>
              {recurrenceOptions.map(option => (
                <Radio key={option.value} value={option.value}>
                  {option.label}
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>
          <Form.Item
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.recurrence !== currentValues.recurrence
            }
            noStyle
          >
            {({ getFieldValue }) =>
              getFieldValue("recurrence") === "CUSTOM" ? (
                <Form.Item
                  label="Custom"
                  name="customInterval"
                  rules={[
                    {
                      required: true,
                      message: "Please input custom interval",
                    },
                  ]}
                >
                  <InputNumber
                    min={1}
                    max={999}
                    suffix="day(s)"
                    style={{ width: "100%" }}
                    placeholder="Custom interval"
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
