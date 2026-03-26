"use client"
import { useState } from "react"
import { Input, InputNumber, Modal, Radio, Select, Table } from "antd"
import { Button, Form, DatePicker } from "antd"
import { EditOutlined, SearchOutlined } from "@ant-design/icons"

const { RangePicker } = DatePicker

interface SearchFormValue {
  status?: string
  priority?: string
  dueDateRange?: [Date, Date]
  dependencyStatus?: string
  sortBy: "dueDate" | "priority" | "status" | "name"
}

interface CreateFormValue {
  name: string
  description?: string
  priority: string
  status: string
  dueDate?: Date
  recurring: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM"
  custom?: number
}

export default function Home() {
  const [searchForm] = Form.useForm()
  const [searchFormValue, setSearchFormValue] = useState<SearchFormValue>({
    sortBy: "dueDate",
  })

  const dataSource = [
    {
      key: "1",
      name: "胡彦斌",
      age: 32,
      address: "西湖区湖底公园1号",
    },
    {
      key: "2",
      name: "胡彦祖",
      age: 42,
      address: "西湖区湖底公园1号",
    },
  ]

  const columns = [
    {
      title: "姓名",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "年龄",
      dataIndex: "age",
      key: "age",
    },
    {
      title: "住址",
      dataIndex: "address",
      key: "address",
    },
  ]

  const onFinish = (values: SearchFormValue) => {
    setSearchFormValue(values)
  }

  // modal
  const [createForm] = Form.useForm()

  const onFinishCreate = (values: CreateFormValue) => {
    console.log("debug:", values)
    setIsModalOpen(false)
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
      <Form
        layout={"inline"}
        className="gap-3"
        form={searchForm}
        initialValues={{ layout: "horizontal", sortBy: "dueDate" }}
        onFinish={onFinish}
      >
        <Form.Item label="Status" name="status">
          <Select
            allowClear
            style={{ width: 150 }}
            placeholder="Status"
            options={[
              { value: "NOT_STARTED", label: "Not Started" },
              { value: "IN_PROGRESS", label: "In Progress" },
              { value: "COMPLETED", label: "Completed" },
              { value: "ARCHIVED", label: "Archived" },
            ]}
          />
        </Form.Item>
        <Form.Item label="Priority" name="priority">
          <Select
            allowClear
            style={{ width: 150 }}
            placeholder="Priority"
            options={[
              { value: "LOW", label: "Low" },
              { value: "MEDIUM", label: "Medium" },
              { value: "HIGH", label: "High" },
            ]}
          />
        </Form.Item>
        <Form.Item label="due day" name="dueDateRange">
          <RangePicker allowClear />
        </Form.Item>
        <Form.Item label="dependency status" name="dependencyStatus">
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
            allowClear
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

      <Table dataSource={dataSource} columns={columns} className="mt-3" />
      <Modal
        centered
        destroyOnHidden
        title="Add Todo"
        open={isModalOpen}
        onOk={handleOk}
        onCancel={handleCancel}
        afterClose={() => createForm.resetFields()}
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
            recurring: "NONE",
          }}
          onFinish={onFinishCreate}
        >
          <Form.Item
            label="Name"
            name="Name"
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
            <Select
              placeholder="Status"
              options={[
                { value: "NOT_STARTED", label: "Not Started" },
                { value: "IN_PROGRESS", label: "In Progress" },
                { value: "COMPLETED", label: "Completed" },
                { value: "ARCHIVED", label: "Archived" },
              ]}
            />
          </Form.Item>
          <Form.Item label="Priority" name="priority">
            <Select
              placeholder="Priority"
              options={[
                { value: "LOW", label: "Low" },
                { value: "MEDIUM", label: "Medium" },
                { value: "HIGH", label: "High" },
              ]}
            />
          </Form.Item>
          <Form.Item name="DueDate" label="Due date">
            <DatePicker />
          </Form.Item>
          <Form.Item label="Recurring" name="recurring">
            <Radio.Group>
              <Radio value="NONE">None</Radio>
              <Radio value="DAILY">Daily</Radio>
              <Radio value="WEEKLY">Weekly</Radio>
              <Radio value="MONTHLY">Monthly</Radio>
              <Radio value="CUSTOM">Custom</Radio>
            </Radio.Group>
          </Form.Item>

          {/* Custom Interval */}
          <Form.Item
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.recurring !== currentValues.recurring
            }
            noStyle
          >
            {({ getFieldValue }) =>
              getFieldValue("recurring") === "CUSTOM" ? (
                <Form.Item
                  label="Custom"
                  name="custom"
                  rules={[
                    {
                      required: true,
                      message: "Please input custom interval day(s)",
                    },
                  ]}
                >
                  <InputNumber
                    min={1}
                    max={999}
                    suffix="day(s)"
                    style={{ width: "100%" }}
                    placeholder="interval day(s)"
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
