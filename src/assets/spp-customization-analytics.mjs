// Global analytics bootstrap, loaded on every page from the document <head> (layout.head slot, async): starts a
// Google-Tag-Manager-style data layer and records a page_view with the store and the page, as a tag manager or an
// analytics tool would pick up. No request leaves the page: wire a real tag manager by adding its script the same way.
window.dataLayer = window.dataLayer || [];
const store = (document.currentScript && document.currentScript.getAttribute("data-store")) || "";
window.dataLayer.push({ event: "page_view", store, page_path: location.pathname, page_title: document.title, theme: "spp-customization" });
document.documentElement.setAttribute("data-spp-analytics", "ready");
