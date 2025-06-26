// backend/src/index.ts
import express from "express";
import http from "http";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import connectDB from "./config/db";
import medicionRoutes from "./routes/medicion.routes";
import authRoutes from "./routes/auth.routes";

import { registerWebSocketServer } from "./services/websocket.service";
import { globalAuthGuard } from "./middleware/auth.guard";

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// DB
connectDB();

// Middleware de autenticación global (antes de las rutas)
app.use(globalAuthGuard);

// Rutas
app.use("/api/mediciones", medicionRoutes);
app.use("/api/auth", authRoutes);

// WebSocket
registerWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
