import type { IBrowserHost } from "znode-plugin/types/extension-api";

// This package's browser-safe settings (settingsSchema keys with "browser": true), for its slots and widgets. Set once
// by setup (browser.tsx); module scope is per store on the server and per page in the browser.
export let settings: Record<string, unknown> = {};

export function bindHost(host: IBrowserHost) {
  settings = host.settings;
}
