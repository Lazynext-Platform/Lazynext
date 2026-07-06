/**
 * Settings page — user profile, preferences, and account management.
 *
 * @page /settings
 * @module settings/page
 */

import type { Metadata } from "next";
import { SettingsPageClient } from "./client";

export const metadata: Metadata = {
	title: "Settings — Lazynext",
	description: "Manage your account settings and preferences.",
};

export default function SettingsPage() {
	return <SettingsPageClient />;
}
