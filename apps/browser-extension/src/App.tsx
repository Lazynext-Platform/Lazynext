function App() {
	const handleCapture = async () => {
		const [tab] = await chrome.tabs.query({
			active: true,
			currentWindow: true,
		});
		if (tab && tab.id) {
			await chrome.scripting.executeScript({
				target: { tabId: tab.id },
				func: () => alert("Capturing clip from this page!"),
			});
		}
	};

	return (
		<div
			style={{
				padding: "20px",
				display: "flex",
				flexDirection: "column",
				gap: "16px",
				backgroundColor: "rgba(24,24,27,0.5)",
				backdropFilter: "blur(16px)",
				width: "300px",
				height: "200px",
				border: "1px solid rgba(255,255,255,0.08)",
				borderRadius: "24px",
				color: "white",
			}}
		>
			<h1 style={{ fontSize: "20px", margin: 0, fontWeight: 700 }}>
				LAZYNEXT<span style={{ color: "#00e5ff" }}>.</span>
			</h1>
			<p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>
				Capture footage directly from your browser to your editing timeline.
			</p>
			<button
				onClick={handleCapture}
				style={{
					background: "#00e5ff",
					color: "#050505",
					border: "none",
					padding: "12px 16px",
					borderRadius: "12px",
					fontWeight: 700,
					cursor: "pointer",
					marginTop: "auto",
					boxShadow: "0 4px 12px rgba(0,229,255,0.3)",
				}}
			>
				Clip this Page
			</button>
		</div>
	);
}

export default App;
