/**
 * Agent Chat panel for conversing with the Lazynext AI Agent Copilot.
 *
 * Enhanced with suggested prompt chips, typing indicator, slash command
 * autocomplete, agent suggestion cards, and error retry buttons.
 *
 * @module editor/agent-chat
 */

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
	Zap,
	RefreshCw,
	Loader2,
	Slash,
	ClipboardList,
	Film,
	Palette,
	Music,
	Download,
} from "lucide-react";

interface Message {
	/** Message sender role. */
	role: "system" | "user" | "tool" | "suggestion";
	/** Message text content. */
	content: string;
	/** Tool name for tool messages. */
	toolName?: string;
	/** Agent suggestion cards. */
	suggestions?: AgentSuggestion[];
}

interface AgentSuggestion {
	/** Unique suggestion identifier. */
	id: string;
	/** Suggestion title. */
	title: string;
	/** Suggestion description text. */
	description: string;
	/** Suggestion category. */
	category: string;
}

const PROMPT_CHIPS = [
	{
		icon: Zap,
		label: "Remove silences",
		prompt: "Cut out all silences and pauses from the timeline",
	},
	{
		icon: ClipboardList,
		label: "Add captions",
		prompt: "Generate subtitles for all dialogue in the project",
	},
	{
		icon: Palette,
		label: "Color grade cinematic",
		prompt: "Apply a cinematic color grade with teal-orange look",
	},
	{
		icon: Music,
		label: "Add background music",
		prompt: "Find and add background music that matches the mood",
	},
	{
		icon: Download,
		label: "Export as MP4",
		prompt: "Export this project as an MP4 at 4K resolution",
	},
	{
		icon: Film,
		label: "Create highlight reel",
		prompt: "Create a 60-second highlight reel from the best moments",
	},
];

const SLASH_COMMANDS = [
	{
		command: "/edit",
		description: "Apply an edit to the timeline",
		example: "/edit remove all silences",
	},
	{
		command: "/color",
		description: "Apply a color grade or LUT",
		example: "/color cinematic teal-orange",
	},
	{
		command: "/audio",
		description: "Adjust audio levels, EQ, or effects",
		example: "/audio normalize to -14 LUFS",
	},
	{
		command: "/caption",
		description: "Generate or edit subtitles",
		example: "/caption generate from audio",
	},
	{
		command: "/export",
		description: "Export the project to a file",
		example: "/export 4K MP4 H.265",
	},
	{
		command: "/transition",
		description: "Add a transition between clips",
		example: "/transition cross dissolve 0.5s",
	},
	{
		command: "/speed",
		description: "Change clip speed or time remap",
		example: "/speed 2x on selected clip",
	},
	{
		command: "/crop",
		description: "Crop or reframe a clip",
		example: "/crop to 9:16 vertical",
	},
];

/**
 * Interactive chat panel that sends natural-language commands to the
 * AI copilot endpoint and displays tool execution results inline.
 *
 * @param onExecuteTool - callback invoked when the AI returns a tool call,
 *   receiving the tool name and its arguments for execution in the editor.
 */
export function AgentChat({
	onExecuteTool,
}: {
	onExecuteTool?: (toolName: string, args: Record<string, unknown>) => void;
}) {
	const [messages, setMessages] = useState<Message[]>([
		{
			role: "system",
			content:
				"Agent ready. Try: 'Cut out the silences', 'Apply a cyberpunk color grade', or 'Generate subtitles'.",
		},
	]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [typingDots, setTypingDots] = useState("");
	const [showSlashMenu, setShowSlashMenu] = useState(false);
	const [slashFilter, setSlashFilter] = useState("");
	const [selectedSlashIdx, setSelectedSlashIdx] = useState(0);
	const [failedMessageId, setFailedMessageId] = useState<number | null>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Typing indicator animation
	useEffect(() => {
		if (!isLoading) return;
		const interval = setInterval(() => {
			setTypingDots((prev) => (prev.length >= 3 ? "" : `${prev}.`));
		}, 400);
		return () => clearInterval(interval);
	}, [isLoading]);

	// Auto-scroll to bottom on new messages
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

	// Slash command filtering
	useEffect(() => {
		if (input.startsWith("/")) {
			const filter = input.slice(1).toLowerCase();
			setSlashFilter(filter);
			setShowSlashMenu(true);
			setSelectedSlashIdx(0);
		} else {
			setShowSlashMenu(false);
		}
	}, [input]);

	const filteredCommands = SLASH_COMMANDS.filter(
		(c) =>
			c.command.toLowerCase().includes(slashFilter) ||
			c.description.toLowerCase().includes(slashFilter),
	);

	const insertSlashCommand = useCallback(
		(cmd: (typeof SLASH_COMMANDS)[number]) => {
			setInput(`${cmd.command} `);
			setShowSlashMenu(false);
			inputRef.current?.focus();
		},
		[],
	);

	const handleRetry = useCallback(
		async (messageContent: string) => {
			setIsLoading(true);
			setFailedMessageId(null);

			try {
				const res = await fetch("/api/chat", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ prompt: messageContent }),
				});

				const data = await res.json();

				if (data.error) {
					setMessages((prev) => [
						...prev,
						{
							role: "system",
							content: `Error: ${data.error}`,
						},
					]);
					setFailedMessageId((prev) => (prev ?? 0) + messages.length);
				} else {
					if (data.response) {
						setMessages((prev) => [
							...prev,
							{ role: "system", content: data.response },
						]);
					}

					if (Array.isArray(data.toolCalls)) {
						for (const tool of data.toolCalls) {
							setMessages((prev) => [
								...prev,
								{
									role: "tool",
									content: `Executing: ${tool.name}(${JSON.stringify(tool.input)})`,
									toolName: tool.name,
								},
							]);
							if (onExecuteTool) {
								onExecuteTool(tool.name, tool.input);
							}
						}
					}
				}
			} catch (e: unknown) {
				const errorMessage =
					e instanceof Error ? e.message : "Unknown network error";
				setMessages((prev) => [
					...prev,
					{
						role: "system",
						content: `Network Error: ${errorMessage}`,
					},
				]);
				setFailedMessageId((prev) => (prev ?? 0) + messages.length);
			} finally {
				setIsLoading(false);
			}
		},
		[messages.length, onExecuteTool],
	);

	const handleSend = async () => {
		if (!input.trim() || isLoading) return;
		if (input.trim().length > 50000) {
			setMessages((prev) => [
				...prev,
				{
					id: Date.now(),
					role: "system" as const,
					content: "Prompt exceeds maximum length of 50,000 characters",
					timestamp: Date.now(),
				},
			]);
			return;
		}
		const currentInput = input;
		setInput("");
		setIsLoading(true);
		setFailedMessageId(null);
		setMessages((prev) => [
			...prev,
			{ role: "user" as const, content: currentInput },
		]);

		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompt: currentInput }),
			});

			const data = await res.json();

			if (data.error) {
				const msgIdx = messages.length + 1;
				setMessages((prev) => [
					...prev,
					{ role: "system", content: `Error: ${data.error}` },
				]);
				setFailedMessageId(msgIdx + 1);
			} else {
				if (data.response) {
					setMessages((prev) => [
						...prev,
						{ role: "system", content: data.response },
					]);
				}

				if (Array.isArray(data.toolCalls)) {
					for (const tool of data.toolCalls) {
						setMessages((prev) => [
							...prev,
							{
								role: "tool",
								content: `Executing: ${tool.name}(${JSON.stringify(tool.input)})`,
								toolName: tool.name,
							},
						]);
						if (onExecuteTool) {
							onExecuteTool(tool.name, tool.input);
						}
					}
				}

				// Inject agent suggestion cards if present
				if (Array.isArray(data.suggestions)) {
					setMessages((prev) => [
						...prev,
						{
							role: "suggestion",
							content: "Here are some improvements I found:",
							suggestions: data.suggestions,
						},
					]);
				}
			}
		} catch (e: unknown) {
			const errorMessage =
				e instanceof Error ? e.message : "Unknown network error";
			const msgIdx = messages.length + 1;
			setMessages((prev) => [
				...prev,
				{
					role: "system",
					content: `Network Error: ${errorMessage}`,
				},
			]);
			setFailedMessageId(msgIdx + 1);
		} finally {
			setIsLoading(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (showSlashMenu && filteredCommands.length > 0) {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedSlashIdx((prev) =>
					Math.min(prev + 1, filteredCommands.length - 1),
				);
				return;
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedSlashIdx((prev) => Math.max(prev - 1, 0));
				return;
			}
			if (e.key === "Tab" || e.key === "Enter") {
				e.preventDefault();
				insertSlashCommand(filteredCommands[selectedSlashIdx]);
				return;
			}
			if (e.key === "Escape") {
				setShowSlashMenu(false);
				return;
			}
		}

		if (e.key === "Enter") {
			handleSend();
		}
	};

	const handleChipClick = (prompt: string) => {
		setInput(prompt);
		inputRef.current?.focus();
	};

	const handleExecuteSuggestion = async (
		suggestion: AgentSuggestion,
	) => {
		setInput(suggestion.description);
		handleSend();
	};

	return (
		<div className="flex flex-col w-full h-96 bg-background border-t border-border">
			{/* Header */}
			<div className="flex items-center justify-between px-4 pt-3 pb-2">
				<div className="flex items-center gap-2">
					<div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
					<span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
						Lazynext AI Agent Agent
					</span>
				</div>
				{isLoading && (
					<span className="text-[10px] text-cyan-400/80 flex items-center gap-1.5">
						<Loader2 className="w-3 h-3 animate-spin" />
						Processing{typingDots}
					</span>
				)}
			</div>

			{/* Messages */}
			<div
				ref={scrollRef}
				className="flex-1 overflow-y-auto flex flex-col gap-2 px-4"
			>
				{messages.map((msg, idx) => (
					<div key={idx} className="flex flex-col gap-1">
						{/* Message bubble */}
						<div
							className={`text-sm whitespace-pre-wrap ${
								msg.role === "user"
									? "text-foreground text-right self-end max-w-[80%] bg-blue-600/20 border border-blue-500/30 rounded-2xl rounded-br-sm px-3 py-1.5"
									: msg.role === "tool"
										? "text-amber-400 text-left font-mono text-xs"
										: msg.role === "suggestion"
											? "text-foreground/80 text-left text-xs"
											: "text-muted text-left"
							}`}
						>
							{msg.role === "tool" && (
								<span className="inline-block mr-1 px-1 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] uppercase font-bold text-amber-400">
									TOOL
								</span>
							)}
							{msg.content}
						</div>

						{/* Error retry button */}
						{msg.role === "system" &&
							(msg.content.startsWith("Error:") ||
								msg.content.startsWith("Network Error:")) && (
								<button
									onClick={() =>
										handleRetry(
											messages
												.filter(
													(m, i) =>
														m.role === "user" &&
														i < idx,
												)
												.slice(-1)[0]?.content ||
												"",
										)
									}
									className="self-start flex items-center gap-1.5 px-2 py-1 text-[10px] text-red-400/80 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-md transition-colors"
								>
									<RefreshCw className="w-3 h-3" />
									Retry
								</button>
							)}

						{/* Agent suggestion cards inline */}
						{msg.role === "suggestion" &&
							msg.suggestions &&
							msg.suggestions.length > 0 && (
								<div className="flex flex-col gap-2 mt-1">
									{msg.suggestions.map((sug) => (
										<button
											key={sug.id}
											onClick={() =>
												handleExecuteSuggestion(sug)
											}
											className="flex items-start gap-2 bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/10 rounded-lg p-2.5 text-left transition-colors group"
										>
											<div className="w-6 h-6 rounded-md bg-cyan-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
												<Zap className="w-3.5 h-3.5 text-cyan-400" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-xs font-semibold text-foreground/90 group-hover:text-foreground">
													{sug.title}
												</p>
												<p className="text-[10px] text-muted/80 mt-0.5 line-clamp-2">
													{sug.description}
												</p>
											</div>
										</button>
									))}
								</div>
							)}
					</div>
				))}

				{/* Typing indicator */}
				{isLoading && (
					<div className="flex items-center gap-2 text-xs text-cyan-400/60 py-1">
						<div className="flex gap-1">
							<span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:0ms]" />
							<span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:150ms]" />
							<span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce [animation-delay:300ms]" />
						</div>
						<span className="text-[10px]">
							Agent is thinking{typingDots}
						</span>
					</div>
				)}
			</div>

			{/* Suggested prompt chips */}
			<div className="flex gap-1.5 px-4 py-2 overflow-x-auto border-t border-border/30">
				{PROMPT_CHIPS.map((chip) => (
					<button
						key={chip.label}
						onClick={() => handleChipClick(chip.prompt)}
						disabled={isLoading}
						className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-muted hover:text-foreground bg-panel/50 hover:bg-panel border border-border/30 rounded-full whitespace-nowrap transition-colors disabled:opacity-40 flex-shrink-0"
					>
						<chip.icon className="w-3 h-3" />
						{chip.label}
					</button>
				))}
			</div>

			{/* Input area */}
			<div className="relative flex items-center gap-2 px-4 pb-3 pt-1">
				<input
					ref={inputRef}
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Type a command or / for slash commands..."
					className="flex-1 h-10 bg-panel rounded-md px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-muted disabled:opacity-50"
					disabled={isLoading}
				/>
				<button
					onClick={handleSend}
					disabled={isLoading || !input.trim()}
					className="h-10 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-muted text-foreground text-sm font-medium rounded-md transition-colors flex items-center gap-1.5"
				>
					{isLoading ? (
						<Loader2 className="w-4 h-4 animate-spin" />
					) : (
						<Slash className="w-4 h-4" />
					)}
					Send
				</button>

				{/* Slash command autocomplete menu */}
				{showSlashMenu && filteredCommands.length > 0 && (
					<div className="absolute bottom-12 left-4 right-20 bg-popover border border-border rounded-lg shadow-2xl overflow-hidden z-50 max-h-48 overflow-y-auto">
						<div className="px-3 py-1.5 border-b border-border">
							<span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
								Slash Commands
							</span>
						</div>
						{filteredCommands.map((cmd, idx) => (
							<button
								key={cmd.command}
								onClick={() => insertSlashCommand(cmd)}
								className={`w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-accent transition-colors ${
									idx === selectedSlashIdx
										? "bg-accent"
										: ""
								}`}
							>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<code className="text-xs font-mono text-blue-400 bg-blue-500/10 px-1 py-0.5 rounded">
											{cmd.command}
										</code>
									</div>
									<p className="text-[10px] text-muted mt-0.5">
										{cmd.description}
									</p>
									{idx === selectedSlashIdx && (
										<p className="text-[10px] text-muted/40 mt-0.5 italic">
											{cmd.example}
										</p>
									)}
								</div>
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
