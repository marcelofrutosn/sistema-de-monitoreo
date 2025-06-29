// backend/src/services/websocket.service.ts
import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

let io: SocketIOServer;

export const registerWebSocketServer = (server: HTTPServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("📡 Cliente Socket.IO conectado:", socket.id);

    socket.on("disconnect", () => {
      console.log("❌ Cliente Socket.IO desconectado:", socket.id);
    });
  });
};

// Emitir una nueva medición a todos los clientes conectados
export const broadcast = (data: any) => {
  if (io) {
    io.emit("nueva-medicion", data);
  }
};
