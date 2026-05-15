import { createServer } from "http";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@workspace/shared";
import { env } from "./config/env.js";
import { socketAdapter } from "./redis/adapter.js";
import { startRealtimeSubscriber } from "./redis/subscriber.js";
import { authMiddleware } from "./socket/auth.middleware.js";
import { registerConnection } from "./socket/connection.js";
import type { AppServer } from "./socket/types.js";

/**
 * Standalone Socket.io server. Deploys separately from the Vercel app
 * (Fly.io / Railway / Render — anywhere that runs a long-lived process).
 * Responsibilities: auth the connection, manage presence + rooms, bridge
 * Redis fan-out to clients. Zero business logic lives here.
 */
const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io: AppServer = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: { origin: env.CORS_ORIGIN, credentials: true },
  transports: ["websocket", "polling"],
});

io.adapter(socketAdapter);
io.use(authMiddleware);
io.on("connection", (socket) => registerConnection(io, socket));

startRealtimeSubscriber(io);

httpServer.listen(env.PORT, () => {
  console.log(`[socket-server] listening on :${env.PORT}`);
});

const shutdown = () => {
  console.log("[socket-server] shutting down...");
  io.close(() => process.exit(0));
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
