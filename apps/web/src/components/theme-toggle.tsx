/**
 * Theme toggle — dropdown menu with light/dark/system options,
 * synced with next-themes.
 *
 * @module components/theme-toggle
 */

"use client";

import { Button } from "./ui/button";
import { useTheme } from "next-themes";
import { cn } from "@/utils/ui";
import { useEffect, useState } from "react";
import { Sun03Icon, Moon02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ThemeToggleProps {
	/** Additional CSS class for the button. */
	className?: string;
	/** Additional CSS class for the icon. */
	iconClassName?: string;
}

/** React component rendering ThemeToggle. */
export function ThemeToggle({ className, iconClassName }: ThemeToggleProps) {
	const { setTheme, resolvedTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setMounted(true);
	}, []);

	if (!mounted) return <div className="size-8" />;

	const isDark = resolvedTheme === "dark";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					size="icon"
					variant="ghost"
					className={cn("size-8", className)}
					title="Toggle theme"
				>
					<HugeiconsIcon
						icon={isDark ? Moon02Icon : Sun03Icon}
						className={cn("!size-[1.1rem]", iconClassName)}
					/>
					<span className="sr-only">Toggle theme</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => setTheme("light")}>
					Light
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme("dark")}>
					Dark
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => setTheme("system")}>
					System
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
