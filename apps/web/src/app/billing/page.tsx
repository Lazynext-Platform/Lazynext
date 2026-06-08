import type { Metadata } from "next";
import { BillingPageClient } from "./client";
import { generateMetadata } from "@/seo/metadata";

export const metadata = generateMetadata({
  title: "Pricing & Plans",
  description: "Choose the right plan for your creative workflow. Free, Pro ($19/mo), and Studio ($49/mo). 4K/8K export, unlimited projects, 18 AI models.",
  path: "/billing",
});

export default function BillingPage() { return <BillingPageClient />; }
