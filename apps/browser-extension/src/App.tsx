/** @module App Root application component for browser extension */
import { useState, useEffect } from "react";
import { performCaptcha } from "./captcha";

async function getApiGatewayUrl(): Promise<string> {
  const stored = (await chrome.storage.local.get("apiGatewayUrl")) as {
    apiGatewayUrl?: string;
  };
  return stored.apiGatewayUrl || "http://localhost:8005";
}

async function getAuthToken(): Promise<string | null> {
  const stored = (await chrome.storage.local.get("authToken")) as {
    authToken?: string;
  };
  return stored.authToken || null;
}

function safeDisplayName(src: string): string {
  try {
    return new URL(src).pathname.split("/").pop() || src.substring(0, 30);
  } catch {
    // blob:, relative, or empty URLs
    if (src.startsWith("blob:")) return "(blob media)";
    if (!src) return "(embedded)";
    return src.substring(0, 30);
  }
}

/** Root app: detects video elements on the current page, offers import to Lazynext. */
function App() {
  const [detectedVideos, setDetectedVideos] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    // Detect <video> elements on the current page
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) return;

        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const videos = document.querySelectorAll("video");
            return Array.from(videos).map((v, i) => ({
              id: `video-${i}`,
              src: v.src || v.querySelector("source")?.src || "Embedded video",
              currentTime: v.currentTime,
              duration: v.duration,
            }));
          },
        });

        const data = results[0]?.result as Array<{ id: string; src: string }> | undefined;
        if (data && data.length > 0) {
          setDetectedVideos(data.map((v: { src: string }) => v.src));
        }
      } catch (err) {
        // No videos found or can't access page
      }
    })();
  }, []);

  const handleImport = async (videoSrc: string) => {
    setImporting(true);
    setStatus(`Importing "${videoSrc.substring(0, 40)}..."`);

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("No active tab");

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (src) => {
          const video = Array.from(document.querySelectorAll("video")).find(
            (v) => v.src === src || v.querySelector(`source[src="${src}"]`),
          );
          if (video) {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 360;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              return {
                thumbnailUrl: canvas.toDataURL("image/jpeg", 0.8),
                source: src,
                duration: video.duration,
                width: canvas.width,
                height: canvas.height,
              };
            }
          }
          return null;
        },
        args: [videoSrc],
      });

      const capture = results[0]?.result as {
        thumbnailUrl: string;
        source: string;
        duration: number;
        width: number;
        height: number;
      } | null;

      if (capture) {
        // Send to Lazynext web app / api-gateway for ingestion
        const apiUrl = await getApiGatewayUrl();
        const token = await getAuthToken();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const captchaToken = await performCaptcha();
        if (captchaToken) {
          headers["X-Captcha-Token"] = captchaToken;
        }
        
        try {
          const resp = await fetch(`${apiUrl}/api/v1/ai/ingest`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              url: capture.source,
              source: "browser-extension",
              thumbnail: capture.thumbnailUrl,
              duration: capture.duration,
              width: capture.width,
              height: capture.height,
            }),
          });
          if (resp.ok) {
            setStatus(
              `✓ Imported ${capture.width}×${capture.height} frame to Lazynext timeline.`,
            );
          } else {
            setStatus(`⚠️ Lazynext API returned ${resp.status}. Retry when connected.`);
          }
        } catch {
          // Fallback: store locally in extension storage for later import
          const stored = (await chrome.storage.local.get("pendingImports")) as {
            pendingImports?: unknown[];
          };
          const pending = (stored.pendingImports || []) as unknown[];
          pending.push({
            source: capture.source,
            thumbnail: capture.thumbnailUrl,
            duration: capture.duration,
            width: capture.width,
            height: capture.height,
            capturedAt: Date.now(),
          });
          await chrome.storage.local.set({ pendingImports: pending });
          setStatus(
            `✓ Captured ${capture.width}×${capture.height} frame (queued for import). Open Lazynext to sync.`,
          );
        }
      } else {
        setStatus("Could not capture — video may be DRM-protected.");
      }
    } catch (err) {
      setStatus("Failed to access page. Try refreshing.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        backgroundColor: "rgba(24,24,27,0.5)",
        backdropFilter: "blur(16px)",
        width: "320px",
        minHeight: "240px",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "24px",
        color: "white",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <h1
        style={{
          fontSize: "20px",
          margin: 0,
          fontWeight: 700,
          letterSpacing: "-0.5px",
        }}
      >
        LAZYNEXT<span style={{ color: "#00e5ff" }}>.</span>
      </h1>

      {detectedVideos.length > 0 ? (
        <>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", margin: 0 }}>
            {detectedVideos.length} video{detectedVideos.length > 1 ? "s" : ""} detected
          </p>

          {detectedVideos.slice(0, 5).map((src) => (
            <div
              key={src}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(255,255,255,0.05)",
                borderRadius: "10px",
                padding: "8px 12px",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.8)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "160px",
                }}
                title={src}
              >
                {safeDisplayName(src)}
              </span>
              <button
                onClick={() => handleImport(src)}
                disabled={importing}
                style={{
                  background: "#00e5ff",
                  color: "#050505",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: importing ? "wait" : "pointer",
                  boxShadow: "0 2px 8px rgba(0,229,255,0.3)",
                  opacity: importing ? 0.6 : 1,
                }}
              >
                Import
              </button>
            </div>
          ))}
        </>
      ) : (
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", margin: 0 }}>
          No videos detected on this page.
          <br />
          Navigate to a page with video content and try again.
        </p>
      )}

      {status && (
        <p
          style={{
            fontSize: "12px",
            color: status.startsWith("✓") ? "#10b981" : "#f59e0b",
            margin: 0,
            padding: "8px 12px",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "8px",
          }}
        >
          {status}
        </p>
      )}

      <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          onClick={async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
              chrome.tabs.sendMessage(tab.id, { type: "INJECT_OVERLAY" });
              window.close(); // Close the popup after launching
            }
          }}
          style={{
            background: "rgba(0, 229, 255, 0.1)",
            color: "#00e5ff",
            border: "1px solid rgba(0, 229, 255, 0.3)",
            padding: "10px",
            borderRadius: "8px",
            fontWeight: 700,
            cursor: "pointer",
            width: "100%",
          }}
        >
          Launch Lazynext AI Agent (Overlay)
        </button>
      </div>

      <div
        style={{
          marginTop: "16px",
          fontSize: "11px",
          color: "rgba(255,255,255,0.3)",
          textAlign: "center",
        }}
      >
        Lazynext Browser Extension v0.1
      </div>
    </div>
  );
}

export default App;
