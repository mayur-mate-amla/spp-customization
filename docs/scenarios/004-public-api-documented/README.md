# 004: Is the public API documented for partners (extension-api.d.ts)?

**Listed:** Yes. **Result here:** Yes, confirmed.

## What

The SDK ships `znode-plugin/types/extension-api.d.ts` (228 lines): every type a package builds against, with the
slot names, their props, hooks, routes, server slots, server pages, widgets and limits documented as comments in the
same file. This theme's code imports its types from it, so the editor and the build both use it.

## Where

- `node_modules/znode-plugin/types/extension-api.d.ts` (SDK)
- `src/browser.tsx`, `src/server.tsx`, `src/lib/host.ts`: `import type { ... } from "znode-plugin/types/extension-api"`

## How to check

`output.txt` / `evidence.png`: the imports in `src/`, the exported interfaces (`IRuntimePlugin`, `IBrowserHost`,
`IBrowserPlugin`, `IEditorWidget`, `IPluginRouteContext`, ...) and the documented list of browser slots.
