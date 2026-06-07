import type { Metadata } from "next";
import { BillingPageClient } from "./client";

export const metadata: Metadata = {
	title: "Billing — Lazynext",
	description: "Manage your subscription and billing information.",
};

export default function BillingPage() {
	return <BillingPageClient />;
}
