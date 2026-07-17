/** @module UI utility — className merge helper using clsx and tailwind-merge */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Utility representing cn. */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
