import assert from "node:assert/strict";
import test from "node:test";

import { getMessageLinkLabel } from "./messageLinkLabel.ts";

test("ordinary message links name their target thread", () => {
  assert.equal(
    getMessageLinkLabel({ channelName: "general" }),
    "Thread in #general",
  );
});

test("ordinary message links include a provided root excerpt", () => {
  assert.equal(
    getMessageLinkLabel({
      channelName: "general",
      threadExcerpt: "Release notes",
    }),
    "Thread in #general — Release notes",
  );
});

test("sent-from-thread links use the excerpt as their visible link", () => {
  assert.equal(
    getMessageLinkLabel({
      channelName: "general",
      threadExcerpt: "Release notes",
      variant: "sent-from-thread",
    }),
    "Release notes",
  );
});
