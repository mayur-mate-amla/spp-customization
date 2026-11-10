import { useEffect } from "react";

// Marks the page as scrolled (html[data-spp-scrolled]) once the shopper is past the top 200 px, so header.css can swap
// the tall two-row desktop header for the parent theme's compact row. Renders nothing; listens passively and only
// writes the attribute when it changes.

const THRESHOLD = 200;

export function HeaderScrollState() {
  useEffect(() => {
    const root = document.documentElement;
    let scrolled = false;
    const update = () => {
      const next = window.scrollY > THRESHOLD;
      if (next === scrolled) return;
      scrolled = next;
      if (next) root.setAttribute("data-spp-scrolled", "");
      else root.removeAttribute("data-spp-scrolled");
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      root.removeAttribute("data-spp-scrolled");
    };
  }, []);
  return null;
}
