function App() {
  const handleCapture = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => alert('Capturing clip from this page!'),
      });
    }
  };

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h1 style={{ fontSize: '20px', margin: 0, fontWeight: 600 }}>Lazynext Companion</h1>
      <p style={{ fontSize: '14px', color: '#a1a1aa' }}>
        Capture footage directly from your browser to your editing timeline.
      </p>
      <button 
        onClick={handleCapture}
        style={{
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '10px 16px',
          borderRadius: '6px',
          fontWeight: 600,
          cursor: 'pointer',
          marginTop: 'auto'
        }}
      >
        Clip this Page
      </button>
    </div>
  );
}

export default App;
