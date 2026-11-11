// Quote requests: what replaces the store's /api/contact-us (row 099). The store's route forwards a contact form to
// Znode's customer feedback; this store wants every request as a quote request for the shopper's sales rep. The body is
// the store's contact form (IContactFormValues: firstName, lastName, emailId, companyName, phoneNumber, comments) plus
// what the quote form adds (quantity, neededBy, repCode); the answer keeps the store's envelope so any contact form on
// the store (the base ContactUs widget included) works with it:
//   { status: "success", message, data: { hasError, errorMessage, reference, rep } }
// The requests are kept in memory per store (no plugin database, row 087) for the staff route quote-requests.

export type IQuoteRequest = {
  reference: string;
  at: string;
  rep: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  quantity: number;
  neededBy: string;
  comments: string;
};

/** The longest "What do you need?" text taken; far below the store's 64 KB limit for any plugin route body. */
export const MAX_COMMENTS = 2000;

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** The request from the form's body, or the reason it cannot be taken. */
export function readQuoteRequest(body: unknown, reps: Record<string, unknown>, now = new Date()): { request?: IQuoteRequest; error?: string } {
  const form = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const first = text(form.firstName, 60);
  const last = text(form.lastName, 60);
  const email = text(form.emailId, 120);
  // said, not cut: a longer text is refused with the limit (the form shows a counter and stops at it, row 101)
  if (typeof form.comments === "string" && form.comments.trim().length > MAX_COMMENTS) return { error: `Please keep "What do you need?" under ${MAX_COMMENTS.toLocaleString("en-US")} characters.` };
  const comments = text(form.comments, MAX_COMMENTS);
  if (!first || !last) return { error: "Please enter your first and last name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Please enter a valid email address." };
  if (!comments) return { error: "Please tell us what you need." };
  const quantity = Math.max(0, Math.min(1_000_000, Math.floor(Number(form.quantity) || 0)));
  const neededBy = /^\d{4}-\d{2}-\d{2}$/.test(text(form.neededBy, 10)) ? text(form.neededBy, 10) : "";
  const code = text(form.repCode, 10).toUpperCase();
  const names = Object.entries(reps).filter(([, name]) => typeof name === "string") as [string, string][];
  // the shopper's own rep when they came through a rep's link; else the first rep of the store
  const rep = (typeof reps[code] === "string" ? (reps[code] as string) : names[0]?.[1]) || "Customer service";
  const stamp = now.toISOString().replace(/\D/g, "").slice(2, 12);
  return {
    request: {
      reference: `Q-${stamp}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      at: now.toISOString(),
      rep,
      name: `${first} ${last}`,
      email,
      company: text(form.companyName, 120),
      phone: text(form.phoneNumber, 30),
      quantity,
      neededBy,
      comments,
    },
  };
}

/** A signed-in buyer's own quote requests (row 167): those sent with the email they sign in with (Znode's user name),
 *  case-insensitive. Nobody else's, and none for an empty name. */
export function quotesFor(list: IQuoteRequest[], userName: string): IQuoteRequest[] {
  const name = userName.trim().toLowerCase();
  return name ? list.filter((quote) => quote.email.toLowerCase() === name) : [];
}

/** The store's answer envelope (sendSuccess), so the store's own forms read it as they read the original route's. */
export function envelope(data: Record<string, unknown>, message = "") {
  return { status: "success", message, data };
}
