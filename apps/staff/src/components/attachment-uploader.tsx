// Instructor materials picker built on beUI's `FileUpload`: the dropzone and
// progress queue come from `@workspace/ui`, while each finished upload is
// saved to /data/uploads/YYYY/MM/DD and attached to the form by id.
import { useEffect, useRef, useState } from "react"
import { WarningCircleIcon } from "@phosphor-icons/react"
import {
  FileUpload,
  type FileUploadItem,
} from "@workspace/ui/components/motion/file-upload"

import { AttachmentList } from "@/components/attachment-list"
import { deleteUpload, uploadAttachment } from "@/lib/data"
import type { PublicAttachment } from "@/lib/types"

const ACCEPT =
  "image/png,image/jpeg,image/gif,image/webp,image/svg+xml,application/pdf,text/plain,text/markdown,text/csv,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,.png,.jpg,.jpeg,.gif,.webp,.svg,.pdf,.txt,.md,.csv,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx"

export function AttachmentUploader({
  attachments,
  onChange,
  disabled,
  maxFiles = 10,
}: {
  attachments: PublicAttachment[]
  onChange: (next: PublicAttachment[]) => void
  disabled?: boolean
  maxFiles?: number
}) {
  const [queue, setQueue] = useState<FileUploadItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const latest = useRef(attachments)
  latest.current = attachments
  const queueRef = useRef(queue)
  queueRef.current = queue
  /** Queue rows that already produced a saved attachment. */
  const savedByQueueId = useRef(new Map<string, string>())
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const patchQueue = (id: string, patch: Partial<FileUploadItem>) =>
    setQueue((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )

  const dropQueueRow = (id: string) => {
    savedByQueueId.current.delete(id)
    setQueue((current) => current.filter((item) => item.id !== id))
  }

  const runUpload = async (item: FileUploadItem, file: File) => {
    patchQueue(item.id, { status: "uploading", progress: 30, error: undefined })
    try {
      const saved = await uploadAttachment(file)
      const next = [...latest.current, saved]
      latest.current = next
      onChange(next)
      savedByQueueId.current.set(item.id, saved.id)
      patchQueue(item.id, { status: "success", progress: 100 })
      const timer = setTimeout(() => dropQueueRow(item.id), 900)
      timers.current.push(timer)
    } catch (err) {
      patchQueue(item.id, {
        status: "error",
        error: err instanceof Error ? err.message : "That file could not be uploaded.",
      })
    }
  }

  const removeSaved = async (attachment: PublicAttachment) => {
    const next = latest.current.filter((item) => item.id !== attachment.id)
    latest.current = next
    onChange(next)
    try {
      await deleteUpload(attachment.id)
    } catch {
      // The form already detached it; the file row is gone either way.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="px-1 text-sm font-medium">
          Materials
          <span className="ml-2 text-xs font-normal tabular-nums text-muted-foreground">
            {attachments.length}/{maxFiles}
          </span>
        </span>
      </div>

      <FileUpload
        value={queue}
        onValueChange={setQueue}
        onFilesAdded={(added, files) => {
          setError(null)
          added.forEach((item, index) => {
            const file = files[index]
            if (file) void runUpload(item, file)
          })
        }}
        onRemove={(item) => {
          const savedId = savedByQueueId.current.get(item.id)
          dropQueueRow(item.id)
          if (savedId) {
            const saved = latest.current.find((entry) => entry.id === savedId)
            if (saved) void removeSaved(saved)
          }
        }}
        onRetry={(item) => {
          const current = queueRef.current.find((entry) => entry.id === item.id)
          const file = current?.file ?? item.file
          if (!file) {
            patchQueue(item.id, {
              status: "error",
              error: "Choose the file again.",
            })
            return
          }
          void runUpload({ ...item, file }, file)
        }}
        accept={ACCEPT}
        maxFiles={Math.max(0, maxFiles - attachments.length)}
        disabled={disabled}
        title="Drop files here"
        description="Images, PDFs, and office documents up to 10 MB each."
        browseLabel="Browse"
      />

      <p className="px-1 text-xs text-muted-foreground">
        Files are stored under{" "}
        <span className="font-mono">/data/uploads/YYYY/MM/DD</span>.
      </p>

      {attachments.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="px-1 text-xs text-muted-foreground">
            Attached · {attachments.length}
          </span>
          <AttachmentList
            attachments={attachments}
            onRemove={disabled ? undefined : (item) => void removeSaved(item)}
          />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="flex items-center gap-1.5 px-1 text-xs text-destructive">
          <WarningCircleIcon weight="duotone" className="size-3.5" />
          {error}
        </p>
      ) : null}
    </div>
  )
}
