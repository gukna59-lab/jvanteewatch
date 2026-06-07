import { io, Socket } from 'socket.io-client';

// Use same host, port depends on if it's deployed or not. For dev/cloud run, root path is fine.
const URL = window.location.origin;

export const socket: Socket = io(URL, {
  autoConnect: false, // We connect when needed
});
