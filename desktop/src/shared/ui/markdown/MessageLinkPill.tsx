import { cn } from "@/shared/lib/cn";
import {
  MENTION_CHIP_BASE_CLASSES,
  MENTION_CHIP_HOVER_CLASSES,
} from "@/shared/ui/mentionChip";

import type { MessageLinkPillProps } from "./types";

export function MessageLinkPill({
  channels,
  interactive,
  link,
  onOpenMessageLink,
  threadExcerpt,
  variant = "default",
}: MessageLinkPillProps) {
  const channel = channels.find((c) => c.id === link.channelId);
  const channelLabel = channel?.name ?? "channel";
  const isSentFromThread = variant === "sent-from-thread";
  const normalizedExcerpt = threadExcerpt?.trim();
  const baseLabel = `Thread in #${channelLabel}`;
  const label = isSentFromThread
    ? (normalizedExcerpt ?? baseLabel)
    : normalizedExcerpt
      ? `${baseLabel} — ${normalizedExcerpt}`
      : baseLabel;

  if (!interactive) {
    return (
      <span className="inline-block max-w-80 truncate" data-message-link="">
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      data-message-link=""
      aria-label={`Open thread in ${channelLabel}`}
      title={label}
      className={cn(
        "max-w-80 cursor-pointer truncate",
        isSentFromThread
          ? "inline-block min-w-0 text-left font-medium text-primary underline underline-offset-4 transition-colors hover:text-primary/80 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
          : [MENTION_CHIP_BASE_CLASSES, MENTION_CHIP_HOVER_CLASSES],
      )}
      onClick={() => {
        onOpenMessageLink(link);
      }}
    >
      {label}
    </button>
  );
}
