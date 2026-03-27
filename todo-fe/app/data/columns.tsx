import { Tag } from "antd"
import { priorityOptions, recurrenceOptions, statusOptions } from "./options"
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  SaveOutlined,
  SyncOutlined,
} from "@ant-design/icons"

const mapStatus: Record<string, { icon: React.ReactNode; color: string }> = {
  NOT_STARTED: { icon: <ClockCircleOutlined />, color: "default" },
  IN_PROGRESS: { icon: <SyncOutlined spin />, color: "processing" },
  COMPLETED: { icon: <CheckCircleOutlined />, color: "success" },
  ARCHIVED: { icon: <SaveOutlined />, color: "warning" },
}

const mapPriority: Record<string, string> = {
  LOW: "default",
  MEDIUM: "blue",
  HIGH: "red",
}

export const columns = [
  {
    title: "Name",
    dataIndex: "name",
    key: "name",
  },
  {
    title: "Description",
    dataIndex: "description",
    key: "description",
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status: string) => {
      return (
        <Tag
          icon={mapStatus[status].icon}
          color={mapStatus[status].color}
          variant={"filled"}
        >
          {statusOptions.find(option => option.value === status)?.label}
        </Tag>
      )
    },
  },
  {
    title: "Priority",
    dataIndex: "priority",
    key: "priority",
    render: (priority: string) => {
      return (
        <Tag color={mapPriority[priority]}>
          {priorityOptions.find(option => option.value === priority)?.label}
        </Tag>
      )
    },
  },
  {
    title: "Created At",
    dataIndex: "createdAt",
    key: "createdAt",
    render: (createdAt: string) => {
      return new Date(createdAt).toLocaleString()
    },
  },
  {
    title: "Due date",
    dataIndex: "dueDate",
    key: "dueDate",
    render: (dueDate: string) => {
      if (!dueDate) {
        return null
      }
      return new Date(dueDate).toLocaleString()
    },
  },
  {
    title: "Recurrence",
    dataIndex: "recurrence",
    key: "recurrence",
    render: (recurrence: string) => {
      if (recurrence === "NONE") {
        return null
      }

      return recurrenceOptions.find(option => option.value === recurrence)
        ?.label
    },
  },
  {
    title: "Custom Interval day(s)",
    dataIndex: "customInterval",
    key: "customInterval",
  },
]
