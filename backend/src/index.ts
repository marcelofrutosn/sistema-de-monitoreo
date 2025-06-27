import express from "express";
import http from "http";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";

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

// Conectar a la base de datos
connectDB();

// Rutas API
app.use("/api/auth", authRoutes);
app.use("/api/mediciones", medicionRoutes);

// Servir frontend desde la carpeta 'public' (Vite build)
const __dirnameGlobal = path.resolve(); // importante para ES Modules
app.use(express.static(path.join(__dirnameGlobal, "public")));

app.get("*", (_, res) => {
  res.sendFile(path.join(__dirnameGlobal, "public", "index.html"));
});

// WebSocket
registerWebSocketServer(server);

// Start
server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
