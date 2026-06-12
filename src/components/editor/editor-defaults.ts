/** Default assets shown in the media pool when no project media is loaded. */
export const INITIAL_ASSETS = [
  {
    id: "asset-1",
    type: "video" as const,
    name: "Video_Clip_01.mp4",
    duration_frames: 120,
    color: "bg-indigo-600/80 border-indigo-400 hover:bg-indigo-500",
  },
  {
    id: "asset-2",
    type: "video" as const,
    name: "Video_Clip_02.mp4",
    duration_frames: 60,
    color: "bg-emerald-600/80 border-emerald-400 hover:bg-emerald-500",
  },
  {
    id: "asset-3",
    type: "audio" as const,
    name: "Audio_Track.wav",
    duration_frames: 300,
    color: "bg-amber-600/80 border-amber-400 hover:bg-amber-500",
  },
];
