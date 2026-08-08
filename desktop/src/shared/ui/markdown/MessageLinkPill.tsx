import { cn } from "@/shared/lib/cn";
import {
  MENTION_CHIP_BASE_CLASSES,
  MENTION_CHIP_HOVER_CLASSES,
} from "@/shared/ui/mentionChip";

import type { MessageLinkPillProps } from "./types";
import {
  getMessageLinkChannelLabel,
  getMessageLinkLabel,
  MESSAGE_LINK_PREFIX,
} from "@/features/messages/lib/messageLinkLabel";

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
  const label = getMessageLinkLabel({
    channelName: channelLabel,
    threadExcerpt,
    variant,
  });
  const channelLinkLabel = getMessageLinkChannelLabel(channelLabel);

  if (!interactive) {
    if (!isSentFromThread) {
      return (
        <span
          className="inline-flex min-w-0 max-w-80 items-center gap-1.5 align-baseline"
          data-message-link=""
        >
          <span className="shrink-0">{MESSAGE_LINK_PREFIX}</span>
          <span
            className={cn(
              MENTION_CHIP_BASE_CLASSES,
              "min-w-0 max-w-full truncate",
            )}
            data-channel-link=""
          >
            {channelLinkLabel}
          </span>
        </span>
      );
    }
    return (
      <span className="inline-block max-w-80 truncate" data-message-link="">
        {label}
      </span>
    );
  }

  if (!isSentFromThread) {
    return (
      <span
        className="inline-flex min-w-0 max-w-80 items-center gap-1.5 align-baseline"
        data-message-link=""
      >
        <span className="shrink-0">{MESSAGE_LINK_PREFIX}</span>
        <button
          type="button"
          aria-label={`Open thread in ${channelLabel}`}
          title={label}
          className={cn(
            MENTION_CHIP_BASE_CLASSES,
            MENTION_CHIP_HOVER_CLASSES,
            "min-w-0 max-w-full cursor-pointer truncate",
          )}
          data-channel-link=""
          onClick={() => {
            onOpenMessageLink(link);
          }}
        >
          {channelLinkLabel}
        </button>
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
        "inline-block min-w-0 border-b border-transparent text-left font-medium text-foreground transition-colors hover:border-current focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring",
      )}
      onClick={() => {
        onOpenMessageLink(link);
      }}
    >
      {label}
    </button>
  );
}
