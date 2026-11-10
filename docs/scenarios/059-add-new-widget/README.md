# 059: Can I add a new widget?

**Listed:** Yes. **Result here:** Yes, confirmed.

| The new widget on the page | In the page builder's list |
| --- | --- |
| ![after](after.png) | ![editor list](editor-list.png) |

Before, the home page ended with the testimonials: [before.png](before.png). Page: the theme's home page on the
Acme store (preview). Editor: the page builder for POCSppDemo, with the theme live there for the shot and switched
back afterwards. Full editor: [editor.png](editor.png).

## The example: an FAQ accordion

Answers to the questions buyers ask before ordering, on home and help pages. **FAQ accordion** (`SppFaq`):

- a heading and a list of questions; each opens its answer in place, "+" turning into "×"
- native `<details>` / `<summary>`: works with the keyboard and screen readers, needs no script, and the answers are in
  the page's HTML (findable by search engines)
- editor fields: Heading (text), Open the first answer (radio), Questions (a list of question / answer)
- new blocks start with three sample questions about minimums, decoration proofs and purchase orders


## How it renders

**In the webstore (base):** `[locale]/page.tsx` → `getPage({ url: "home" })` → agent `getPageByPageCode` → `GET {API_URL}v2/visual-editor/pages/…` → `preparedContentItem` → `<PageRender>` ([§9 A](../../RENDER-FLOW.md#9-home-content-and-package-pages-widgets))

**How this customization joins it:** the page builder loads the edited store's manifest (`/api/extensions?store=`), `RuntimePageEditor` → `addRuntimeWidgets` adds the package's widgets (label, category, fields, defaults; fields merged into an existing type) and `linkRuntimeStyles` links the packages' CSS into the editor ([§9 B.4](../../RENDER-FLOW.md#9-home-content-and-package-pages-widgets)); on the store, the page's widget item of that type is carried as `Text { __runtimeWidget }` → `RuntimeTextCarrier` → `RuntimeWidget` renders the package's component in the browser ([§9 B.2](../../RENDER-FLOW.md#9-home-content-and-package-pages-widgets))

End-to-end flow, with file and line references in the webstore: [docs/RENDER-FLOW.md](../../RENDER-FLOW.md).

## Where

- `src/widgets/Faq.tsx` (new): the component and `FAQ_EDITOR` (label, category "Spp Customization", fields,
  `defaultProps`)
- `src/browser.tsx`: `widgets: { SppFaq: { render: Faq, ...FAQ_EDITOR } }`
- `znode-package.json`: `"widgets"` adds `SppFaq`
- `src/styles/widgets.css`: `.spp-customization-faq*`
- `src/pages/home.json`: the widget at the end of the home page, with hardware-store questions

## How a client does this

Write the component and its editor definition, register it under `widgets` in `browser.tsx` and list its type in
`znode-package.json` `"widgets"`, `npm run deploy`.
