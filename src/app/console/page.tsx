import type { Metadata } from "next";
import Link from "next/link";
import { WikiFlow } from "@/components/wiki-flow";

export const metadata: Metadata = { title: "WikiFlow — Live console" };

export default function Console() {
  return <><Link href="/" className="presentation-return">← Back to the presentation</Link><WikiFlow /></>;
}
