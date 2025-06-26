// backend/src/services/websocket.service.ts
import { Server } from "ws";

let wss: Server;

export const registerWebSocketServer = (server: any) => {
  wss = new Server({ server });

  wss.on("connection", (ws) => {
    console.log("📡 Cliente WebSocket conectado");
  });
};

export const broadcast = (data: any) => {
  if (!wss) return;
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
};
