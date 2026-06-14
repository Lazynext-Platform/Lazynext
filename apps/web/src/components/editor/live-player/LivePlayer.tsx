import React from "react";

/**
 * LivePlayer Component integrated from Twick React SDK.
 */
export const LivePlayer: React.FC = () => {
	return (
		<div className="w-full flex justify-center p-2 bg-gray-800">
			<button className="px-4 py-2 bg-blue-600 rounded">Play</button>
			<button className="px-4 py-2 bg-gray-700 rounded ml-2">Pause</button>
		</div>
	);
};
