import assert from "node:assert/strict";
import test from "node:test";

import {
  registerComposerMessageLinkMarkdownIt,
  resolveComposerMessageLinkAttributes,
} from "./composerMessageLinkNode.ts";

const CHANNEL_ID = "9a1657ac-f7aa-5db0-b632-d8bbeb6dfb50";
const MESSAGE_ID = "root-event";
const HREF = `buzz://message?channel=${CHANNEL_ID}&id=${MESSAGE_ID}`;

test("resolves a composer preview without changing the underlying href", () => {
  assert.deepEqual(
    resolveComposerMessageLinkAttributes(HREF, (channelId) =>
      channelId === CHANNEL_ID ? "general" : undefined,
    ),
    { channelName: "general", href: HREF },
  );
});

test("rejects malformed message links", () => {
  assert.equal(
    resolveComposerMessageLinkAttributes(
      `buzz://message?channel=${CHANNEL_ID}`,
      () => "general",
    ),
    null,
  );
});

function captureMarkdownRule() {
  let capturedRule = null;
  const md = {
    renderer: { rules: {} },
    inline: {
      ruler: {
        before(_anchor, _name, rule) {
          capturedRule = rule;
        },
      },
    },
    utils: {
      escapeHtml: (value) => value.replaceAll("&", "&amp;"),
    },
  };
  registerComposerMessageLinkMarkdownIt(md, {
    resolveChannelName: (channelId) =>
      channelId === CHANNEL_ID ? "general" : undefined,
  });
  return { md, rule: capturedRule };
}

test("markdown parsing materializes a bare message link in composer content", () => {
  const { rule } = captureMarkdownRule();
  let token = null;
  const state = {
    src: `See ${HREF}.`,
    pos: 4,
    push: () => {
      token = { meta: null };
      return token;
    },
  };

  assert.equal(rule(state, false), true);
  assert.equal(state.pos, 4 + HREF.length);
  assert.deepEqual(token.meta, { channelName: "general", href: HREF });
});

test("markdown rendering stores identity in attributes, not visible id text", () => {
  const { md } = captureMarkdownRule();
  const render = md.renderer.rules.buzz_composer_message_link;
  const html = render([{ meta: { channelName: "general", href: HREF } }], 0);

  assert.match(html, /data-composer-message-link=""/);
  assert.match(html, /data-channel-name="general"/);
  assert.match(html, /data-href="buzz:\/\/message\?channel=.*&amp;id=/);
  assert.doesNotMatch(html, />[^<]*root-event/);
});
