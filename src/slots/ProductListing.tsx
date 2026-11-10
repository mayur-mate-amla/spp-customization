import Link from "next/link";
import { settings } from "../lib/host.js";

// productList.layout: the category / search listing with the theme's own product card. On this store's built-in theme
// the listing card has no product.card slot, so the theme draws the grid itself from the listing's data and keeps the
// store's sort / count bar and filter chips as parts (their logic intact). When a listing has more than one page, the
// store's own listing is kept (it has the paging), so nothing is lost.

type IListProduct = { znodeProductId?: number; publishProductId?: number; name?: string; sku?: string; retailPrice?: number; salesPrice?: number; currencySuffix?: string; quantity?: number; imageSmallPath?: string; seoUrl?: string; outOfStockMessage?: string };
type IListingProps = { children?: unknown; productData?: { productList?: IListProduct[]; totalProducts?: number }; part: (name: string) => (element: Element | null) => void };

const money = (value: number | undefined, suffix = "$") => (typeof value === "number" ? `${suffix}${value.toFixed(2)}` : "");
const initials = (name = "") =>
  name
    .replace(/[^A-Za-z ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

export function ProductCard(props: { product: IListProduct; customizable: boolean }) {
  const { product } = props;
  const id = product.znodeProductId || product.publishProductId;
  const href = product.seoUrl ? `/${product.seoUrl}` : `/product/${id}`;
  const price = product.salesPrice || product.retailPrice;
  const inStock = (product.quantity ?? 0) > 0;
  return (
    <article className="spp-customization-pcard" data-test-selector={`divSppCard${id}`}>
      <Link href={href} className="spp-customization-pcard__media" aria-label={product.name} tabIndex={-1}>
        {product.imageSmallPath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageSmallPath} alt="" loading="lazy" />
        ) : (
          <span className="spp-customization-pcard__placeholder" aria-hidden="true">
            <span className="spp-customization-pcard__initials">{initials(product.name)}</span>
            <span className="spp-customization-pcard__logo">Your logo here</span>
          </span>
        )}
      </Link>
      <div className="spp-customization-pcard__body">
        <h3 className="spp-customization-pcard__name">
          <Link href={href}>{product.name}</Link>
        </h3>
        <p className="spp-customization-pcard__sku">Item # {product.sku}</p>
        <p className="spp-customization-pcard__price">
          <strong>{money(price, product.currencySuffix)}</strong> <span>each</span>
        </p>
        <p className={`spp-customization-pcard__stock${inStock ? "" : " is-out"}`}>{inStock ? `${product.quantity} ready to ship` : product.outOfStockMessage || "Out of stock"}</p>
        <div className="spp-customization-pcard__actions">
          <Link href={href} className="spp-customization-pcard__view" data-test-selector={`linkSppCardView${id}`}>
            View details
          </Link>
          {props.customizable && (
            <Link href={`/customizer?productCode=${encodeURIComponent(String(product.sku))}`} className="spp-customization-pcard__customize" data-test-selector={`linkSppCardCustomize${id}`}>
              Customize
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductListing(props: IListingProps) {
  const products = Array.isArray(props.productData?.productList) ? props.productData.productList : [];
  const total = Number(props.productData?.totalProducts ?? products.length);
  if (settings.themeCards === false || !products.length || total > products.length) return <>{props.children as never}</>;
  const skus = Array.isArray(settings.customizableSkus) ? (settings.customizableSkus as unknown[]).map((sku) => String(sku).toLowerCase()) : [];
  return (
    <div className="spp-customization-listing" data-test-selector="divSppListing">
      <div ref={props.part("productList.filter")} />
      <div ref={props.part("productList.facets")} />
      <div className="spp-customization-listing__grid">
        {products.map((product) => (
          <ProductCard key={String(product.znodeProductId || product.publishProductId)} product={product} customizable={skus.includes(String(product.sku).toLowerCase())} />
        ))}
      </div>
    </div>
  );
}
