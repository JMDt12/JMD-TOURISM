import { io } from 'socket.io-client';

/**
 * Live tracking needs a long-lived connection straight to the API server.
 * Static hosts like Vercel can forward ordinary /api requests but not
 * WebSockets, so a hosted build names the server in VITE_SOCKET_URL. Unset,
 * it connects to the page's own origin, which the Vite dev proxy forwards.
 */
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;

export const connectSocket = () => io(SOCKET_URL, { transports: ['websocket', 'polling'] });
