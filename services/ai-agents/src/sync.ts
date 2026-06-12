import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

export function setupSyncServer(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // For dev. In prod, lock this down.
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Sync] Editor connected: ${socket.id}`);

    // Editor joins a specific project room
    socket.on('join_project', (projectId: string) => {
      socket.join(projectId);
      console.log(`[Sync] ${socket.id} joined project: ${projectId}`);
      // Notify others in room that a new peer joined for WebRTC
      socket.to(projectId).emit('peer-joined', socket.id);
    });

    // WebRTC Signaling
    socket.on('webrtc-offer', ({ target, offer }) => {
      socket.to(target).emit('webrtc-offer', {
        caller: socket.id,
        offer
      });
    });

    socket.on('webrtc-answer', ({ target, answer }) => {
      socket.to(target).emit('webrtc-answer', {
        caller: socket.id,
        answer
      });
    });

    socket.on('webrtc-ice-candidate', ({ target, candidate }) => {
      socket.to(target).emit('webrtc-ice-candidate', {
        caller: socket.id,
        candidate
      });
    });

    // Receive a CRDT delta from an editor and broadcast it
    socket.on('crdt_delta', (data: { projectId: string; delta: string }) => {
      // Broadcast to everyone else in the project
      socket.to(data.projectId).emit('crdt_delta', data);
    });

    socket.on('disconnect', () => {
      console.log(`[Sync] Editor disconnected: ${socket.id}`);
      socket.rooms.forEach(room => {
        socket.to(room).emit('peer-left', socket.id);
      });
    });
  });

  console.log('[Sync] WebSocket CRDT Server initialized.');
}
