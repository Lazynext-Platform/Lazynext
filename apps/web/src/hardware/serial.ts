/**
 * @module RS-422 serial deck controller for physical VTR tape decks via the
 * Web Serial API. Sends Sony 9-pin protocol commands for ingest workflows.
 */

export class RS422DeckController {
	private port: any = null;

	/**
	 * Requests access to a physical USB-to-RS422 serial port adapter.
	 * This uses the modern Web Serial API (navigator.serial) to bridge
	 * the web browser directly to 1990s broadcast hardware.
	 */
	public async connect() {
		if (!("serial" in navigator)) {
			console.error("Web Serial API not supported in this browser.");
			return;
		}

		try {
			// @ts-ignore
			this.port = await navigator.serial.requestPort();
			await this.port.open({
				baudRate: 38400,
				dataBits: 8,
				stopBits: 1,
				parity: "odd",
			});
			console.log("[RS-422] Connected to physical VTR Tape Deck!");
		} catch (e) {
			console.error("[RS-422] Connection failed:", e);
		}
	}

	/**
	 * Sends the Sony 9-pin RS-422 HEX command to tell the physical deck to REWIND.
	 */
	public async rewind() {
		if (!this.port) return;
		const writer = this.port.writable.getWriter();
		const rewindCommand = new Uint8Array([0x20, 0x20]); // Standard Sony 9-pin Rewind
		await writer.write(rewindCommand);
		writer.releaseLock();
		console.log("[RS-422] Commanded VTR to REWIND tape.");
	}

	/**
	 * Sends the Sony 9-pin RS-422 HEX command to tell the physical deck to PLAY.
	 */
	public async play() {
		if (!this.port) return;
		const writer = this.port.writable.getWriter();
		const playCommand = new Uint8Array([0x20, 0x01]); // Standard Sony 9-pin Play
		await writer.write(playCommand);
		writer.releaseLock();
		console.log("[RS-422] Commanded VTR to PLAY tape for ingest.");
	}
}
