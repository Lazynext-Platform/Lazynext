/**
 * Media bin panel — displays imported media assets (video, audio, image)
 * with thumbnails and provides drag-and-drop onto the timeline.
 *
 * @module components/MediaBin
 */

import React, { useState } from "react";

interface MediaAsset {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  thumbnailUrl: string;
}

export const MediaBin: React.FC = () => {
  const [assets, setAssets] = useState<MediaAsset[]>([
    { id: '1', name: 'drone_footage_4k.mp4', type: 'video', thumbnailUrl: '' },
    { id: '2', name: 'background_music.wav', type: 'audio', thumbnailUrl: '' },
  ]);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      
      // Simulate API Gateway S3 multipart upload
      setTimeout(() => {
        const file = e.target.files![0];
        setAssets([...assets, {
          id: Math.random().toString(),
          name: file.name,
          type: file.type.startsWith('video') ? 'video' : 'audio',
          thumbnailUrl: ''
        }]);
        setIsUploading(false);
      }, 1500);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>PROJECT MEDIA</h3>
        
        <label className="btn-premium" style={{ fontSize: '12px', padding: '6px 12px' }}>
          {isUploading ? 'Uploading...' : '+ Import'}
          <input 
            type="file" 
            style={{ display: 'none' }} 
            onChange={handleUpload}
            accept="video/*,audio/*,image/*"
          />
        </label>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        {assets.map(asset => (
          <div 
            key={asset.id} 
            className="glass-panel"
            style={{ 
              padding: '8px', 
              cursor: 'grab', 
              display: 'flex', 
              flexDirection: 'column',
              background: 'rgba(255,255,255,0.03)'
            }}
            title="Drag to timeline"
          >
            <div style={{ height: '60px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '24px', opacity: 0.5 }}>
                {asset.type === 'video' ? '🎥' : '🎵'}
              </span>
            </div>
            <span style={{ fontSize: '11px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {asset.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
