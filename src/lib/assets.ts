// URLs of this theme's assets (row 145). The store serves package files "public, max-age=31536000, immutable": the
// bundles and CSS carry ?v=<install time>, but assets (images, fonts, scripts by name) are linked as they are, so a
// changed asset under the same name would stay in shoppers' browsers for up to a year. Every asset URL of this theme
// carries the package's version (?v=1.0.3): a release with a new version gives every asset a new URL. The store ignores
// the query when it serves the file. The SDK's bundler cannot import znode-package.json, so the version is written
// here, and `npm run deploy` refuses to deploy while any ?v= in src/ differs from the manifest's version.

export const ASSET_VERSION = "1.0.3";

export const asset = (name: string) => `/api/extensions/files/${name}?v=${ASSET_VERSION}`;
