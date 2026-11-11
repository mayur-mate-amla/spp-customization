import type { ReactNode } from "react";
import type { IBrowserHost, IBrowserPlugin } from "znode-plugin/types/extension-api";

// spp-sandbox-probe's browser part (rows 184-185): a slot in the header (layout.header) that passes the header through,
// or throws while rendering when the failIn setting lists "browserSlot". Does the page survive, and is it logged?

let settings: Record<string, unknown> = {};
const failing = (where: string) => Array.isArray(settings.failIn) && settings.failIn.includes(where);

function ProbeHeader(props: { children?: ReactNode }) {
  if (failing("browserSlot")) throw new Error("spp-sandbox-probe browser slot failure (row 185)");
  return <>{props.children}</>;
}

export default function setup(host: IBrowserHost): IBrowserPlugin {
  settings = host.settings;
  return { slots: { "layout.header": ProbeHeader } };
}
