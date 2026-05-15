import { createAdapter } from "@socket.io/redis-adapter";
import { pubClient, subClient } from "./client.js";

/**
 * socket.io Redis adapter. Lets multiple socket-server instances share
 * rooms — a broadcast from any instance reaches sockets connected to all
 * others. This is what makes the WS tier horizontally scalable.
 */
export const socketAdapter = createAdapter(pubClient, subClient);
