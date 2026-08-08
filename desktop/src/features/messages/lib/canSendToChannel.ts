import { canManageMessageForCurrentUser } from "@/features/messages/lib/canManageMessage";
import type { TimelineMessage } from "@/features/messages/types";
import type { UserProfileLookup } from "@/features/profile/lib/identity";

export function canSendMessageToChannel(
  message: TimelineMessage,
  currentPubkey: string | undefined,
  profiles: UserProfileLookup | undefined,
): boolean {
  return canManageMessageForCurrentUser(message, currentPubkey, profiles);
}

export function assertCanSendMessageToChannel(
  message: TimelineMessage,
  currentPubkey: string | undefined,
  profiles: UserProfileLookup | undefined,
): void {
  if (!canSendMessageToChannel(message, currentPubkey, profiles)) {
    throw new Error("You can only send your own or your agents' messages.");
  }
}
