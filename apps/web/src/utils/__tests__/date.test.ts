import { describe, expect, it } from "bun:test";
import { formatDate } from "../date";

describe("formatDate", () => {
	it("returns a string", () => {
		const result = formatDate({ date: new Date("2025-06-07") });
		expect(typeof result).toBe("string");
	});

	it("includes month name", () => {
		const result = formatDate({ date: new Date("2025-01-15") });
		expect(result).toContain("Jan");
	});

	it("includes day", () => {
		const result = formatDate({ date: new Date("2025-12-25") });
		expect(result).toContain("25");
	});

	it("includes year", () => {
		const result = formatDate({ date: new Date("2025-06-07") });
		expect(result).toContain("2025");
	});

	it("formats as Month Day, Year", () => {
		const result = formatDate({ date: new Date("2025-03-15") });
		expect(result).toMatch(/[A-Z][a-z]{2} \d{1,2}, \d{4}/);
	});
});
