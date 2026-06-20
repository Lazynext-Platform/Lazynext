"use client";

import React, { useEffect, useRef, useState } from "react";
import {
	Heart,
	MessageCircle,
	Share2,
	Music,
	Scissors,
	Play,
} from "lucide-react";
import { toast } from "sonner";

interface VideoProps {
	id: string;
	url: string;
	author: string;
	description: string;
	songName: string;
	likes: number;
	comments: number;
	isActive: boolean;
}

export function VideoPlayer({
	id,
	url,
	author,
	description,
	songName,
	likes,
	comments,
	isActive,
}: VideoProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isLiked, setIsLiked] = useState(false);

	useEffect(() => {
		if (isActive) {
			videoRef.current
				?.play()
				.catch((e) => console.error("Autoplay prevented:", e));
			setIsPlaying(true);
		} else {
			videoRef.current?.pause();
			setIsPlaying(false);
		}
	}, [isActive]);

	const handleVideoClick = () => {
		if (videoRef.current) {
			if (isPlaying) {
				videoRef.current.pause();
				setIsPlaying(false);
			} else {
				videoRef.current.play();
				setIsPlaying(true);
			}
		}
	};

	const handleRemix = () => {
		toast.success("Loading timeline into NLE...");
		// Redirect to editor with this project ID
		setTimeout(() => {
			window.location.href = `/editor?remix=${id}`;
		}, 1000);
	};

	return (
		<div className="relative w-full h-full bg-background snap-start flex justify-center items-center">
			{/* Video Element */}
			<video
				ref={videoRef}
				src={url}
				loop
				playsInline
				muted
				onClick={handleVideoClick}
				className="w-full h-full object-cover"
			/>

			{/* Play Overlay */}
			{!isPlaying && (
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
					<div className="bg-background/50 p-4 rounded-full backdrop-blur-sm">
						<Play className="w-12 h-12 text-white fill-white opacity-80" />
					</div>
				</div>
			)}

			{/* Content Overlay */}
			<div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end pt-32">
				<div className="flex justify-between items-end">
					{/* Info */}
					<div className="text-white space-y-2 w-3/4">
						<h3 className="font-bold text-lg">@{author}</h3>
						<p className="text-sm font-light text-neutral-200">{description}</p>
						<div className="flex items-center gap-2 text-sm font-medium">
							<Music className="w-4 h-4" />
							<div className="overflow-hidden w-48">
								<p className="animate-marquee whitespace-nowrap">{songName}</p>
							</div>
						</div>
						<button
							onClick={handleRemix}
							className="mt-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-colors"
						>
							<Scissors className="w-4 h-4" />
							Remix in Lazynext
						</button>
					</div>

					{/* Action Buttons */}
					<div className="flex flex-col items-center gap-6 pb-4">
						<button
							className="flex flex-col items-center gap-1 group"
							onClick={() => setIsLiked(!isLiked)}
						>
							<div className="p-3 bg-neutral-800/50 rounded-full backdrop-blur-md group-hover:bg-neutral-800/80 transition-colors">
								<Heart
									className={`w-7 h-7 ${isLiked ? "text-rose-500 fill-rose-500" : "text-white"}`}
								/>
							</div>
							<span className="text-white text-xs font-bold">
								{likes + (isLiked ? 1 : 0)}
							</span>
						</button>
						<button className="flex flex-col items-center gap-1 group">
							<div className="p-3 bg-neutral-800/50 rounded-full backdrop-blur-md group-hover:bg-neutral-800/80 transition-colors">
								<MessageCircle className="w-7 h-7 text-white" />
							</div>
							<span className="text-white text-xs font-bold">{comments}</span>
						</button>
						<button className="flex flex-col items-center gap-1 group">
							<div className="p-3 bg-neutral-800/50 rounded-full backdrop-blur-md group-hover:bg-neutral-800/80 transition-colors">
								<Share2 className="w-7 h-7 text-white" />
							</div>
							<span className="text-white text-xs font-bold">Share</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
