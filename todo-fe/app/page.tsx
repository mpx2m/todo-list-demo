"use client"

import { useState } from "react"
import {
  Input,
  InputNumber,
  message,
  Modal,
  Radio,
  Select,
  Table,
  Alert,
  Button,
  Form,
  DatePicker,
} from "antd"
import { useQueryClient } from "@tanstack/react-query"
import { EditOutlined, SearchOutlined } from "@ant-design/icons"
import { useQuery, useMutation } from "@tanstack/react-query"
import { todoApi, CreateFormValue, SearchFormValue } from "./apis"
import { columns } from "./data/columns"
import {
  statusOptions,
  priorityOptions,
  recurrenceOptions,
} from "./data/options"

const { RangePicker } = DatePicker

export default function Home() {
  const queryClient = useQueryClient()
  const [messageApi, contextHolder] = message.useMessage()
  const [searchForm] = Form.useForm()
  const [searchFormValue, setSearchFormValue] = useState<SearchFormValue>({
    sortBy: "dueDate",
    sortOrder: "DESC",
    page: 1,
    limit: 10,
  })

  const buildSearchParams = (value: SearchFormValue) => ({
    ...value,
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

  // modal
  const [createForm] = Form.useForm()
  const createTodoMutation = useMutation({
    mutationFn: todoApi.createTodo,
    onSuccess: res => {
      if (res.success) {
        messageApi.success("Todo created successfully!")

        setIsModalOpen(false)
        createForm.resetFields()

        if (searchFormValue.page === 1) {
          queryClient.invalidateQueries({ queryKey: ["todos"] })
        } else {
          setSearchFormValue(prev => ({ ...prev, page: 1 }))
        }
      }
    },
    onError: error => {
      messageApi.error(error.message || "Request failed")
    },
  })

  const onFinishCreate = (values: CreateFormValue) => {
    createTodoMutation.mutate({
      ...values,
      dueDate: values.dueDate?.toISOString(),
    })
  }

  const [isModalOpen, setIsModalOpen] = useState(false)

  const showModal = () => {
    setIsModalOpen(true)
  }

  const handleCancel = () => {
    setIsModalOpen(false)
  }

  const handleOk = () => {
    createForm.submit()
  }

  return (
    <main className="p-6">
      {contextHolder}
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
          <Button type="primary" icon={<EditOutlined />} onClick={showModal}>
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
        dataSource={data?.data?.results || []}
        rowKey={(record: { _id: string }) => record._id}
        columns={columns}
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
      <Modal
        confirmLoading={createTodoMutation.isPending}
        centered
        destroyOnHidden
        title="Add Todo"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
      >
        <Form
          layout={"horizontal"}
          labelCol={{ span: 5 }}
          wrapperCol={{ span: 17 }}
          form={createForm}
          initialValues={{
            layout: "horizontal",
            status: "NOT_STARTED",
            priority: "LOW",
            recurrence: "NONE",
          }}
          onFinish={onFinishCreate}
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

          {/* Custom Interval */}
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
    </main>
  )
}
