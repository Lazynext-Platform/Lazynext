import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { createHmac } from "crypto";

/**
 * Verify a JWT token signed with BETTER_AUTH_SECRET.
 *
 * better-auth uses HS256 JWTs. This is a lightweight verification
 * that avoids pulling in a full JWT library for this service.
 * In production, use `jose` or `jsonwebtoken` npm package.
 */
function verifyToken(token: string): { sub: string; email: string; role: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const secret = process.env.BETTER_AUTH_SECRET || "";

    // Recompute the signature and compare
    const signingInput = `${headerB64}.${payloadB64}`;
    const expectedSig = createHmac("sha256", secret)
      .update(signingInput)
      .digest("base64url");

    if (expectedSig !== signatureB64) {
      console.warn("[Sync] JWT signature mismatch");
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8"),
    ) as { sub: string; email: string; role?: string; exp: number };

    // Check expiration
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      console.warn("[Sync] JWT expired");
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role || "user",
    };
  } catch {
    return null;
  }
}

export function setupSyncServer(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? "https://lazynext.com"
          : ["http://localhost:3000", "http://localhost:3001"],
      methods: ["GET", "POST"],
    },
    // Require authentication on every connection
    allowRequest: async (req, callback) => {
      // Health-check / handshake probes from K8s don't need auth
      if (req.url?.startsWith("/socket.io/?EIO=") && !req.headers.authorization && !req.headers.cookie) {
        // Allow initial polling handshake (auth is enforced on the
        // `connection` event below via the `auth` handshake object)
        return callback(null, true);
      }
      callback(null, true);
    },
  });

  // Auth middleware — validate the token sent in the handshake `auth` field
  io.use((socket, next) => {
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

    // Attach user info to the socket for downstream use
    (socket as any).__user = user;
    console.log(`[Sync] Authenticated ${user.email} (${socket.id})`);
    next();
  });

  io.on("connection", (socket) => {
    const user = (socket as any).__user as { sub: string; email: string; role: string };
    console.log(`[Sync] Editor connected: ${socket.id} (${user.email})`);

    // Editor joins a specific project room
    socket.on("join_project", (projectId: string) => {
      socket.join(projectId);
      console.log(`[Sync] ${user.email} joined project: ${projectId}`);
      // Notify others in room that a new peer joined for WebRTC
      socket.to(projectId).emit("peer-joined", {
        peerId: socket.id,
        email: user.email,
      });
    });

    // WebRTC Signaling
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

    // Receive a CRDT delta from an editor and broadcast it
    socket.on("crdt_delta", (data: { projectId: string; delta: string }) => {
      // Broadcast to everyone else in the project
      socket.to(data.projectId).emit("crdt_delta", {
        ...data,
        sender: user.email,
      });
    });

    socket.on("disconnect", () => {
      console.log(`[Sync] Editor disconnected: ${socket.id} (${user.email})`);
      socket.rooms.forEach((room) => {
        socket.to(room).emit("peer-left", {
          peerId: socket.id,
          email: user.email,
        });
      });
    });
  });

  console.log("[Sync] WebSocket CRDT Server initialized (auth required).");
}
