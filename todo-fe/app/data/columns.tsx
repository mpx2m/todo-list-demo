import { Tag, Button, Divider, Tooltip, Popconfirm } from "antd"
import type { ColumnsType } from "antd/es/table"
import { priorityOptions, recurrenceOptions, statusOptions } from "./options"
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  SaveOutlined,
  SyncOutlined,
} from "@ant-design/icons"
import { TodoItem } from "../data/types"

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

export const columns = ({
  onEdit,
  onAddChild,
  onDelete,
  isDeleting,
  deletingId,
}: {
  onEdit: (record: TodoItem) => void
  onAddChild: (record: TodoItem) => void
  onDelete: (record: TodoItem) => void
  isDeleting: boolean
  deletingId?: string
}): ColumnsType<TodoItem> => [
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
    title: "Custom Interval",
    dataIndex: "customInterval",
    key: "customInterval",
    render: customInterval => {
      if (!customInterval) {
        return null
      }

      if (customInterval === 1) {
        return "1 day"
      } else {
        return `${customInterval} days`
      }
    },
  },
  {
    title: "Action",
    key: "action",
    render: (_, record) => (
      <>
        <Tooltip
          title={
            <>
              Created At:
              <div>{new Date(record.createdAt).toLocaleString()}</div>
            </>
          }
        >
          <a>Details</a>
        </Tooltip>
        <Divider orientation="vertical" />
        <Button
          color="primary"
          variant="text"
          onClick={() => onAddChild(record)}
        >
          Add Todo
        </Button>
        <Divider orientation="vertical" />
        <Button color="primary" variant="text" onClick={() => onEdit(record)}>
          Edit
        </Button>
        <Divider orientation="vertical" />
        <Popconfirm
          title="Delete this todo?"
          description="This will delete the selected todo and all descendants."
          okButtonProps={{
            danger: true,
            loading: isDeleting && deletingId === record._id,
          }}
          onConfirm={() => onDelete(record)}
        >
          <Button color="danger" variant="text">
            Delete
          </Button>
        </Popconfirm>
      </>
    ),
  },
]
