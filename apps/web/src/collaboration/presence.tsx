import React from "react";

interface CursorPosition {
    x: number;
    y: number;
    userId: string;
    color: string;
}

export function MultiplayerPresence({ cursors }: { cursors: CursorPosition[] }) {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
            {cursors.map((cursor) => (
                <div
                    key={cursor.userId}
                    className="absolute flex items-center transition-all duration-100 ease-linear"
                    style={{ left: cursor.x, top: cursor.y }}
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M5.5 3L18.5 11L12.5 13L10.5 19L5.5 3Z"
                            fill={cursor.color}
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <span
                        className="ml-2 px-2 py-1 text-xs font-bold text-white rounded shadow-md"
                        style={{ backgroundColor: cursor.color }}
                    >
                        {cursor.userId}
                    </span>
                </div>
            ))}
        </div>
    );
}
