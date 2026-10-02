import { useRef, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  BookOpenTextIcon,
  CalendarBlankIcon,
  CheckCircleIcon,
  SparkleIcon,
  UserCircleIcon,
} from "@phosphor-icons/react"
import {
  Message,
  MessageAvatar,
  MessageBubble,
  MessageBubbleContent,
  MessageContent,
  MessageHeader,
  MessageScroller,
} from "@workspace/ui/components/agents/message"
import type { MessageFrom } from "@workspace/ui/components/agents/message"
import { PaperclipIcon, XIcon } from "@phosphor-icons/react"
import { PromptInput } from "@workspace/ui/components/agents/prompt-input"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/motion/button/base"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Reveal } from "@workspace/ui/components/reveal"

import { PageHeader } from "@/components/page-header"
import { askInternCopilot } from "@/lib/data"
import type { CopilotMessage, CopilotResponse } from "@/lib/data"

export const Route = createFileRoute("/_app/copilot")({
  component: CopilotPage,
})

type ChatMessage = CopilotMessage & {
  id: string
  references?: CopilotResponse["references"]
}

const STARTERS = [
  "What should I work on next?",
  "Explain my open assignments simply.",
  "Make a step-by-step plan for this week.",
]

const initialMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I can help you understand your assignments, classes, deadlines, and instructor feedback. Ask me what to work on next or ask for a step-by-step plan.",
}

function CopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage])
  const [pendingImages, setPendingImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const send = async (content: string, attachedImages = pendingImages) => {
    const prompt = content.trim()
    if (!prompt || loading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
      images: attachedImages,
    }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setLoading(true)
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await askInternCopilot(
        nextMessages.map(({ role, content: text, images }, index) => ({
          role,
          content: text,
          ...(index === nextMessages.length - 1 && images?.length
            ? { images }
            : {}),
        })),
        { signal: controller.signal }
      )
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response.answer,
          references: response.references,
        },
      ])
    } catch (error) {
      if (controller.signal.aborted) return
      const message =
        error instanceof Error
          ? error.message
          : "Copilot could not respond. Try again in a moment."
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: message,
        },
      ])
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setLoading(false)
      }
    }
  }

  const chooseImages = async (files: FileList | null) => {
    if (!files) return
    const available = 3 - pendingImages.length
    const selected = Array.from(files).slice(0, available)
    const images = await Promise.all(
      selected.map(
        (file) =>
          new Promise<string | null>((resolve) => {
            if (
              !/^image\/(png|jpeg|webp)$/.test(file.type) ||
              file.size > 1024 * 1024
            ) {
              resolve(null)
              return
            }
            const reader = new FileReader()
            reader.onload = () =>
              resolve(typeof reader.result === "string" ? reader.result : null)
            reader.onerror = () => resolve(null)
            reader.readAsDataURL(file)
          })
      )
    )
    setPendingImages((current) =>
      [
        ...current,
        ...images.filter((image): image is string => Boolean(image)),
      ].slice(0, 3)
    )
  }

  const stop = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
  }

  return (
    <>
      <Reveal index={0}>
        <PageHeader
          title="Intern Copilot"
          description="Get help with your assignments, classes, deadlines, and feedback."
        />
      </Reveal>

      <Reveal index={1}>
        <Card className="overflow-hidden">
          <CardContent className="flex h-[min(68svh,40rem)] min-h-[34rem] flex-col gap-0 p-0">
            <MessageScroller
              busy={loading}
              label="Intern Copilot conversation"
              className="min-h-0 flex-1"
              viewportClassName="px-4 py-5 sm:px-6"
              contentClassName="mx-auto flex w-full max-w-3xl flex-col gap-5"
            >
              {messages.map((message) => (
                <CopilotMessageRow key={message.id} message={message} />
              ))}
              {loading ? <ThinkingRow /> : null}
            </MessageScroller>

            <div className="border-t border-border/70 bg-muted/20 px-4 py-4 sm:px-6">
              <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
                {messages.length === 1 ? (
                  <div className="flex flex-wrap gap-2">
                    {STARTERS.map((starter) => (
                      <Button
                        key={starter}
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-full text-xs"
                        onClick={() => void send(starter)}
                        disabled={loading}
                      >
                        {starter}
                      </Button>
                    ))}
                  </div>
                ) : null}
                <PromptInput
                  aria-label="Ask Intern Copilot"
                  placeholder="Ask about your work…"
                  loading={loading}
                  onSubmit={(value) => {
                    const images = pendingImages
                    setPendingImages([])
                    void send(value, images)
                  }}
                  onStop={stop}
                  leadingAction={
                    <>
                      <input
                        id="copilot-images"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        className="sr-only"
                        onChange={(event) => {
                          void chooseImages(event.target.files)
                          event.currentTarget.value = ""
                        }}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 rounded-full"
                        aria-label="Attach images"
                        disabled={loading || pendingImages.length >= 3}
                        onClick={() =>
                          document.getElementById("copilot-images")?.click()
                        }
                      >
                        <PaperclipIcon weight="duotone" aria-hidden="true" />
                      </Button>
                    </>
                  }
                />
                {pendingImages.length ? (
                  <div className="flex flex-wrap gap-2 px-1">
                    {pendingImages.map((image, index) => (
                      <div
                        key={`${image.slice(0, 24)}-${index}`}
                        className="relative size-12 overflow-hidden rounded-lg border border-border bg-muted"
                      >
                        <img
                          src={image}
                          alt={`Attachment ${index + 1}`}
                          className="size-full object-cover"
                        />
                        <button
                          type="button"
                          aria-label={`Remove attachment ${index + 1}`}
                          className="absolute top-0.5 right-0.5 grid size-4 place-items-center rounded-full bg-background/90 text-foreground"
                          onClick={() =>
                            setPendingImages((current) =>
                              current.filter(
                                (_, itemIndex) => itemIndex !== index
                              )
                            )
                          }
                        >
                          <XIcon weight="bold" className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <p className="px-1 text-[11px] text-muted-foreground">
                  Copilot uses your department’s assignments, classes,
                  submissions, and feedback.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Reveal>
    </>
  )
}

function CopilotMessageRow({ message }: { message: ChatMessage }) {
  const from: MessageFrom = message.role
  const assistant = message.role === "assistant"
  return (
    <Message from={from} animateIn>
      <MessageAvatar>
        {assistant ? (
          <SparkleIcon weight="duotone" aria-hidden="true" />
        ) : (
          <UserCircleIcon weight="duotone" aria-hidden="true" />
        )}
      </MessageAvatar>
      <MessageContent>
        <MessageHeader>{assistant ? "Intern Copilot" : "You"}</MessageHeader>
        <MessageBubble variant={assistant ? "soft" : "solid"} animateIn>
          <MessageBubbleContent className="whitespace-pre-wrap">
            {message.content}
          </MessageBubbleContent>
        </MessageBubble>
        {message.images?.length ? (
          <div className="flex flex-wrap gap-2 px-1">
            {message.images.map((image, index) => (
              <img
                key={`${image.slice(0, 24)}-${index}`}
                src={image}
                alt={`Attached image ${index + 1}`}
                className="max-h-32 max-w-48 rounded-lg border border-border object-cover"
              />
            ))}
          </div>
        ) : null}
        {message.references?.length ? (
          <div className="flex flex-wrap gap-1.5 px-1">
            {message.references.map((reference) => (
              <Badge
                key={`${reference.kind}-${reference.title}`}
                variant="outline"
                className="gap-1 rounded-full text-[11px] font-normal"
              >
                {reference.kind === "assignment" ? (
                  <BookOpenTextIcon weight="duotone" aria-hidden="true" />
                ) : reference.kind === "class" ? (
                  <CalendarBlankIcon weight="duotone" aria-hidden="true" />
                ) : (
                  <CheckCircleIcon weight="duotone" aria-hidden="true" />
                )}
                <span className="max-w-48 truncate">{reference.title}</span>
              </Badge>
            ))}
          </div>
        ) : null}
      </MessageContent>
    </Message>
  )
}

function ThinkingRow() {
  return (
    <Message from="assistant" aria-label="Copilot is thinking">
      <MessageAvatar>
        <SparkleIcon weight="duotone" aria-hidden="true" />
      </MessageAvatar>
      <MessageContent>
        <MessageHeader>Intern Copilot</MessageHeader>
        <MessageBubble variant="soft">
          <MessageBubbleContent>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-current" />
              <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
              <span className="size-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
              <span className="sr-only">Thinking</span>
            </span>
          </MessageBubbleContent>
        </MessageBubble>
      </MessageContent>
    </Message>
  )
}
