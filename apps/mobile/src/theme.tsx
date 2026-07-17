/**
 * Theme system — dark/light/system mode with OS preference detection
 * and user-toggleable override via AsyncStorage persistence.
 *
 * @module src/theme
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Appearance, useColorScheme } from "react-native";

/** Type definition for ThemeMode. */
export type ThemeMode = "dark" | "light" | "system";

/** Type definition for Theme. */
export interface Theme {
	/** Main background color. */
	bgMain: string;
	/** Panel/surface background color. */
	bgPanel: string;
	/** Glass-morphism translucent background. */
	bgGlass: string;
	/** Hover state background color. */
	bgHover: string;
	/** Primary accent color. */
	accentPrimary: string;
	/** Secondary accent color. */
	accentSecondary: string;
	/** Primary text color. */
	textPrimary: string;
	/** Secondary/muted text color. */
	textSecondary: string;
	/** Subtle/muted text color. */
	textMuted: string;
	/** Text color rendered on accent backgrounds. */
	textOnAccent: string;
	/** Glass-effect border color. */
	borderGlass: string;
	/** Status bar content style (light or dark). */
	statusBarStyle: "light-content" | "dark-content";
}

const darkTheme: Theme = {
	bgMain: "#050505",
	bgPanel: "rgba(24,24,27,0.5)",
	bgGlass: "rgba(24,24,27,0.3)",
	bgHover: "rgba(255,255,255,0.05)",
	accentPrimary: "#00e5ff",
	accentSecondary: "#0033ff",
	textPrimary: "#fafafa",
	textSecondary: "#a1a1aa",
	textMuted: "#52525b",
	textOnAccent: "#050505",
	borderGlass: "rgba(255,255,255,0.08)",
	statusBarStyle: "light-content",
};

const lightTheme: Theme = {
	bgMain: "#fcfcfc",
	bgPanel: "rgba(255,255,255,0.7)",
	bgGlass: "rgba(255,255,255,0.4)",
	bgHover: "rgba(0,0,0,0.03)",
	accentPrimary: "#00e5ff",
	accentSecondary: "#0033ff",
	textPrimary: "#09090b",
	textSecondary: "#3f3f46",
	textMuted: "#71717a",
	textOnAccent: "#050505",
	borderGlass: "rgba(0,0,0,0.08)",
	statusBarStyle: "dark-content",
};

interface ThemeContextValue {
	/** Currently active theme colours. */
	theme: Theme;
	/** Current theme mode. */
	mode: ThemeMode;
	/** Set a new theme mode. */
	setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
	theme: darkTheme,
	mode: "system",
	setMode: () => {},
});

const STORAGE_KEY = "@lazynext/theme-mode";

let AsyncStorage: any = null;
try {
	AsyncStorage = require("@react-native-async-storage/async-storage").default;
} catch {
	// Available only in React Native runtime — gracefully absent in SSR/tests
}

/** React component rendering ThemeProvider. */
export function ThemeProvider({ children }: { children: ReactNode }) {
	const [mode, setModeState] = useState<ThemeMode>("system");
	const systemScheme = useColorScheme() || "dark";
	const resolvedScheme: "dark" | "light" =
		mode === "system"
			? systemScheme === "light"
				? "light"
				: "dark"
			: mode;

	// Load saved preference on mount
	useEffect(() => {
		if (AsyncStorage) {
			AsyncStorage.getItem(STORAGE_KEY).then((saved: string | null) => {
				if (saved === "dark" || saved === "light" || saved === "system") {
					setModeState(saved as ThemeMode);
				}
			}).catch(() => {});
		}
	}, []);

	const setMode = (newMode: ThemeMode) => {
		setModeState(newMode);
		if (AsyncStorage) {
			AsyncStorage.setItem(STORAGE_KEY, newMode).catch(() => {});
		}
	};

	const theme = resolvedScheme === "dark" ? darkTheme : lightTheme;

	return (
		<ThemeContext.Provider value={{ theme, mode, setMode }}>
			{children}
		</ThemeContext.Provider>
	);
}

/** Custom hook providing useTheme functionality. */
export function useTheme(): ThemeContextValue {
	return useContext(ThemeContext);
}
