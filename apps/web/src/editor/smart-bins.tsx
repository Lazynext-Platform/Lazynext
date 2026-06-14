import React, { useState } from "react";

export function SmartBinsPanel() {
	// MOCK data returned from the NeuralEngineService
	const [smartBins, setSmartBins] = useState([
		{ actorName: "Tom Cruise", clips: ["MI_Take1.mp4", "MI_Take3.mp4"] },
		{ actorName: "Henry Cavill", clips: ["MI_Take2.mp4", "MI_Take3.mp4"] },
	]);

	return (
		<div className="p-4 bg-gray-900 text-white h-full border-r border-gray-700">
			<h2 className="text-xl font-bold mb-4">🧠 Neural Smart Bins</h2>
			<button className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded mb-6 w-full text-sm font-semibold">
				Auto-Analyze Footage
			</button>

			<div className="space-y-4">
				{smartBins.map((bin, index) => (
					<div key={index} className="bg-gray-800 p-3 rounded">
						<h3 className="font-semibold text-blue-300">📁 {bin.actorName}</h3>
						<ul className="text-sm mt-2 space-y-1 text-gray-400 pl-4">
							{bin.clips.map((clip, i) => (
								<li key={i} className="hover:text-white cursor-pointer">
									📄 {clip}
								</li>
							))}
						</ul>
					</div>
				))}
			</div>
		</div>
	);
}
