import assert from "node:assert/strict";
import test from "node:test";

import { submitMessageEdit } from "./submitMessageEdit.ts";

const UNRESOLVED_USER = "b".repeat(64);

function baseOptions(save) {
  return {
    clearComposer: () => {},
    content: "hello @Missing User",
    customEmoji: [],
    editTargetId: "event-id",
    extractMentionPubkeys: () => [],
    getMentionRefs: () => [],
    originalContent: "hello @Missing User",
    ownerPubkey: "a".repeat(64),
    pendingImeta: [],
    queuedAttachments: [],
    restoreComposer: () => {},
    restoreMentionRefs: () => {},
    setDeferredUploadPending: () => {},
    setUploadError: () => {},
    shouldRestoreComposer: () => true,
    spoileredAttachmentUrls: new Set(),
    unresolvedMentions: [UNRESOLVED_USER],
    save,
  };
}

test("edit save emits unresolved identities as non-notifying mention references", async () => {
  let saved;
  await submitMessageEdit(
    baseOptions(async (content, tags, mentionPubkeys, eventId) => {
      saved = { content, tags, mentionPubkeys, eventId };
    }),
  );

  assert.deepEqual(saved, {
    content: "hello @Missing User",
    tags: [["mention", UNRESOLVED_USER]],
    mentionPubkeys: [],
    eventId: "event-id",
  });
});
