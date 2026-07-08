/** @module Sound effect and saved sound type definitions */
export interface SoundEffect {
	/** Freesound API sound ID. */
	id: number;
	/** Display name of the sound. */
	name: string;
	/** Human-readable description. */
	description: string;
	/** Direct audio file URL. */
	url: string;
	/** Low-bitrate preview URL. */
	previewUrl?: string;
	/** High-quality download URL. */
	downloadUrl?: string;
	/** Duration in seconds. */
	duration: number;
	/** File size in bytes. */
	filesize: number;
	/** MIME type of the audio. */
	type: string;
	/** Number of audio channels. */
	channels: number;
	/** Bitrate in kbps. */
	bitrate: number;
	/** Bit depth (e.g. 16, 24). */
	bitdepth: number;
	/** Sample rate in Hz. */
	samplerate: number;
	/** Uploader username. */
	username: string;
	/** Search tags. */
	tags: string[];
	/** License identifier. */
	license: string;
	/** ISO-8601 creation date. */
	created: string;
	/** Total download count. */
	downloads: number;
	/** Average rating. */
	rating: number;
	/** Number of rating votes. */
	ratingCount: number;
}

export interface SavedSound {
	/** Freesound API sound ID. */
	id: number; // freesound id
	/** Display name of the sound. */
	name: string;
	/** Uploader username. */
	username: string;
	/** Low-bitrate preview URL. */
	previewUrl?: string;
	/** High-quality download URL. */
	downloadUrl?: string;
	/** Duration in seconds. */
	duration: number;
	/** Search tags. */
	tags: string[];
	/** License identifier. */
	license: string;
	/** ISO-8601 timestamp when saved. */
	savedAt: string; // iso date string
}

export interface SavedSoundsData {
	/** Array of saved sounds. */
	sounds: SavedSound[];
	/** ISO-8601 timestamp of last modification. */
	lastModified: string;
}
