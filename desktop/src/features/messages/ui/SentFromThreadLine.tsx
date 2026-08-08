import * as React from "react";

import { useAppNavigation } from "@/app/navigation/useAppNavigation";
import { getSentFromThreadReference } from "@/features/messages/lib/sentFromThread";
import type { ParsedMessageLink } from "@/features/messages/lib/messageLink";
import { useChannelNavigation } from "@/shared/context/ChannelNavigationContext";
import { MessageLinkPill } from "@/shared/ui/markdown/MessageLinkPill";

export function SentFromThreadLine({
  channelId,
  tags,
}: {
  channelId?: string | null;
  tags?: string[][];
}) {
  const { channels } = useChannelNavigation();
  const { goChannel } = useAppNavigation();
  const reference = getSentFromThreadReference(tags);
  const onOpenMessageLink = React.useCallback(
    (target: ParsedMessageLink) => {
      void goChannel(target.channelId, {
        messageId: target.messageId,
        threadRootId: target.threadRootId,
      });
    },
    [goChannel],
  );

  if (!channelId || !reference) return null;
  const link: ParsedMessageLink = {
    channelId,
    messageId: reference.rootEventId,
    threadRootId: reference.rootEventId,
  };

  return (
    <div
      className="mb-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground"
      data-testid="sent-from-thread"
    >
      <span className="shrink-0">Sent from thread</span>
      <MessageLinkPill
        channels={channels}
        interactive
        link={link}
        onOpenMessageLink={onOpenMessageLink}
        threadExcerpt={reference.rootExcerpt}
      />
    </div>
  );
}
