import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WikiFlow — The world edits. AI decides.",
  description: "A live visual story: Wikipedia gets an edit, OpenAI's Decisions API picks a topic, and its answer sets the article's path.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
