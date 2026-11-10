// DeliveryDates, rendered anew: the parent theme's "Delivery dates" widget type (a table of order-by / receive-by
// dates) drawn as a shipping timeline: one card per cutoff, the next upcoming one marked "Next cutoff", past ones
// struck through. Same widget type, same saved props (heading, text, orderByLabel, receiveByLabel, rows, colors):
// pages that already use the widget get the new design with no content change.

type IRow = { orderBy?: string; receiveBy?: string };
type IDeliveryProps = { id?: string; heading?: string; text?: string; orderByLabel?: string; receiveByLabel?: string; rows?: IRow[]; textColor?: string };

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// "Mon, Dec 7" (this year) -> the end of that day, or null when it can't be read
function dayOf(label = "", now: Date) {
  const match = /([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})/.exec(label.replace(/^[A-Za-z]+,\s*/, ""));
  const month = match ? MONTHS.indexOf(match[1].toLowerCase()) : -1;
  return month < 0 ? null : new Date(now.getFullYear(), month, Number(match![2]), 23, 59, 59);
}

export function DeliveryTimeline(props: IDeliveryProps) {
  const now = new Date();
  const rows = (props.rows || []).filter((row) => row && row.orderBy);
  const next = rows.findIndex((row) => {
    const day = dayOf(row.orderBy, now);
    return day !== null && day.getTime() >= now.getTime();
  });
  return (
    <section className="spp-customization-timeline" data-test-selector={`divDeliveryDates${props.id || ""}`} style={props.textColor ? { color: props.textColor } : undefined}>
      <div className="spp-customization-timeline__intro">
        {props.heading && <h2 className="spp-customization-timeline__heading">{props.heading}</h2>}
        {props.text && <p className="spp-customization-timeline__text">{props.text}</p>}
      </div>
      <ol className="spp-customization-timeline__steps">
        {rows.map((row, index) => {
          const day = dayOf(row.orderBy, now);
          const past = day !== null && day.getTime() < now.getTime();
          return (
            <li key={index} className={`spp-customization-timeline__step${index === next ? " is-next" : ""}${past ? " is-past" : ""}`} data-test-selector={`listItemDeliveryDate${index}`}>
              {index === next && <span className="spp-customization-timeline__badge">Next cutoff</span>}
              <span className="spp-customization-timeline__label">{props.orderByLabel || "Order by"}</span>
              <strong className="spp-customization-timeline__date">{row.orderBy}</strong>
              <span className="spp-customization-timeline__arrow" aria-hidden="true">
                ↓
              </span>
              <span className="spp-customization-timeline__label">{props.receiveByLabel || "Receive by"}</span>
              <strong className="spp-customization-timeline__date">{row.receiveBy}</strong>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// no new fields: the parent's fields stay as they are; only the rendering changes
export const DELIVERY_TIMELINE_EDITOR = { label: "Delivery dates", category: "SPP · Content", fields: {}, defaultProps: {} };
