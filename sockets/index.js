import { handleJoinRooms } from './rooms.js';
import { handleConnectionEvents } from './connection.js';
import { handleMessageEvents } from './message.js';
import { setIO } from './io.js';

export default function(io) {
  setIO(io);
  io.on('connection', (socket) => {
    handleJoinRooms(socket, io);
    handleConnectionEvents(socket, io);
    handleMessageEvents(socket, io);
    // Add more handlers as needed
  });
}