import type { IBrowserPlugin } from "znode-plugin/types/extension-api";
import { FooterBadges, FOOTER_BADGES_EDITOR } from "./FooterBadges.js";

// spp-widgets: page-builder widgets shared by every store, whatever its theme (the package is placed for all stores,
// "stores": "*"). A theme's own widgets (SppFaq, SppTestimonials) exist only where that theme runs.

type IHour = { days?: string; hours?: string };
type IShowroomProps = { id?: string; heading?: string; name?: string; address?: string; phone?: string; hours?: IHour[]; mapQuery?: string };

function Showroom(props: IShowroomProps) {
  const hours = (props.hours || []).filter((item) => item && item.days);
  const query = encodeURIComponent(props.mapQuery || props.address || "");
  return (
    <section className="spp-widgets-showroom" data-test-selector={`divShowroom${props.id || ""}`}>
      {props.heading && <h2 className="spp-widgets-showroom__heading">{props.heading}</h2>}
      <div className="spp-widgets-showroom__card">
        <div>
          {props.name && <p className="spp-widgets-showroom__name">{props.name}</p>}
          {props.address && <address className="spp-widgets-showroom__address">{props.address}</address>}
          {props.phone && (
            <a className="spp-widgets-showroom__phone" href={`tel:${props.phone.replace(/[^+0-9]/g, "")}`}>
              {props.phone}
            </a>
          )}
          {query && (
            <a className="spp-widgets-showroom__directions" href={`https://www.google.com/maps/search/?api=1&query=${query}`} target="_blank" rel="noopener noreferrer">
              Get directions
            </a>
          )}
        </div>
        {hours.length > 0 && (
          <table className="spp-widgets-showroom__hours">
            <caption>Opening hours</caption>
            <tbody>
              {hours.map((item, index) => (
                <tr key={index}>
                  <th scope="row">{item.days}</th>
                  <td>{item.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default function setup(): IBrowserPlugin {
  return {
    widgets: {
      SppShowroom: {
        render: Showroom,
        label: "Visit our showroom",
        category: "SPP shared",
        fields: {
          heading: { type: "text", label: "Heading" },
          name: { type: "text", label: "Showroom name" },
          address: { type: "textarea", label: "Address" },
          phone: { type: "text", label: "Phone" },
          mapQuery: { type: "text", label: "Map search (empty: the address)" },
          hours: {
            type: "array",
            label: "Opening hours",
            arrayFields: { days: { type: "text", label: "Days" }, hours: { type: "text", label: "Hours" } },
            defaultItemProps: { days: "Mon-Fri", hours: "8am-5pm" },
          },
        },
        defaultProps: {
          heading: "Visit our showroom",
          name: "Milwaukee showroom & will-call",
          address: "1200 N Water St, Milwaukee, WI 53202",
          phone: "1-800-555-0199",
          hours: [
            { days: "Mon-Fri", hours: "7am-6pm" },
            { days: "Saturday", hours: "8am-noon" },
            { days: "Sunday", hours: "Closed" },
          ],
        },
      },
      // made for the footer and header layout pages (store-wide, so here and not in a theme)
      SppFooterBadges: { render: FooterBadges, ...FOOTER_BADGES_EDITOR },
    },
  };
}
