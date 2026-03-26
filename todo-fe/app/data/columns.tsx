import { Tag } from "antd"
import { priorityOptions, statusOptions } from "./options"
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons"

const mapStatus: Record<string, { icon: React.ReactNode; color: string }> = {
  NOT_STARTED: { icon: <ClockCircleOutlined />, color: "default" },
  IN_PROGRESS: { icon: <SyncOutlined spin />, color: "processing" },
  COMPLETED: { icon: <CheckCircleOutlined />, color: "success" },
  ARCHIVED: { icon: <ExclamationCircleOutlined />, color: "warning" },
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
          variant={"outlined"}
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
    title: "Due date",
    dataIndex: "dueDate",
    key: "dueDate",
    render: (dueDate: string) => new Date(dueDate).toLocaleString(),
  },
  {
    title: "Recurrence",
    dataIndex: "recurring",
    key: "recurring",
  },
]
