import { describe, expect, it, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { QueueTable } from "./QueueTable";

describe("QueueTable", () => {
	afterEach(() => {
		cleanup();
	});
	const MOCK_QUEUE = [
		{
			id: "job-9f8a",
			user: "alice@lazynext.com",
			status: "rendering" as const,
			progress: 45,
		},
		{
			id: "job-5f4a",
			user: "diana@lazynext.com",
			status: "completed" as const,
			progress: 100,
		},
	];

	it("renders the queue table headers and title", () => {
		render(<QueueTable items={MOCK_QUEUE} />);
		expect(screen.getByText("OpenSora Render Queue")).toBeTruthy();
		expect(screen.getByText("Job ID")).toBeTruthy();
		expect(screen.getByText("Status")).toBeTruthy();
	});

	it("renders queue items with correct status labels and progress", () => {
		render(<QueueTable items={MOCK_QUEUE} />);

		// Check job IDs
		expect(screen.getByText("job-9f8a")).toBeTruthy();
		expect(screen.getByText("job-5f4a")).toBeTruthy();

		// Check status labels
		expect(screen.getByText("rendering")).toBeTruthy();
		expect(screen.getByText("completed")).toBeTruthy();

		// Check progress
		expect(screen.getByText("45%")).toBeTruthy();
		expect(screen.getByText("100%")).toBeTruthy();
	});
});
