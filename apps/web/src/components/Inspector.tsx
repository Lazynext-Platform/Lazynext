import React, { useState } from 'react';

export const Inspector: React.FC = () => {
  const [lumaThreshold, setLumaThreshold] = useState<number>(0.2);
  const [lumaTolerance, setLumaTolerance] = useState<number>(0.1);
  const [scale, setScale] = useState<number>(1.0);

  return (
    <div className="glass-panel" style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>INSPECTOR</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Transform Group */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-primary)' }}>Transform</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Scale</span>
              <input 
                type="range" 
                min="0.1" max="3.0" step="0.1" 
                value={scale} 
                onChange={e => setScale(parseFloat(e.target.value))}
                style={{ width: '100px' }}
              />
              <span style={{ fontSize: '11px', width: '20px', textAlign: 'right' }}>{scale.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', width: '100%' }} />

        {/* Compositing Group */}
        <div>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-primary)' }}>Luma Keying</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Threshold</span>
              <input 
                type="range" 
                min="0.0" max="1.0" step="0.01" 
                value={lumaThreshold} 
                onChange={e => setLumaThreshold(parseFloat(e.target.value))}
                style={{ width: '100px' }}
              />
              <span style={{ fontSize: '11px', width: '24px', textAlign: 'right' }}>{lumaThreshold.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Tolerance</span>
              <input 
                type="range" 
                min="0.0" max="1.0" step="0.01" 
                value={lumaTolerance} 
                onChange={e => setLumaTolerance(parseFloat(e.target.value))}
                style={{ width: '100px' }}
              />
              <span style={{ fontSize: '11px', width: '24px', textAlign: 'right' }}>{lumaTolerance.toFixed(2)}</span>
            </div>
            
          </div>
        </div>
        
      </div>
    </div>
  );
};
