import { settings } from "../host.js";

// Per-store structured data on product pages (row 134), rendered with the product.addToCart slot (on the server too:
// the JSON-LD is in the HTML crawlers read). The store prints Organization, WebSite, LocalBusiness and Product; it
// prints no BreadcrumbList, which search results show as "Store › Best Sellers › Graphite Backpack". This adds it for
// the stores spp-commerce runs on, with the store's own address (setting siteUrl, per store: absolute URLs) and the
// product's category. Nothing is printed without a siteUrl or a category.

type IProduct = { publishProductId?: number; productId?: number; name?: string; productName?: string; categoryId?: number; categoryName?: string };

// "</script>" inside a value must not end the tag
const json = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");

export function breadcrumbJsonLd(product: IProduct, siteUrl: string, storeName: string) {
  const base = siteUrl.replace(/\/+$/, "");
  const id = Number(product.publishProductId || product.productId);
  const name = String(product.name || product.productName || "");
  if (!/^https?:\/\//.test(base) || !id || !name || !product.categoryId || !product.categoryName) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: storeName || "Home", item: `${base}/` },
      { "@type": "ListItem", position: 2, name: product.categoryName, item: `${base}/category/${product.categoryId}` },
      { "@type": "ListItem", position: 3, name, item: `${base}/product/${id}` },
    ],
  };
}

export function ProductJsonLd(props: { product?: IProduct; isQuickView?: boolean }) {
  if (props.isQuickView || !props.product) return null;
  const data = breadcrumbJsonLd(props.product, String(settings.siteUrl || ""), String(settings.storeName || ""));
  if (!data) return null;
  return <script type="application/ld+json" data-test-selector="scriptBreadcrumbJsonLd" dangerouslySetInnerHTML={{ __html: json(data) }} />;
}
