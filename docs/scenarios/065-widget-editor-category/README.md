# 065: Can a widget appear in its own editor category?

**Listed:** Yes. **Result here:** Yes, confirmed.

| Before: one catch-all "Spp Customization" (+ the hero under "Content") | After: "SPP · Content" and "SPP · Promotions" |
| --- | --- |
| ![before](before.png) | ![after](after.png) |

Page builder for POCSppDemo, the component list.

## The example: categories the way merchandisers think

Each widget's editor definition names its category; the page builder groups the list by it. The theme's widgets are
regrouped by what a merchandiser is doing:

| Category | Widgets |
| --- | --- |
| **SPP · Content** | Spp Customization Hero, Customer testimonials, FAQ accordion |
| **SPP · Promotions** | Promotion banner |

The other packages keep theirs: "SPP commerce" (the plugin's account manager), "SPP shared" (the shared showroom
widget), "Artifi", "Promotions" (countdown banner).

## Where

- `src/widgets/Hero.tsx`, `Testimonials.tsx`, `Faq.tsx`: `category: "SPP · Content"`
- `src/widgets/PromoBanner.tsx`: `category: "SPP · Promotions"`

## How a client does this

Set `category` in the widget's editor definition (default "Store widgets"). The order of the categories themselves
is the editor's (row 72).
