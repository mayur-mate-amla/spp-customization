// A mock API: the shape a real source (Znode, a CMS, an ERP) would answer with. Replace the body with the real call;
// the welcome page and the highlights route only depend on IHighlight.

export interface IHighlight {
  id: number;
  title: string;
  text: string;
}

const MOCK: IHighlight[] = [
  { id: 1, title: "Account pricing", text: "Your agreed prices on every product." },
  { id: 2, title: "Fast reorder", text: "Past orders and saved lists, ready to add to the cart." },
  { id: 3, title: "Order tracking", text: "See where every order is and download its invoice." },
];

export async function getHighlights(_storeCode: string): Promise<IHighlight[]> {
  return MOCK;
}
