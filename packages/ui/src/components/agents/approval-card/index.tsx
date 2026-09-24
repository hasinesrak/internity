"use client";
// beui.dev/components/agents/approval-card

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChatTextIcon,
  CheckIcon,
  CircleNotchIcon,
  QuestionIcon,
  XIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AgentDisclosure } from "@workspace/ui/components/agents/agent-disclosure";
import { ActionSwapRollText } from "@workspace/ui/components/motion/action-swap-roll";
import { Button } from "@workspace/ui/components/motion/button";
import { Checkbox } from "@workspace/ui/components/motion/checkbox";
import { Input } from "@workspace/ui/components/motion/input";
import { RadioGroup, RadioGroupItem } from "@workspace/ui/components/motion/radio";
import { EASE_OUT, SPRING_SWAP } from "@workspace/ui/lib/ease";
import { cn } from "@workspace/ui/lib/utils";
import type {
  ApprovalCardAnswer,
  ApprovalCardAnswers,
  ApprovalCardProps,
  ApprovalCardQuestion,
  ApprovalCardStatus,
} from "./types";

export type {
  ApprovalCardAnswer,
  ApprovalCardAnswers,
  ApprovalCardOption,
  ApprovalCardProps,
  ApprovalCardQuestion,
  ApprovalCardStatus,
} from "./types";

const EMPTY_ANSWER: ApprovalCardAnswer = { selected: [], custom: "" };

function getStatusLabel(status: ApprovalCardStatus) {
  if (status === "submitting") return "Submitting";
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "changes-requested") return "Changes requested";
  if (status === "answered") return "Response submitted";
  return "Input required";
}

function getStatusClass(status: ApprovalCardStatus) {
  if (status === "approved" || status === "answered") {
    return "text-primary";
  }
  if (status === "rejected") return "text-destructive";
  if (status === "changes-requested") {
    return "text-destructive";
  }
  return "text-muted-foreground";
}

function getStatusBadgeClass(status: ApprovalCardStatus) {
  if (status === "pending" || status === "changes-requested") {
    return "border-destructive/30 bg-muted text-destructive";
  }
  if (status === "submitting") {
    return "border-primary/30 bg-muted text-primary";
  }
  if (status === "approved" || status === "answered") {
    return "border-primary/30 bg-primary/10 text-primary";
  }
  return "border-destructive/30 bg-destructive/10 text-destructive";
}

function isAnswered(answer: ApprovalCardAnswer) {
  return answer.selected.length > 0 || Boolean(answer.custom?.trim());
}

function QuestionOptions({
  question,
  answer,
  disabled,
  onChange,
  onSingleSelect,
}: {
  question: ApprovalCardQuestion;
  answer: ApprovalCardAnswer;
  disabled: boolean;
  onChange: (answer: ApprovalCardAnswer) => void;
  onSingleSelect?: () => void;
}) {
  const custom = answer.custom ?? "";

  return (
    <div className="mt-3">
      {question.options?.length ? (
        question.multiple ? (
          <div className="grid gap-0.5">
            {question.options.map((option) => (
              <Checkbox
                key={option.value}
                checked={answer.selected.includes(option.value)}
                disabled={disabled || option.disabled}
                label={option.label}
                onCheckedChange={(checked) =>
                  onChange({
                    ...answer,
                    selected: checked
                      ? [...answer.selected, option.value]
                      : answer.selected.filter((value) => value !== option.value),
                  })
                }
                className="min-h-9 rounded-lg px-1.5 py-1"
              />
            ))}
          </div>
        ) : (
          <RadioGroup
            value={answer.selected[0] ?? ""}
            onValueChange={(value) => {
              onChange({ selected: [value], custom: "" });
              onSingleSelect?.();
            }}
            className="gap-0.5"
          >
            {question.options.map((option) => (
              <RadioGroupItem
                key={option.value}
                value={option.value}
                label={option.label}
                disabled={disabled || option.disabled}
                className="min-h-9 rounded-lg px-1.5 py-1"
              />
            ))}
          </RadioGroup>
        )
      ) : null}

      {question.allowCustom ? (
        <Input
          value={custom}
          disabled={disabled}
          placeholder={question.customPlaceholder ?? "Add another response…"}
          onChange={(value) =>
            onChange({
              selected: question.multiple ? answer.selected : [],
              custom: value,
            })
          }
          className={cn("p-0.5", question.options?.length && "mt-1.5")}
          classNames={{
            field:
              "h-10 rounded-xl border-0 bg-background/70 focus-within:bg-background",
            input: "px-3 text-sm",
          }}
        />
      ) : null}
    </div>
  );
}

function ProgressDots({ current, ids }: { current: number; ids: string[] }) {
  return (
    <span className="flex gap-1.5">
      <span className="sr-only">
        Question {current + 1} of {ids.length}
      </span>
      {ids.map((id, index) => (
        <motion.span
          key={id}
          aria-hidden="true"
          initial={{
            scale: index === current ? 1 : 0.75,
            opacity: index <= current ? 1 : 0.35,
          }}
          animate={{
            scale: index === current ? 1 : 0.75,
            opacity: index <= current ? 1 : 0.35,
          }}
          transition={SPRING_SWAP}
          className="size-1.5 rounded-full bg-foreground"
        />
      ))}
    </span>
  );
}

export function ApprovalCard({
  title = "Approval required",
  description,
  children,
  questions = [],
  status = "pending",
  answers,
  defaultAnswers = {},
  onAnswersChange,
  step,
  defaultStep = 0,
  onStepChange,
  onSubmit,
  onApprove,
  onReject,
  onRequestChanges,
  onDismiss,
  approveLabel = "Approve",
  submitLabel = "Submit response",
  changesLabel = "Request changes",
  rejectLabel = "Reject",
  result,
  className,
}: ApprovalCardProps) {
  const reduce = useReducedMotion() ?? false;
  const [internalAnswers, setInternalAnswers] =
    useState<ApprovalCardAnswers>(defaultAnswers);
  const [internalStep, setInternalStep] = useState(defaultStep);
  const autoAdvanceTimer = useRef<number | undefined>(undefined);
  const currentAnswers = answers ?? internalAnswers;
  const currentStep = Math.min(
    Math.max(0, step ?? internalStep),
    Math.max(0, questions.length - 1),
  );
  const question = questions[currentStep];
  const questionMode = questions.length > 0;
  const multipleQuestions = questions.length > 1;
  const pending = status === "pending";
  const busy = status === "submitting";
  const interactive = pending || busy;
  const currentAnswer = question
    ? (currentAnswers[question.id] ?? EMPTY_ANSWER)
    : EMPTY_ANSWER;
  const displayTitle = question?.title ?? title;
  const titleKey = question?.id ?? String(status);
  const statusLabel = getStatusLabel(status);

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimer.current === undefined) return;
    window.clearTimeout(autoAdvanceTimer.current);
    autoAdvanceTimer.current = undefined;
  }, []);

  useEffect(() => clearAutoAdvance, [clearAutoAdvance]);

  const setAnswers = useCallback(
    (next: ApprovalCardAnswers) => {
      if (answers === undefined) setInternalAnswers(next);
      onAnswersChange?.(next);
    },
    [answers, onAnswersChange],
  );

  const setStep = (next: number) => {
    clearAutoAdvance();
    if (step === undefined) setInternalStep(next);
    onStepChange?.(next);
  };

  const updateCurrentAnswer = (next: ApprovalCardAnswer) => {
    if (!question) return;
    setAnswers({ ...currentAnswers, [question.id]: next });
  };

  const continueQuestion = () => {
    if (currentStep < questions.length - 1) {
      setStep(currentStep + 1);
      return;
    }
    onSubmit?.(currentAnswers);
  };

  const queueAutoAdvance = () => {
    if (
      !question ||
      question.multiple ||
      question.autoAdvance === false ||
      currentStep >= questions.length - 1 ||
      busy
    ) {
      return;
    }

    clearAutoAdvance();
    autoAdvanceTimer.current = window.setTimeout(() => {
      setStep(currentStep + 1);
    }, 240);
  };

  return (
    <div
      data-state={status}
      aria-busy={busy}
      className={cn(
        "w-full overflow-hidden rounded-2xl bg-muted p-4 text-sm",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "grid size-5 shrink-0 place-items-center text-muted-foreground",
            getStatusClass(status),
          )}
        >
          {busy ? (
            <CircleNotchIcon
              weight="duotone"
              className={cn("size-4", !reduce && "animate-spin")}
            />
          ) : interactive ? (
            questionMode ? (
              <QuestionIcon weight="duotone" className="size-4" />
            ) : (
              <ChatTextIcon weight="duotone" className="size-4" />
            )
          ) : status === "rejected" ? (
            <XIcon weight="duotone" className="size-4" />
          ) : (
            <CheckIcon weight="duotone" className="size-4" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-3">
            <h3 className="min-w-0 flex-1 text-base font-medium leading-5 text-foreground">
              <ActionSwapRollText value={titleKey}>
                {displayTitle}
              </ActionSwapRollText>
            </h3>
            {questionMode && interactive ? (
              multipleQuestions ? (
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground/65">
                  {currentStep + 1}/{questions.length}
                </span>
              ) : null
            ) : (
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                  getStatusBadgeClass(status),
                )}
              >
                {statusLabel}
              </span>
            )}
            {onDismiss ? (
              <button
                type="button"
                aria-label="Dismiss"
                onClick={onDismiss}
                className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <XIcon weight="duotone" className="size-4" />
              </button>
            ) : null}
          </div>

          <AgentDisclosure open={interactive}>
            {questionMode && question ? (
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={question.id}
                  initial={reduce ? { opacity: 1 } : { opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, x: -6 }}
                  transition={{ duration: reduce ? 0 : 0.2, ease: EASE_OUT }}
                >
                  {question.description ? (
                    <p className="mt-1 leading-5 text-muted-foreground">
                      {question.description}
                    </p>
                  ) : null}
                  <QuestionOptions
                    question={question}
                    answer={currentAnswer}
                    disabled={busy}
                    onChange={updateCurrentAnswer}
                    onSingleSelect={queueAutoAdvance}
                  />
                </motion.div>
              </AnimatePresence>
            ) : (
              <div>
                {description ? (
                  <p className="mt-1 leading-5 text-muted-foreground">
                    {description}
                  </p>
                ) : null}
                {children ? <div className="mt-3">{children}</div> : null}
              </div>
            )}

            {questionMode ? (
              <div className="mt-4 flex items-center gap-3">
                {multipleQuestions ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Previous question"
                      disabled={busy || currentStep === 0}
                      onClick={() => setStep(currentStep - 1)}
                      className="rounded-full"
                    >
                      <ArrowLeftIcon weight="duotone" className="size-4" />
                    </Button>
                    <ProgressDots
                      current={currentStep}
                      ids={questions.map((item) => item.id)}
                    />
                  </>
                ) : null}
                <Button
                  size={currentStep === questions.length - 1 ? "sm" : "icon"}
                  aria-label={
                    currentStep === questions.length - 1
                      ? "Submit response"
                      : "Next question"
                  }
                  disabled={busy || !isAnswered(currentAnswer)}
                  onClick={continueQuestion}
                  className="ml-auto rounded-full"
                >
                  {busy ? (
                    <CircleNotchIcon
                      weight="duotone"
                      className={cn("size-4", !reduce && "animate-spin")}
                    />
                  ) : currentStep === questions.length - 1 ? (
                    <>
                      {submitLabel}
                      <ArrowRightIcon weight="duotone" className="size-3.5" />
                    </>
                  ) : (
                    <ArrowRightIcon weight="duotone" className="size-4" />
                  )}
                </Button>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={onApprove}
                  className="rounded-full"
                >
                  {approveLabel}
                </Button>
                {onRequestChanges ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={onRequestChanges}
                    className="rounded-full"
                  >
                    {changesLabel}
                  </Button>
                ) : null}
                {onReject ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={onReject}
                    className="rounded-full text-muted-foreground hover:text-destructive"
                  >
                    {rejectLabel}
                  </Button>
                ) : null}
              </div>
            )}
          </AgentDisclosure>

          {!interactive ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {result ?? statusLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
