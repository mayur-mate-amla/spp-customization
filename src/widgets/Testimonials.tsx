// SppTestimonials: a page-builder block of customer quotes with star ratings, as storefronts show near the bottom of
// the home page ("What our customers say"). The merchant edits the heading and the quotes in the page builder.
// Renders the same on the server and in the browser (no Date.now(), no window during render).

type IQuote = { quote?: string; name?: string; company?: string; rating?: number };
type ITestimonialsProps = { id?: string; heading?: string; subheading?: string; items?: IQuote[] };

function Stars(props: { rating: number }) {
  const rating = Math.max(0, Math.min(5, Math.round(props.rating)));
  return (
    <span className="spp-customization-testimonials__stars" role="img" aria-label={`${rating} out of 5 stars`}>
      {"★★★★★".slice(0, rating)}
      <span className="spp-customization-testimonials__stars-off">{"★★★★★".slice(rating)}</span>
    </span>
  );
}

export function Testimonials(props: ITestimonialsProps) {
  const items = (props.items || []).filter((item) => item && item.quote);
  return (
    <section className="spp-customization-testimonials" data-test-selector={`divTestimonials${props.id || ""}`}>
      {props.heading && <h2 className="spp-customization-testimonials__heading">{props.heading}</h2>}
      {props.subheading && <p className="spp-customization-testimonials__subheading">{props.subheading}</p>}
      <ul className="spp-customization-testimonials__list">
        {items.map((item, index) => (
          <li key={index} className="spp-customization-testimonials__card" data-test-selector={`listItemTestimonial${index}`}>
            <Stars rating={Number(item.rating ?? 5)} />
            <blockquote className="spp-customization-testimonials__quote">“{item.quote}”</blockquote>
            <p className="spp-customization-testimonials__who">
              <strong>{item.name}</strong>
              {item.company && <span>{item.company}</span>}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export const TESTIMONIALS_EDITOR = {
  label: "Customer testimonials",
  category: "Spp Customization",
  fields: {
    heading: { type: "text", label: "Heading" },
    subheading: { type: "textarea", label: "Text under the heading" },
    items: {
      type: "array",
      label: "Testimonials",
      arrayFields: {
        quote: { type: "textarea", label: "Quote" },
        name: { type: "text", label: "Name" },
        company: { type: "text", label: "Company" },
        rating: { type: "number", label: "Stars (1-5)", min: 1, max: 5 },
      },
      defaultItemProps: { quote: "", name: "", company: "", rating: 5 },
    },
  },
  defaultProps: {
    heading: "What our customers say",
    subheading: "Teams that order their branded gear with us.",
    items: [
      { quote: "Our onboarding kits arrived in four days, every logo spot on.", name: "Priya S.", company: "People team, fintech", rating: 5 },
      { quote: "Reordering for 12 offices takes me ten minutes now.", name: "Marcus L.", company: "Office manager", rating: 5 },
      { quote: "Great quality and the account pricing is clear up front.", name: "Dana K.", company: "Events lead", rating: 4 },
    ],
  },
};
