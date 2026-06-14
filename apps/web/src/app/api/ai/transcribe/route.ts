import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	try {
		const formData = await req.formData();
		const audioFile = formData.get("audio") as Blob | null;

		if (!audioFile) {
			return NextResponse.json(
				{ error: "Missing audio file" },
				{ status: 400 },
			);
		}

		// Forward the file to the local Python pre-processing service
		const pythonFormData = new FormData();
		pythonFormData.append("audio", audioFile);

		const response = await fetch("http://localhost:8001/transcribe", {
			method: "POST",
			body: pythonFormData,
		});

		if (!response.ok) {
			throw new Error(`Python service failed with status ${response.status}`);
		}

		const data = await response.json();

		return NextResponse.json(data);
	} catch (error: any) {
		console.error("[Transcription API Error]:", error);
		return NextResponse.json(
			{ error: "Failed to process audio for transcription" },
			{ status: 500 },
		);
	}
}
