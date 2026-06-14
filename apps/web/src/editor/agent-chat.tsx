"use client";

import React, { useState, useRef, useEffect } from "react";

interface Message {
	role: "system" | "user" | "tool";
	content: string;
	toolName?: string;
}

export function AgentChat({
	onExecuteTool,
}: {
	onExecuteTool?: (toolName: string, args: Record<string, any>) => void;
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
	const scrollRef = useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom on new messages
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

	const handleSend = async () => {
		if (!input.trim() || isLoading) return;
		const currentInput = input;
		setInput("");
		setIsLoading(true);
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
				setMessages((prev) => [
					...prev,
					{ role: "system", content: `Error: ${data.error}` },
				]);
			} else {
				// Add text response
				if (data.response) {
					setMessages((prev) => [
						...prev,
						{ role: "system", content: data.response },
					]);
				}

				// Add tool call messages
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

						// Execute the tool in the main EditorClient
						if (onExecuteTool) {
							onExecuteTool(tool.name, tool.input);
						}
					}
				}
			}
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : "Unknown network error";
			setMessages((prev) => [
				...prev,
				{ role: "system", content: `Network Error: ${message}` },
			]);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex flex-col w-full h-64 bg-zinc-900 border-t border-zinc-800 p-4">
			<div className="text-sm font-bold text-blue-500 mb-2">AGENT CHAT</div>

			<div
				ref={scrollRef}
				className="flex-1 overflow-y-auto flex flex-col gap-2 mb-4"
			>
				{messages.map((msg, idx) => (
					<div
						key={idx}
						className={`text-sm whitespace-pre-wrap ${
							msg.role === "user"
								? "text-zinc-100 text-right"
								: msg.role === "tool"
									? "text-amber-400 text-left font-mono text-xs"
									: "text-zinc-400 text-left"
						}`}
					>
						{msg.role === "tool" && (
							<span className="inline-block mr-1 px-1 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] uppercase font-bold text-amber-400">
								TOOL
							</span>
						)}
						{msg.content}
					</div>
				))}
				{isLoading && (
					<div className="text-xs text-zinc-500 animate-pulse">
						Agent is thinking...
					</div>
				)}
			</div>

			<div className="flex items-center gap-2">
				<input
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && handleSend()}
					placeholder="Type a command (e.g., 'Cut out the silences')..."
					className="flex-1 h-10 bg-zinc-800 rounded-md px-3 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-500"
					disabled={isLoading}
				/>
				<button
					onClick={handleSend}
					disabled={isLoading}
					className="h-10 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:text-zinc-400 text-white text-sm font-medium rounded-md transition-colors"
				>
					{isLoading ? "..." : "Send"}
				</button>
			</div>
		</div>
	);
}
