/**
 * Dashboard page — project overview and quick actions.
 *
 * @page /dashboard
 */

import type { Metadata } from "next";
import { DashboardClient } from "./client";

/** Utility representing metadata. */
export const metadata: Metadata = { title: "Dashboard — Lazynext" };

/** React component rendering DashboardPage. */
export default function DashboardPage() {
	return <DashboardClient />;
}
