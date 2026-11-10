// Types for image imports in the store's components (*.png, *.svg), as the webstore has them, for type checks of store
// files once the store is linked (npm run link-store).
/// <reference types="next/image-types/global" />

// next-intl: the store hands its useTranslations to packages' browser parts at run time (store-modules.ts), so the
// package does not install it; these are the types a package uses (the store's labels, merged with the package's
// "messages" file). ICU arguments ({count, plural, ...}) and rich tags (<b>...</b>) as next-intl takes them.
declare module "next-intl" {
  import type { ReactNode } from "react";
  type IValues = Record<string, string | number | Date>;
  type IRichValues = Record<string, string | number | Date | ((chunks: ReactNode) => ReactNode)>;
  export function useTranslations(namespace?: string): {
    (key: string, values?: IValues): string;
    rich(key: string, values?: IRichValues): ReactNode;
    has(key: string): boolean;
  };
}
