/**
 * Voice chat — WebRTC voice communication and collaboration controls
 * for the editor.
 *
 * @module components/editor/VoiceChat
 */

import { useEffect, useRef } from "react";
import { Mic, PhoneCall, Users } from "lucide-react";

interface VoiceChatProps {
	/** Whether voice chat is currently active. */
	isVoiceActive: boolean;
	/** Start voice chat. */
	startVoice: () => void;
	/** Stop voice chat. */
	stopVoice: () => void;
	/** Map of peer ID to their media stream. */
	peers: { [id: string]: MediaStream };
}

/** React component rendering VoiceChat. */
export function VoiceChat({
	isVoiceActive,
	startVoice,
	stopVoice,
	peers,
}: VoiceChatProps) {
	return (
		<div className="absolute bottom-6 right-6 z-50">
			<div className="bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 p-4 rounded-2xl shadow-2xl flex flex-col gap-4 min-w-[200px]">
				<div className="flex items-center justify-between border-b border-neutral-800 pb-2">
					<div className="flex items-center gap-2 text-sm font-semibold">
						<Users className="w-4 h-4 text-cyan-400" />
						<span>Voice Channel</span>
					</div>
					<span className="text-xs text-neutral-500">
						{Object.keys(peers).length + (isVoiceActive ? 1 : 0)} Online
					</span>
				</div>

				{/* Local User */}
				{isVoiceActive && (
					<div className="flex items-center gap-3">
						<div className="relative">
							<div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border-2 border-cyan-400">
								<span className="text-cyan-400 text-xs font-bold">You</span>
							</div>
						</div>
						<span className="text-sm text-neutral-300">Local User</span>
					</div>
				)}

				{/* Remote Peers */}
				{Object.entries(peers).map(([id, stream]) => (
					<AudioPeer key={id} id={id} stream={stream} />
				))}

				<button
					onClick={isVoiceActive ? stopVoice : startVoice}
					className={`flex items-center justify-center gap-2 w-full py-2 rounded-xl transition-colors font-medium text-sm ${
						isVoiceActive
							? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20"
							: "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
					}`}
				>
					{isVoiceActive ? (
						<>
							<PhoneCall className="w-4 h-4" />
							Disconnect
						</>
					) : (
						<>
							<Mic className="w-4 h-4" />
							Join Voice
						</>
					)}
				</button>
			</div>
		</div>
	);
}

function AudioPeer({ id, stream }: { id: string; stream: MediaStream }) {
	const audioRef = useRef<HTMLAudioElement>(null);

	useEffect(() => {
		if (audioRef.current && stream) {
			audioRef.current.srcObject = stream;
		}
	}, [stream]);

	return (
		<div className="flex items-center gap-3">
			{/* eslint-disable-next-line jsx-a11y/media-has-caption */}
			<audio ref={audioRef} autoPlay />
			<div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
				<span className="text-neutral-400 text-xs font-bold">
					{id.substring(0, 2).toUpperCase()}
				</span>
			</div>
			<span className="text-sm text-neutral-300 font-mono text-xs truncate max-w-[100px]">
				{id}
			</span>
		</div>
	);
}
