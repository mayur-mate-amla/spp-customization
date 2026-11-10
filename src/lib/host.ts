import type { IBrowserHost } from "znode-plugin/types/extension-api";

// This package's browser host: its browser-safe settings (settingsSchema keys with "browser": true) and the store's
// state hooks (cart count, user), for its slots and widgets. Set once by setup (browser.tsx); module scope is per store
// on the server and per page in the browser.
export let settings: Record<string, unknown> = {};
export let host: IBrowserHost | null = null;

export function bindHost(value: IBrowserHost) {
  host = value;
  settings = value.settings;
}
