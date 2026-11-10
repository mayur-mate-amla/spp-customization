import { useState, type FormEvent } from "react";

// SppQuoteRequest (spp-commerce): a "Request a quote" form for the page builder. It posts the store's own contact
// form to the store's own contact route, POST /api/contact-us, with the quote's extra fields (quantity, needed by, the
// rep the shopper came through); on this store spp-commerce has replaced that route (row 099), so the request becomes a
// quote request for the shopper's sales rep. The answer is the store's envelope: { data: { hasError, errorMessage,
// reference, rep } }.

type IQuoteRequestProps = { id?: string; heading?: string; text?: string };
type IState = { busy: boolean; done: string; error: string };

const repCode = () => {
  try {
    return decodeURIComponent(document.cookie.match(/(?:^|;\s*)spp_rep=([^;]*)/)?.[1] || "");
  } catch {
    return "";
  }
};

export function QuoteRequest(props: IQuoteRequestProps) {
  const [state, setState] = useState<IState>({ busy: false, done: "", error: "" });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    setState({ busy: true, done: "", error: "" });
    try {
      const response = await fetch("/api/contact-us", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, repCode: repCode() }),
      });
      const answer = await response.json();
      const data = answer?.data || {};
      if (!response.ok || data.hasError) throw new Error(data.errorMessage || "Your request could not be sent. Please try again.");
      form.reset();
      setState({ busy: false, error: "", done: data.reference ? `Thank you. Your request ${data.reference} is with ${data.rep}, who will reply within one business day.` : "Thank you. We will reply within one business day." });
    } catch (failure) {
      setState({ busy: false, done: "", error: failure instanceof Error ? failure.message : "Your request could not be sent." });
    }
  };

  return (
    <section className="spp-commerce-quote" data-test-selector={`divQuoteRequest${props.id || ""}`}>
      {props.heading && <h2 className="spp-commerce-quote__heading">{props.heading}</h2>}
      {props.text && <p className="spp-commerce-quote__text">{props.text}</p>}
      <form className="spp-commerce-quote__form" onSubmit={submit} noValidate>
        <label>
          First name
          <input name="firstName" autoComplete="given-name" required />
        </label>
        <label>
          Last name
          <input name="lastName" autoComplete="family-name" required />
        </label>
        <label>
          Work email
          <input name="emailId" type="email" autoComplete="email" required />
        </label>
        <label>
          Company
          <input name="companyName" autoComplete="organization" />
        </label>
        <label>
          Quantity
          <input name="quantity" type="number" min={1} inputMode="numeric" />
        </label>
        <label>
          Needed by
          <input name="neededBy" type="date" />
        </label>
        <label className="spp-commerce-quote__wide">
          What do you need?
          <textarea name="comments" rows={3} required placeholder="Item, colors, logo placement, event date..." />
        </label>
        <div className="spp-commerce-quote__actions">
          <button type="submit" disabled={state.busy} data-test-selector="btnSendQuoteRequest">
            {state.busy ? "Sending..." : "Request a quote"}
          </button>
          <p role="status" aria-live="polite" className={state.error ? "is-error" : "is-done"} data-test-selector="paraQuoteRequestStatus">
            {state.error || state.done}
          </p>
        </div>
      </form>
    </section>
  );
}

export const QUOTE_REQUEST_EDITOR = {
  label: "Request a quote",
  category: "SPP commerce",
  fields: {
    heading: { type: "text", label: "Heading" },
    text: { type: "textarea", label: "Text under the heading" },
  },
  defaultProps: {
    heading: "Request a quote",
    text: "Tell us what you need and when. Your sales rep replies within one business day with pricing and a digital proof.",
  },
};
