/**
 * Collapsible section component — expand/collapse with cache-based
 * state persistence across mounts.
 *
 * @module components/section
 */

import { createContext, useContext, useEffect, useState } from "react";
import { cn } from "@/utils/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDownIcon } from "@hugeicons/core-free-icons";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const sectionExpandedCache = new Map<string, boolean>();
const mountedSectionKeys = new Set<string>();

interface SectionContext {
	/** Whether the section is expanded. */
	isOpen: boolean;
	/** Toggles the section open state. */
	toggle: () => void;
	/** Whether the section can be collapsed. */
	collapsible: boolean;
}

const SectionCtx = createContext<SectionContext | null>(null);

function useSectionContext() {
	return useContext(SectionCtx);
}

interface SectionProps {
	/** Section content. */
	children: React.ReactNode;
	/** Whether the section can be collapsed. */
	collapsible?: boolean;
	/** Whether the section starts expanded. */
	defaultOpen?: boolean;
	/** Cache key for persisting expanded state. */
	sectionKey?: string;
	/** Additional CSS classes. */
	className?: string;
	/** Whether to render a top border. */
	showTopBorder?: boolean;
	/** Whether to render a bottom border. */
	showBottomBorder?: boolean;
}

/** React component rendering Section. */
export function Section({
	children,
	collapsible = false,
	defaultOpen = true,
	sectionKey,
	className,
	showTopBorder = false,
	showBottomBorder = true,
}: SectionProps) {
	const cached = sectionKey ? sectionExpandedCache.get(sectionKey) : undefined;
	const [isOpen, setIsOpen] = useState(cached ?? defaultOpen);

	useEffect(() => {
		if (!sectionKey) return;
		if (
			process.env.NODE_ENV !== "production" &&
			mountedSectionKeys.has(sectionKey)
		) {
			console.error(
				`[Section] duplicate sectionKey mounted simultaneously: "${sectionKey}"`,
			);
		}
		mountedSectionKeys.add(sectionKey);
		return () => {
			mountedSectionKeys.delete(sectionKey);
		};
	}, [sectionKey]);

	const toggle = () => {
		const next = !isOpen;
		setIsOpen(next);
		if (sectionKey) sectionExpandedCache.set(sectionKey, next);
	};

	return (
		<SectionCtx.Provider value={{ isOpen, toggle, collapsible }}>
			<div
				className={cn(
					"flex flex-col",
					showTopBorder && "border-t first:border-t-0",
					showBottomBorder && "border-b",
					className,
				)}
			>
				{children}
			</div>
		</SectionCtx.Provider>
	);
}

interface SectionHeaderProps {
	/** Header content. */
	children?: React.ReactNode;
	/** Content rendered on the trailing side. */
	trailing?: React.ReactNode;
	/** Content rendered on the leading side. */
	leading?: React.ReactNode;
	/** Action controls rendered after trailing content. */
	actions?: React.ReactNode;
	/** Click handler for the header. */
	onClick?: () => void;
	/** Additional CSS classes. */
	className?: string;
}

/** React component rendering SectionHeader. */
export function SectionHeader({
	children,
	trailing,
	leading,
	actions,
	onClick,
	className,
}: SectionHeaderProps) {
	const ctx = useSectionContext();
	const isCollapsible = ctx?.collapsible ?? false;
	const isOpen = ctx?.isOpen ?? true;
	const isInteractive = isCollapsible || !!onClick;
	const handleClick = isCollapsible ? ctx?.toggle : onClick;

	const chevronIcon = (
		<HugeiconsIcon
			icon={ArrowDownIcon}
			className={cn(
				"size-4 shrink-0 transition-transform duration-200 ease-out",
				isOpen
					? "rotate-0 text-foreground"
					: "-rotate-90 text-muted-foreground",
			)}
		/>
	);

	const trailingArea =
		trailing || isCollapsible ? (
			<div className="flex items-center">
				{trailing}
				{isCollapsible && (
					<Button
						variant="ghost"
						size="icon"
						aria-label={isOpen ? "Collapse section" : "Expand section"}
						onClick={handleClick}
					>
						{chevronIcon}
					</Button>
				)}
			</div>
		) : null;

	const innerContent = isInteractive ? (
		<button
			type="button"
			className="min-w-0 flex-1 flex items-center gap-2 h-full cursor-pointer text-left"
			onClick={handleClick}
		>
			{leading}
			<div className="min-w-0 flex-1 flex items-center">{children}</div>
		</button>
	) : (
		<>
			{leading}
			<div className="min-w-0 flex-1 flex items-center">{children}</div>
		</>
	);

	return (
		<div
			className={cn("flex h-11 w-full items-center gap-2 px-3.5", className)}
		>
			{innerContent}
			{trailingArea}
			{actions}
		</div>
	);
}

/** React component rendering SectionTitle. */
export function SectionTitle({
	children,
	className,
	onClick,
}: {
	children: React.ReactNode;
	className?: string;
	onClick?: () => void;
}) {
	const ctx = useSectionContext();
	const isCollapsible = ctx?.collapsible ?? false;
	const isOpen = ctx?.isOpen ?? true;

	const titleClass = cn(
		"text-sm font-medium",
		isCollapsible && isOpen ? "text-foreground" : "text-muted-foreground",
		className,
	);

	if (onClick) {
		return (
			<button
				type="button"
				className={cn("cursor-pointer", titleClass)}
				onClick={onClick}
			>
				{children}
			</button>
		);
	}

	return <span className={titleClass}>{children}</span>;
}

/** React component rendering SectionFields. */
export function SectionFields({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("flex flex-col gap-3.5", className)}>{children}</div>
	);
}

/** React component rendering SectionField. */
export function SectionField({
	label,
	beforeLabel,
	children,
	className,
}: {
	label: string;
	beforeLabel?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("flex flex-col gap-2", className)}>
			<div className="flex h-4 items-center gap-1.5">
				{beforeLabel}
				<Label>{label}</Label>
			</div>
			{children}
		</div>
	);
}

/** React component rendering SectionContent. */
export function SectionContent({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	const ctx = useSectionContext();
	const isCollapsible = ctx?.collapsible ?? false;
	const isOpen = ctx?.isOpen ?? true;

	const content = <div className={cn("p-4 pt-0", className)}>{children}</div>;

	if (isCollapsible) {
		return (
			<div
				className={cn(
					"grid transition-[grid-template-rows] duration-100 ease-out",
					isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
				)}
			>
				<div className="overflow-hidden">{content}</div>
			</div>
		);
	}

	return content;
}
