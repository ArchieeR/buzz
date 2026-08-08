import assert from "node:assert/strict";
import test from "node:test";

import { getSendToChannelSemantics } from "./sendToChannelSemantics.ts";

const SOURCE = "a".repeat(64);
const SIGNER = "b".repeat(64);
const MENTION = "c".repeat(64);

test("send-to-channel preserves supported message semantics", () => {
  const imeta = ["imeta", "url https://relay.example/media/file.png"];
  const emoji = ["emoji", "party", "https://relay.example/party.png"];
  const mention = ["mention", MENTION];
  const preview = ["link-preview", "none"];

  assert.deepEqual(
    getSendToChannelSemantics({
      pubkey: SOURCE,
      signerPubkey: SIGNER,
      tags: [
        ["h", "channel-id"],
        ["e", "thread-root", "", "reply"],
        ["p", SOURCE],
        ["p", SIGNER.toUpperCase()],
        ["p", MENTION.toUpperCase()],
        ["p", MENTION],
        ["p", "not-a-pubkey"],
        imeta,
        emoji,
        mention,
        preview,
        ["client", "source-only-marker"],
      ],
    }),
    {
      mentionPubkeys: [MENTION],
      semanticTags: [imeta, emoji, mention, preview],
    },
  );
});

test("send-to-channel handles messages without semantic tags", () => {
  assert.deepEqual(
    getSendToChannelSemantics({ pubkey: SOURCE, tags: undefined }),
    { mentionPubkeys: [], semanticTags: [] },
  );
});
