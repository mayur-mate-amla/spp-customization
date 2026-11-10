import type { IBrowserHost } from "znode-plugin/types/extension-api";

// spp-commerce's browser host (its settings and the store's state hooks), set once by setup (commerce/browser.tsx).
export let host: IBrowserHost | null = null;
export let settings: Record<string, unknown> = {};

export function bindHost(value: IBrowserHost) {
  host = value;
  settings = value.settings;
}
