/** @module Timeline component with scrubber playhead and clip tracks */
import React, { useState, useRef } from 'react';

// Types mapped from Rust's lazynext_core::engine
interface Clip {
  /** Unique clip identifier. */
  id: string;
  /** Human-readable clip name. */
  name: string;
  /** Start frame on the timeline. */
  start: number;
  /** End frame on the timeline. */
  end: number;
}

export const Timeline: React.FC = () => {
  const [clips, _setClips] = useState<Clip[]>([
    { id: 'clip_1', name: 'Intro Sequence', start: 0, end: 120 },
    { id: 'clip_2', name: 'Main Action', start: 120, end: 360 },
  ]);
  
  const [currentFrame, setCurrentFrame] = useState(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  
  const handleScrub = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const frame = Math.max(0, Math.floor((x / rect.width) * 500)); // 500 frames max for demo
    setCurrentFrame(frame);
    
    // In production, this would emit to the WebSocket / CRDT engine
    // wsmiddleware.publish({ type: 'SEEK', frame });
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1) { // Left click drag
      handleScrub(e);
    }
  };

  return (
    <div 
      className="glass-panel" 
      style={{ padding: '16px', marginTop: 'auto', height: '200px', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>TIMELINE</h3>
        <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>Frame: {currentFrame}</span>
      </div>
      
      <div 
        ref={timelineRef}
        onMouseDown={handleScrub}
        onMouseMove={handleMouseMove}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            setCurrentFrame((f) => Math.max(0, f - 1));
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            setCurrentFrame((f) => Math.min(500, f + 1));
          }
        }}
        role="slider"
        tabIndex={0}
        aria-label="Timeline scrubber"
        aria-valuenow={currentFrame}
        aria-valuemin={0}
        aria-valuemax={500}
        style={{ 
          position: 'relative', 
          flex: 1, 
          background: 'rgba(0,0,0,0.3)', 
          borderRadius: '8px',
          overflow: 'hidden',
          cursor: 'text'
        }}
      >
        {/* Playhead Scrubber */}
        <div 
          className="scrubber-head" 
          style={{ left: `${(currentFrame / 500) * 100}%` }}
        />
        
        {/* Track 1 */}
        <div style={{ position: 'relative', height: '50px', borderBottom: '1px solid var(--border-subtle)', padding: '5px 0' }}>
          {clips.map(clip => (
            <div 
              key={clip.id}
              className="clip-item"
              style={{
                left: `${(clip.start / 500) * 100}%`,
                width: `${((clip.end - clip.start) / 500) * 100}%`,
                top: '5px'
              }}
            >
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {clip.name}
              </span>
            </div>
          ))}
        </div>
        
        {/* Track 2 */}
        <div style={{ position: 'relative', height: '50px', padding: '5px 0' }}>
          {/* Audio or overlay clips could go here */}
        </div>
      </div>
    </div>
  );
};
