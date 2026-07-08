/**
 * CRDT sync and WebRTC signaling server over Socket.IO.
 *
 * Provides:
 *   - JWT-authenticated WebSocket connections (HS256 via better-auth)
 *   - Project-room-based CRDT delta broadcasting
 *   - WebRTC signaling relay for P2P media streaming
 *   - Autonomous AI-to-timeline CRDT patch injection
 *   - Project membership validation on room joins
 */

import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";

/** Resolve the Better Auth HS256 secret from env, Docker secret file, or dev fallback. */
function getSecret(): string {
	const envSecret = process.env.BETTER_AUTH_SECRET;
	if (envSecret && envSecret.length >= 32) return envSecret;

	const filePath = process.env.BETTER_AUTH_SECRET_FILE;
	if (filePath) {
		const { readFileSync } = require("fs");
		const content = readFileSync(filePath, "utf-8").trim();
		if (content && content.length >= 32) return content;
		throw new Error(
			`FATAL: BETTER_AUTH_SECRET_FILE is set to '${filePath}' but the file is empty or unreadable.`,
		);
	}

	if (process.env.NODE_ENV === "production") {
		throw new Error(
			"FATAL: BETTER_AUTH_SECRET must be set in production. " +
			"Set it to a 64-char random hex string.",
		);
	}

	return "lazynext-dev-secret-key-for-auth-minimum-64-chars-sync";
}

interface AuthUser {
	/** Subject (user) identifier. */
	sub: string;
	/** User email address. */
	email: string;
	/** User role. */
	role: string;
	/** Token expiry timestamp. */
	exp: number;
}

/** Verify a JWT token and return parsed claims, or null on failure. */
function verifyToken(token: string): AuthUser | null {
	try {
		const secret = getSecret();
		const decoded = jwt.verify(token, secret, {
			algorithms: ["HS256"],
		}) as AuthUser;
		if (!decoded.sub || !decoded.email) return null;
		return decoded;
	} catch {
		return null;
	}
}

let ioInstance: SocketIOServer | null = null;
const projectMemberships = new Map<string, Set<string>>();

/**
 * Initialize the Socket.IO sync server on an existing HTTP server.
 *
 * Configures CORS, JWT auth middleware, room-based CRDT broadcasting,
 * and WebRTC signaling relay. Clients must provide a valid HS256 JWT
 * token signed by better-auth during the handshake.
 */
export function setupSyncServer(httpServer: HttpServer) {
	ioInstance = new SocketIOServer(httpServer, {
		cors: {
			origin:
				process.env.NODE_ENV === "production"
					? "https://lazynext.com"
					: ["http://localhost:3000", "http://localhost:3001"],
			methods: ["GET", "POST"],
		},
		allowRequest: async (req, callback) => {
			callback(null, true);
		},
		pingInterval: 25000,
		pingTimeout: 20000,
	});

	ioInstance.use((socket, next) => {
		const token = socket.handshake.auth?.token as string | undefined;
		if (!token) {
			console.warn(`[Sync] Rejected connection: no auth token (${socket.id})`);
			return next(new Error("Authentication required"));
		}

		const user = verifyToken(token);
		if (!user) {
			console.warn(`[Sync] Rejected connection: invalid token (${socket.id})`);
			return next(new Error("Invalid authentication token"));
		}

		(socket as any).__user = user;
		console.log(`[Sync] Authenticated ${user.email} (${socket.id})`);
		next();
	});

	ioInstance.on("connection", (socket) => {
		const user = (socket as any).__user as AuthUser;
		console.log(`[Sync] Editor connected: ${socket.id} (${user.email})`);

		socket.on("join_project", (projectId: string) => {
			const members = projectMemberships.get(projectId);
			if (members && !members.has(user.sub)) {
				console.warn(
					`[Sync] Rejected: ${user.email} tried to join project ${projectId} without membership`,
				);
				socket.emit("join_error", { error: "Not a member of this project" });
				return;
			}

			if (!projectMemberships.has(projectId)) {
				projectMemberships.set(projectId, new Set([user.sub]));
			} else {
				projectMemberships.get(projectId)!.add(user.sub);
			}

			socket.join(projectId);
			console.log(`[Sync] ${user.email} joined project: ${projectId}`);
			socket.to(projectId).emit("peer-joined", {
				peerId: socket.id,
				email: user.email,
			});
		});

		socket.on("grant_project_access", (projectId: string) => {
			if (!projectMemberships.has(projectId)) {
				projectMemberships.set(projectId, new Set());
			}
			projectMemberships.get(projectId)!.add(user.sub);
		});

		socket.on("webrtc-offer", ({ target, offer }) => {
			socket.to(target).emit("webrtc-offer", {
				caller: socket.id,
				offer,
			});
		});

		socket.on("webrtc-answer", ({ target, answer }) => {
			socket.to(target).emit("webrtc-answer", {
				caller: socket.id,
				answer,
			});
		});

		socket.on("webrtc-ice-candidate", ({ target, candidate }) => {
			socket.to(target).emit("webrtc-ice-candidate", {
				caller: socket.id,
				candidate,
			});
		});

		socket.on("crdt_delta", (data: { projectId: string; delta: string }) => {
			socket.to(data.projectId).emit("crdt_delta", {
				...data,
				sender: user.email,
			});
		});

		socket.on("disconnect", () => {
			console.log(`[Sync] Editor disconnected: ${socket.id} (${user.email})`);
			socket.rooms.forEach((room) => {
				if (room !== socket.id) {
					socket.to(room).emit("peer-left", {
						peerId: socket.id,
						email: user.email,
					});
				}
			});
		});
	});

	console.log("[Sync] WebSocket CRDT Server initialized (auth required).");
}

export function broadcastCrdtPatch(projectId: string, patch: any) {
	if (ioInstance) {
		console.log(
			`[Sync] Broadcasting autonomous AI CRDT patch to project ${projectId}`,
		);
		ioInstance.to(projectId).emit("crdt_delta", {
			projectId,
			delta: JSON.stringify(patch),
			sender: "AI_AGENT",
		});
	}
}
