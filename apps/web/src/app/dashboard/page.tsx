/**
 * Dashboard page — project overview and quick actions.
 *
 * @page /dashboard
 */

import type { Metadata } from "next";
import { DashboardClient } from "./client";

export const metadata: Metadata = { title: "Dashboard — Lazynext" };

export default function DashboardPage() {
	return <DashboardClient />;
}
