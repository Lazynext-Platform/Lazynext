/**
 * Export delivery panel — format/quality selection, render settings,
 * and export triggers for video delivery.
 *
 * @module components/editor/panels/export-delivery
 */

import { useState } from "react";
import { Download, Film, AudioWaveform, MonitorUp } from "lucide-react";
import { toast } from "sonner";
import { usePostHog } from "posthog-js/react";
import { dispatchExport } from "../../../export/dispatch";

/** React component rendering ExportDelivery. */
export function ExportDelivery({
	projectData,
	onQueueRender,
}: {
	projectData: any;
	onQueueRender?: (format: string, jobId: string) => void;
}) {
	const [format, setFormat] = useState("mp4");
	const [preset, setPreset] = useState("youtube-4k");
	const [isExporting, setIsExporting] = useState(false);
	const [renderProgress, setRenderProgress] = useState<number | null>(null);
	const [renderStatus, setRenderStatus] = useState<string | null>(null);
	const posthog = usePostHog();

	const handleExport = async () => {
		setIsExporting(true);
		setRenderProgress(0);
		setRenderStatus("queued");

		try {
			if (format === "mp4" || format === "webm") {
				// Local WASM Render
				const durationFrames = (projectData.duration || 10) * (projectData.framerate || 60);
				const fps = projectData.framerate || 60;
				const width = projectData.width || 1920;
				const height = 1080;
				
				const blob = await dispatchExport(width, height, durationFrames, fps, (progress) => {
					setRenderProgress(progress * 100);
				});
				
				setRenderStatus("completed");
				setIsExporting(false);
				toast.success("Render complete! Your video is ready.");
				
				// Trigger download
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `export_${projectData.id}.${format === 'webm' ? 'webm' : 'mp4'}`;
				a.click();
				URL.revokeObjectURL(url);
			} else {
				// Dispatch to Render Farm Microservice for AAF, XML, DCP, ProRes
				const res = await fetch("http://localhost:8003/api/v1/jobs", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ projectId: projectData.id, format }),
				});

				if (!res.ok) throw new Error("Failed to queue job");

				const data = await res.json();

				posthog?.capture("export_queued", {
					format: format,
					preset: preset,
					projectId: projectData.id,
				});

				if (onQueueRender && data.jobId) {
					onQueueRender(format, data.jobId);
				}

				toast.success(
					`Successfully queued project as ${format.toUpperCase()} on Render Farm!`,
				);

				const eventSource = new EventSource(
					`http://localhost:8003/api/v1/jobs/${data.jobId}/stream`,
				);

				eventSource.onmessage = (event) => {
					try {
						const job = JSON.parse(event.data);
						setRenderProgress(job.progress);
						setRenderStatus(job.status);

						if (job.status === "completed") {
							eventSource.close();
							setIsExporting(false);
							toast.success("Render complete! Your video is ready.");
						} else if (job.status === "failed") {
							eventSource.close();
							setIsExporting(false);
							toast.error("Render job failed.");
						}
					} catch (e) {
						console.error("SSE parse error:", e);
					}
				};

				eventSource.onerror = () => {
					eventSource.close();
					setIsExporting(false);
				};
			}
		} catch (err) {
			console.error(err);
			toast.error(
				"Failed to export video. Check console for details.",
			);
			setIsExporting(false);
			setRenderProgress(null);
			setRenderStatus(null);
		}
	};

	return (
		<div className="absolute inset-0 bg-background flex p-4 gap-4 z-40 overflow-hidden">
			{/* Left Sidebar: Render Settings */}
			<div className="w-[400px] flex flex-col bg-background border border-border rounded-xl overflow-hidden h-full shadow-2xl">
				<div className="flex items-center px-4 h-14 border-b border-border bg-background/80">
					<Download className="w-5 h-5 text-indigo-400 mr-2" />
					<span className="text-sm font-bold text-foreground tracking-wider">
						DELIVER
					</span>
				</div>

				<div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 custom-scrollbar">
					<div>
						<h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">
							Professional Roundtrip
						</h3>
						<div className="grid grid-cols-2 gap-2 mb-4">
							<button
								onClick={() => {
									setFormat("aaf");
									setPreset("protools");
								}}
								className={`flex flex-col items-center justify-center py-4 border rounded-lg transition-colors ${format === "aaf" ? "bg-indigo-600/20 border-indigo-500 text-indigo-300" : "bg-background border-border text-muted hover:border-zinc-600 hover:text-foreground"}`}
							>
								<AudioWaveform className="w-6 h-6 mb-2" />
								<span className="text-[10px] font-bold">ProTools (.AAF)</span>
							</button>
							<button
								onClick={() => {
									setFormat("fcpxml");
									setPreset("premiere");
								}}
								className={`flex flex-col items-center justify-center py-4 border rounded-lg transition-colors ${format === "fcpxml" ? "bg-indigo-600/20 border-indigo-500 text-indigo-300" : "bg-background border-border text-muted hover:border-zinc-600 hover:text-foreground"}`}
							>
								<Film className="w-6 h-6 mb-2" />
								<span className="text-[10px] font-bold">
									FCPX / Premiere (.XML)
								</span>
							</button>
						</div>

						<h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-3">
							Video Export
						</h3>
						<div className="grid grid-cols-3 gap-2">
							<button
								onClick={() => setFormat("mp4")}
								className={`py-2 text-[10px] font-bold rounded border ${format === "mp4" ? "bg-blue-600/20 border-blue-500 text-blue-300" : "bg-background border-border text-muted"}`}
							>
								H.265 / MP4
							</button>
							<button
								onClick={() => setFormat("mov")}
								className={`py-2 text-[10px] font-bold rounded border ${format === "mov" ? "bg-blue-600/20 border-blue-500 text-blue-300" : "bg-background border-border text-muted"}`}
							>
								ProRes / MOV
							</button>
							<button
								onClick={() => setFormat("dcp")}
								className={`py-2 text-[10px] font-bold rounded border ${format === "dcp" ? "bg-blue-600/20 border-blue-500 text-blue-300" : "bg-background border-border text-muted"}`}
							>
								Cinema DCP
							</button>
						</div>
					</div>

					<div className="space-y-4">
						<div>
							<label htmlFor="export-resolution" className="text-[10px] font-medium text-muted block mb-1">
								Resolution
							</label>
							<select id="export-resolution" className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-indigo-500">
								<option>3840 x 2160 Ultra HD</option>
								<option>1920 x 1080 HD</option>
								<option>4096 x 2160 DCI 4K</option>
							</select>
						</div>
						<div>
							<div className="text-[10px] font-medium text-muted block mb-1">
								Hardware Output / SDI
							</div>
							<div className="flex items-center gap-2 bg-background border border-border p-2 rounded">
								<MonitorUp className="w-4 h-4 text-muted" />
								<span className="text-[10px] text-muted">
									DeckLink 8K Pro (Not Detected)
								</span>
							</div>
						</div>
					</div>
				</div>

				<div className="p-4 border-t border-border bg-background">
					{renderProgress !== null && (
						<div className="mb-4">
							<div className="flex justify-between items-center mb-2">
								<span className="text-xs font-bold text-muted uppercase tracking-wider">
									{renderStatus === "completed"
										? "Render Complete"
										: renderStatus === "failed"
											? "Render Failed"
											: "Rendering..."}
								</span>
								<span className="text-xs font-mono text-foreground">
									{Math.round(renderProgress)}%
								</span>
							</div>
							<div className="w-full bg-panel rounded-full h-2 overflow-hidden">
								<div
									className={`h-full transition-all duration-300 rounded-full ${
										renderStatus === "completed"
											? "bg-emerald-500"
											: renderStatus === "failed"
												? "bg-red-500"
												: "bg-indigo-500"
									}`}
									style={{ width: `${renderProgress}%` }}
								/>
							</div>
						</div>
					)}
					<button
						onClick={handleExport}
						disabled={isExporting}
						className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-foreground font-bold tracking-wider rounded-lg shadow-lg transition-colors"
					>
						{isExporting
							? "RENDERING..."
							: renderStatus === "completed"
								? "RENDER AGAIN"
								: "ADD TO RENDER QUEUE"}
					</button>
				</div>
			</div>

			{/* Right Area: Timeline Overview */}
			<div className="flex-1 bg-background border border-border rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
				<div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-zinc-900 to-zinc-950"></div>
				<div className="z-10 text-center">
					<Film className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
					<h2 className="text-xl font-bold text-muted mb-2">
						Export Preparation
					</h2>
					<p className="text-sm text-zinc-600 max-w-sm mx-auto">
						Your timeline contains{" "}
						{projectData.tracks?.reduce(
							(acc: number, track: any) => acc + (track.clips?.length || 0),
							0,
						) || 0}{" "}
						clips across {projectData.tracks?.length || 0} tracks.
					</p>
				</div>
			</div>
		</div>
	);
}
