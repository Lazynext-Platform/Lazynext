describe("NativeBridge", () => {
	it("getProjectInfo returns project data", async () => {
		const mod = await import(
			"../modules/lazynext-native/src/MyModule"
		);
		const data = mod.default.getProjectInfo();
		expect(typeof data).toBe("string");
		const result = JSON.parse(data);
		expect(result.id).toBeTruthy();
	});

	it("processIntent returns success for edit intent", async () => {
		const mod = await import(
			"../modules/lazynext-native/src/MyModule"
		);
		const data = mod.default.processIntent("edit clip");
		expect(typeof data).toBe("string");
		const result = JSON.parse(data);
		expect(result.success).toBe(true);
	});

	it("processIntent returns success for chat intent", async () => {
		const mod = await import(
			"../modules/lazynext-native/src/MyModule"
		);
		const data = mod.default.processIntent("hello", true);
		expect(typeof data).toBe("string");
		const result = JSON.parse(data);
		expect(result.success).toBe(true);
		expect(result.response).toBeTruthy();
	});
});
