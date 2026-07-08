/** @module Base panel layout wrapper with optional title, actions, and scroll area */
import { cn } from "@/utils/ui";

interface PanelViewProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Optional panel title. */
	title?: string;
	/** Optional header action controls. */
	actions?: React.ReactNode;
	/** Panel content. */
	children: React.ReactNode;
	/** Additional classes for the content wrapper. */
	contentClassName?: string;
	/** Additional classes for the scroll area. */
	scrollClassName?: string;
	/** Whether to hide the header. */
	hideHeader?: boolean;
	/** Ref to the root element. */
	ref?: React.Ref<HTMLDivElement>;
	/** Scroll event handler for the scroll area. */
	onScroll?: React.UIEventHandler<HTMLDivElement>;
	/** Ref to the scroll area element. */
	scrollRef?: React.Ref<HTMLDivElement>;
}

export function PanelView({
	title,
	actions,
	children,
	className,
	contentClassName,
	scrollClassName,
	hideHeader = false,
	ref,
	onScroll,
	scrollRef,
	...rest
}: PanelViewProps) {
	return (
		<div
			className={cn("relative flex h-full flex-col", className)}
			ref={ref}
			{...rest}
		>
			{!hideHeader && (
				<div className="bg-background h-11 shrink-0 pl-3 pr-2 flex items-center justify-between border-b">
					{title && (
						<span className="text-muted-foreground text-sm">{title}</span>
					)}
					{actions}
				</div>
			)}
			<div
				className={cn(
					"scrollbar-hidden size-full overflow-y-auto",
					hideHeader ? "pt-4" : "pt-2",
					scrollClassName,
				)}
				ref={scrollRef}
				onScroll={onScroll}
			>
				<div className={cn("w-full flex-1 px-2 pt-0", contentClassName)}>
					{children}
				</div>
			</div>
		</div>
	);
}
