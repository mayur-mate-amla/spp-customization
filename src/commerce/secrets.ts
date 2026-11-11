// Secret settings by reference (row 159). A setting such as erpWebhookSecret or staffKey may hold the secret itself, or
// "env:NAME": the name of an environment variable of the store's server process, read here at each request. With a
// reference, plugins.json holds only the variable's name, so a copy of the registry (a backup, a support ticket, the
// development server's debug data, see docs/scenarios/159) gives away no secret. The value is read on the server only,
// in routes, and is never sent to the browser or logged.
//
// A reference to a variable that is not set resolves to "" (the routes then refuse everything: fail closed). Names are
// upper-case letters, digits and "_".

const REFERENCE = /^env:([A-Z][A-Z0-9_]{0,63})$/;

export function secretSetting(value: unknown, env: Record<string, string | undefined> = process.env): string {
  const text = typeof value === "string" ? value.trim() : "";
  const reference = REFERENCE.exec(text);
  if (!reference) return text;
  return String(env[reference[1]] || "");
}

