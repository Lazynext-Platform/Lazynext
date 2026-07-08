/** @module overlay Overlay component for browser extension */
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

interface Project {
  /** Unique project identifier. */
  id: string;
  /** Display name of the project. */
  name: string;
}

interface TimelineClip {
  /** Unique clip identifier. */
  id: string;
  /** Clip media type. */
  type: string;
  /** Clip source reference. */
  source: string;
  /** Clip duration in seconds. */
  duration?: number;
}

async function getAuthToken(): Promise<string | null> {
  try {
    const result = (await chrome.storage.local.get("authToken")) as {
      authToken?: string;
    };
    return result.authToken || null;
  } catch {
    return null;
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = await getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/** Compact timeline preview showing current project clips with drag-and-drop reordering. */
function TimelinePreview() {
  const [clips, setClips] = useState<TimelineClip[]>([]);

  useEffect(() => {
    const loadClips = () => {
      chrome.storage.local.get(["timelineClips"], (result) => {
        if (result.timelineClips) {
          setClips(result.timelineClips as TimelineClip[]);
        }
      });
    };
    loadClips();
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string,
    ) => {
      if (areaName === "local" && changes.timelineClips) {
        setClips((changes.timelineClips.newValue as TimelineClip[]) || []);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  if (clips.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "10px",
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid #333",
        borderRadius: "6px",
      }}
    >
      <span style={{ fontSize: "11px", fontWeight: 600, color: "#888" }}>
        Timeline ({clips.length} clip{clips.length !== 1 ? "s" : ""})
      </span>
      {clips.map((clip) => (
        <div
          key={clip.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "12px",
            color: "#ccc",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "2px",
              background: clip.type === "video" ? "#00e5ff" : "#ffaa00",
            }}
          />
          {clip.type} — {clip.source}
          {clip.duration != null ? ` (${clip.duration}s)` : ""}
        </div>
      ))}
    </div>
  );
}

/** Primary overlay editor: project selection, clip capture, and gateway submission. */
function OverlayEditor() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<string>("");

  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Fetch projects from API gateway. Falls back to empty list if unreachable.
    const gatewayUrl =
      typeof chrome !== "undefined" && chrome.storage
        ? (async () => {
            const stored = await chrome.storage.local.get('apiGatewayUrl');
            return stored?.apiGatewayUrl || 'http://localhost:8005';
          })()
        : Promise.resolve('http://localhost:8005');

    gatewayUrl.then(async (baseUrl) => {
      const headers = await authHeaders();
      fetch(`${baseUrl}/api/v1/projects`, { headers })
        .then((res) => res.json())
        .then((data) => {
          if (data?.projects) {
            setProjects(data.projects);
            if (data.projects.length > 0) {
              setSelectedProjectId(data.projects[0].id);
            }
          }
        })
        .catch(() => {
          // API gateway unreachable — show empty state
          setProjects([]);
        });
    });

    // Connect WebSocket to API Gateway with auth token
    let socketActive = true;
    const connectWs = async () => {
      const token = await getAuthToken();
      if (!socketActive) return;
      const wsUrl = token
        ? `ws://localhost:8005/ws/extension?token=${encodeURIComponent(token)}`
        : "ws://localhost:8005/ws/extension";
      const socket = new WebSocket(wsUrl);
      socket.onopen = () => {
        console.log("[Extension] Connected to Lazynext WebSocket");
      };
      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "SYNC_STATUS") {
            setStatus("Synced with Desktop.");
          }
        } catch(e) {}
      };
      socket.onerror = () => {
        console.warn("[Extension] WebSocket connection failed. Using fallback REST APIs.");
      };
      setWs(socket);
    };
    connectWs();

    return () => {
      socketActive = false;
      if (ws) {
        ws.close();
      }
    };

  }, []);

  const handleRecord = () => {
    if (!selectedProjectId) return;
    setIsRecording(true);
    setStatus("Recording started...");
    
    // Send message to content script to start recording
    window.parent.postMessage({ type: "RECORD_VIDEO", projectId: selectedProjectId }, "https://lazynext.com");
    
    // Auto-stop recording after 10s for demo
    setTimeout(() => {
      setIsRecording(false);
      setStatus("Recording saved to project!");
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "ADD_CLIP",
          projectId: selectedProjectId,
          payload: { type: "video", source: "extension-record", duration: 10 }
        }));
      }
    }, 10000);
  };

  const handleExtract = () => {
    window.parent.postMessage({ type: "EXTRACT_VIDEO" }, "https://lazynext.com");
    setStatus("Extracting video assets from page...");
    
    // Simulate sending an edit intent over WebSocket
    if (ws && ws.readyState === WebSocket.OPEN && selectedProjectId) {
      ws.send(JSON.stringify({
        type: "AUTONOMOUS_EDIT",
        projectId: selectedProjectId,
        prompt: "Extract videos from current page and add to timeline"
      }));
    }
  };

  return (
    <div style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      backgroundColor: "rgba(15, 15, 15, 0.98)", color: "#fff",
      fontFamily: "system-ui, -apple-system, sans-serif", borderTop: "2px solid #00e5ff",
      boxShadow: "0 -8px 30px rgba(0, 0, 0, 0.5)"
    }}>
      <div style={{ padding: "12px 16px", backgroundColor: "#1e1e1e", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: "16px", color: "#00e5ff", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
          Lazynext Extension
        </h3>
        <button 
          onClick={() => window.parent.postMessage({ type: "CLOSE_OVERLAY" }, "https://lazynext.com")}
          style={{ background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: "16px", padding: "4px 8px" }}>
          ✕
        </button>
      </div>

      <div style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ fontSize: "14px", fontWeight: "600", color: "#aaa" }}>Select Target Project</label>
          <select 
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{ 
              padding: "10px", backgroundColor: "#252525", color: "#fff", border: "1px solid #444", 
              borderRadius: "6px", fontSize: "14px", outline: "none" 
            }}
          >
            {projects.length === 0 ? <option value="">Loading projects...</option> : null}
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
          <button 
            onClick={handleRecord}
            disabled={isRecording || !selectedProjectId}
            style={{ 
              padding: "12px", background: isRecording ? "#ff4444" : "#00e5ff", color: isRecording ? "#fff" : "#000", 
              border: "none", borderRadius: "6px", fontWeight: "bold", cursor: isRecording ? "default" : "pointer",
              display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", transition: "background 0.2s"
            }}>
            {isRecording ? (
              <>
                <span style={{ display: "inline-block", width: "10px", height: "10px", background: "#fff", borderRadius: "50%", animation: "pulse 1.5s infinite" }} />
                Recording (10s limit)
              </>
            ) : "🔴 Record Stream to Project"}
          </button>
          
          <button 
            onClick={handleExtract}
            style={{ 
              padding: "12px", background: "#2a2a2a", color: "#fff", 
              border: "1px solid #444", borderRadius: "6px", cursor: "pointer",
              transition: "background 0.2s"
            }}>
            Extract Videos on Page
          </button>
        </div>
        
        {status && (
          <div style={{ 
            marginTop: "auto", padding: "12px", background: "rgba(0, 229, 255, 0.1)", 
            borderLeft: "3px solid #00e5ff", color: "#00e5ff", fontSize: "13px", borderRadius: "4px" 
          }}>
            {status}
          </div>
        )}

        <TimelinePreview />

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
          <label style={{ fontSize: "14px", fontWeight: "600", color: "#00e5ff" }}>Lazynext AI Agent</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input 
              type="text" 
              id="ai-prompt"
              placeholder="e.g. 'Extract all videos'" 
              style={{
                flex: 1, padding: "10px", backgroundColor: "#252525", color: "#fff", 
                border: "1px solid #00e5ff", borderRadius: "6px", fontSize: "14px", outline: "none"
              }}
            />
            <button 
              onClick={async () => {
                const prompt = (document.getElementById("ai-prompt") as HTMLInputElement).value;
                if (!prompt) return;
                
                setStatus("Processing AI command...");
                try {
                  const gatewayUrl = await chrome.storage.local.get("apiGatewayUrl")
                    .then(r => r.apiGatewayUrl || "http://localhost:8005");
                  const headers = await authHeaders();
                  const resp = await fetch(`${gatewayUrl}/api/v1/autonomous_edit`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({ prompt, require_plan_approval: false }),
                  });
                  const data = await resp.json();
                  setStatus(`AI Command Processed: ${data.message || data.error || "OK"}`);
                  
                  if (ws && ws.readyState === WebSocket.OPEN && selectedProjectId) {
                    ws.send(JSON.stringify({
                      type: "CRDT_SYNC",
                      projectId: selectedProjectId,
                      payload: data
                    }));
                  }
                } catch (e) {
                  setStatus(`Error: ${e}`);
                }
              }}
              style={{ 
                padding: "10px 16px", background: "#00e5ff", color: "#000", 
                border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold"
              }}>
              Apply
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<OverlayEditor />);
}
