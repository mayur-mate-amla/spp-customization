import { Inter } from "next/font/google";

// The theme's Google font, declared as in any Next.js app; the build downloads it into the package and a page loads it
// only when something on it uses the class.
export const inter = Inter({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });
