"use client";

import { useRef, useEffect, useState } from "react";
import type { ScopeType } from "@/types/editor";

interface VideoScopesProps {
  isPlaying: boolean;
  frame: number;
}

export function VideoScopes({ isPlaying, frame }: VideoScopesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scopeType, setScopeType] = useState<ScopeType>("parade");

  useEffect(() => {
    let animationFrame: number;
    const drawScope = () => {
      const scopeCanvas = canvasRef.current;
      if (!scopeCanvas) return;
      const ctx = scopeCanvas.getContext("2d");
      if (!ctx) return;

      const sourceCanvas = document.getElementById(
        "lazynext-canvas",
      ) as HTMLCanvasElement | null;
      if (sourceCanvas && sourceCanvas.width > 0 && sourceCanvas.height > 0) {
        const sampleWidth = 120;
        const sampleHeight = 120;
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = sampleWidth;
        tempCanvas.height = sampleHeight;
        const tempCtx = tempCanvas.getContext("2d");
        if (tempCtx) {
          tempCtx.drawImage(sourceCanvas, 0, 0, sampleWidth, sampleHeight);
          const imageData = tempCtx.getImageData(
            0,
            0,
            sampleWidth,
            sampleHeight,
          );
          const data = imageData.data;

          ctx.fillStyle = "#09090b";
          ctx.fillRect(0, 0, scopeCanvas.width, scopeCanvas.height);
          ctx.globalAlpha = 0.4;

          if (scopeType === "parade") {
            const sectionWidth = scopeCanvas.width / 3;
            for (let x = 0; x < sampleWidth; x++) {
              for (let y = 0; y < sampleHeight; y++) {
                const idx = (y * sampleWidth + x) * 4;
                const r = data[idx]!;
                const g = data[idx + 1]!;
                const b = data[idx + 2]!;

                const targetX_R = (x / sampleWidth) * sectionWidth;
                const targetX_G = sectionWidth + (x / sampleWidth) * sectionWidth;
                const targetX_B =
                  sectionWidth * 2 + (x / sampleWidth) * sectionWidth;

                ctx.fillStyle = "#ef4444";
                ctx.fillRect(
                  targetX_R,
                  scopeCanvas.height - (r / 255) * scopeCanvas.height,
                  1,
                  1,
                );
                ctx.fillStyle = "#22c55e";
                ctx.fillRect(
                  targetX_G,
                  scopeCanvas.height - (g / 255) * scopeCanvas.height,
                  1,
                  1,
                );
                ctx.fillStyle = "#3b82f6";
                ctx.fillRect(
                  targetX_B,
                  scopeCanvas.height - (b / 255) * scopeCanvas.height,
                  1,
                  1,
                );
              }
            }
          } else if (scopeType === "waveform") {
            for (let x = 0; x < sampleWidth; x++) {
              for (let y = 0; y < sampleHeight; y++) {
                const idx = (y * sampleWidth + x) * 4;
                const r = data[idx]!;
                const g = data[idx + 1]!;
                const b = data[idx + 2]!;
                const luma = 0.299 * r + 0.587 * g + 0.114 * b;
                const targetX = (x / sampleWidth) * scopeCanvas.width;
                ctx.fillStyle = "white";
                ctx.fillRect(
                  targetX,
                  scopeCanvas.height - (luma / 255) * scopeCanvas.height,
                  1,
                  1,
                );
              }
            }
          } else if (scopeType === "vectorscope") {
            ctx.strokeStyle = "#333";
            ctx.beginPath();
            ctx.moveTo(scopeCanvas.width / 2, 0);
            ctx.lineTo(scopeCanvas.width / 2, scopeCanvas.height);
            ctx.moveTo(0, scopeCanvas.height / 2);
            ctx.lineTo(scopeCanvas.width, scopeCanvas.height / 2);
            ctx.stroke();

            for (let i = 0; i < data.length; i += 16) {
              const r = data[i]!;
              const g = data[i + 1]!;
              const b = data[i + 2]!;
              const cb = -0.168736 * r - 0.331264 * g + 0.5 * b;
              const cr = 0.5 * r - 0.418688 * g - 0.081312 * b;
              const cx =
                scopeCanvas.width / 2 + (cb / 128) * (scopeCanvas.width / 2);
              const cy =
                scopeCanvas.height / 2 - (cr / 128) * (scopeCanvas.height / 2);
              ctx.fillStyle = `rgb(${r},${g},${b})`;
              ctx.fillRect(cx, cy, 1, 1);
            }
          }

          ctx.globalAlpha = 1.0;
        }
      }

      if (isPlaying) {
        animationFrame = requestAnimationFrame(drawScope);
      }
    };

    drawScope();

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [isPlaying, frame, scopeType]);

  return (
    <div className="w-full bg-zinc-950 border border-zinc-700 rounded relative">
      <div className="absolute top-1 left-2 z-20">
        <select
          value={scopeType}
          onChange={(e) => setScopeType(e.target.value as ScopeType)}
          className="bg-transparent text-[10px] text-zinc-400 uppercase font-bold outline-none cursor-pointer hover:text-white"
        >
          <option value="parade">RGB Parade</option>
          <option value="waveform">Waveform</option>
          <option value="vectorscope">Vectorscope</option>
        </select>
      </div>
      {scopeType === "parade" && (
        <>
          <div className="absolute top-1 left-2 mt-4 text-[8px] text-red-500 font-bold z-10">
            R
          </div>
          <div className="absolute top-1 left-1/3 ml-2 text-[8px] text-green-500 font-bold z-10">
            G
          </div>
          <div className="absolute top-1 left-2/3 ml-2 text-[8px] text-blue-500 font-bold z-10">
            B
          </div>
          <div className="absolute top-0 bottom-0 left-1/3 w-px bg-zinc-800 z-10 pointer-events-none" />
          <div className="absolute top-0 bottom-0 left-2/3 w-px bg-zinc-800 z-10 pointer-events-none" />
        </>
      )}
      <canvas
        ref={canvasRef}
        width={240}
        height={120}
        className="w-full h-[120px] relative z-0"
      />
    </div>
  );
}
