import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WikiFlow — a world of edits, a stream of decisions",
  description: "Watch real Wikipedia edits flow through the OpenAI Decisions API and find their topic, live.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
