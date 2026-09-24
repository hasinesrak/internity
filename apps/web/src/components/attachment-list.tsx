// Read-only materials for interns: thumbnails for images, open/download for all.
import {
  ArrowSquareOutIcon,
  DownloadSimpleIcon,
  FilePdfIcon,
  FileTextIcon,
  FileZipIcon,
  ImageIcon,
} from "@phosphor-icons/react"

import { apiUrl } from "@/lib/api"
import type { PublicAttachment } from "@/lib/types"

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function iconFor(attachment: PublicAttachment) {
  if (attachment.mimeType.startsWith("image/")) {
    return <ImageIcon weight="duotone" className="size-5 shrink-0" />
  }
  if (attachment.mimeType === "application/pdf") {
    return <FilePdfIcon weight="duotone" className="size-5 shrink-0" />
  }
  if (attachment.mimeType === "application/zip") {
    return <FileZipIcon weight="duotone" className="size-5 shrink-0" />
  }
  return <FileTextIcon weight="duotone" className="size-5 shrink-0" />
}

export function AttachmentList({
  attachments,
}: {
  attachments: PublicAttachment[]
}) {
  if (attachments.length === 0) return null
  return (
    <ul className="flex flex-col gap-2">
      {attachments.map((attachment) => {
        const url = apiUrl(attachment.url)
        const isImage = attachment.mimeType.startsWith("image/")
        return (
          <li
            key={attachment.id}
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-3 py-2"
          >
            {isImage ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="size-10 shrink-0 overflow-hidden rounded-lg bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Open ${attachment.originalName}`}
              >
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  crossOrigin="use-credentials"
                  className="size-10 object-cover"
                />
              </a>
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                {iconFor(attachment)}
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium text-foreground">
                {attachment.originalName}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {formatFileSize(attachment.size)}
              </span>
            </span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${attachment.originalName}`}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowSquareOutIcon weight="duotone" className="size-4" />
            </a>
            <a
              href={url}
              download={attachment.originalName}
              aria-label={`Download ${attachment.originalName}`}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <DownloadSimpleIcon weight="duotone" className="size-4" />
            </a>
          </li>
        )
      })}
    </ul>
  )
}
