// SppFaq: a frequently-asked-questions block, as storefronts put on home and help pages. Each question opens its
// answer in place (native <details>/<summary>: keyboard and screen-reader friendly, no script). The merchant edits the
// heading and the questions in the page builder; "Open the first answer" shows one answer from the start.

type IFaqItem = { question?: string; answer?: string };
type IFaqProps = { id?: string; heading?: string; items?: IFaqItem[]; openFirst?: boolean | string };

export function Faq(props: IFaqProps) {
  const items = (props.items || []).filter((item) => item && item.question);
  const openFirst = props.openFirst === true || props.openFirst === "true";
  return (
    <section className="spp-customization-faq" data-test-selector={`divFaq${props.id || ""}`}>
      {props.heading && <h2 className="spp-customization-faq__heading">{props.heading}</h2>}
      <div className="spp-customization-faq__list">
        {items.map((item, index) => (
          <details key={index} className="spp-customization-faq__item" open={openFirst && index === 0} data-test-selector={`divFaqItem${index}`}>
            <summary className="spp-customization-faq__question">{item.question}</summary>
            <p className="spp-customization-faq__answer">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export const FAQ_EDITOR = {
  label: "FAQ accordion",
  category: "SPP · Content",
  fields: {
    heading: { type: "text", label: "Heading" },
    openFirst: {
      type: "radio",
      label: "Open the first answer",
      options: [
        { label: "Yes", value: true },
        { label: "No", value: false },
      ],
    },
    items: {
      type: "array",
      label: "Questions",
      arrayFields: {
        question: { type: "text", label: "Question" },
        answer: { type: "textarea", label: "Answer" },
      },
      defaultItemProps: { question: "New question", answer: "" },
    },
  },
  defaultProps: {
    heading: "Frequently asked questions",
    openFirst: true,
    items: [
      { question: "What is the minimum order?", answer: "Most items have no minimum. Decorated items show their minimum on the product page." },
      { question: "How long does decoration take?", answer: "We send a free digital proof within one business day; production starts when you approve it." },
      { question: "Can I pay by purchase order?", answer: "Yes. Approved business accounts can pay by purchase order with Net 30 terms." },
    ],
  },
};
