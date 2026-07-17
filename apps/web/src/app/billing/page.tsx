/**
 * Billing page — three-tier SaaS billing portal with plan comparison,
 * current usage telemetry, and Dodo Payments checkout integration.
 *
 * @page /billing
 */

import type { Metadata } from "next";
import { BillingPageClient } from "./client";

/** Utility representing metadata. */
export const metadata: Metadata = {
	title: "Billing — Lazynext",
	description: "Choose a plan that fits your workflow.",
};

/** React component rendering BillingPage. */
export default function BillingPage() {
	return <BillingPageClient />;
}
