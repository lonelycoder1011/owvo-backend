import { Server } from "socket.io";
import mongoose from "mongoose";
import { Booking } from "../model/booking.model.js";
import { ChatMessage } from "../model/chatMessage.model.js";

let io;

// userId -> Set<socketId>. Multiple live sockets can exist during reconnects.
const connectedUsers = new Map();

const normalizeUserId = (userId) =>
  userId === undefined || userId === null ? "" : userId.toString().trim();

const getHandshakeUserId = (socket) =>
  normalizeUserId(
    socket.handshake.auth?.userId ||
      socket.handshake.query?.userId ||
      socket.handshake.headers?.userid ||
      socket.handshake.headers?.userId
  );

const addSocketForUser = (userId, socket) => {
  const key = normalizeUserId(userId);
  if (!key) return 0;

  const previousUserId = socket.data.userId;
  if (previousUserId && previousUserId !== key) {
    removeSocketForUser(previousUserId, socket.id);
    socket.leave(previousUserId);
  }

  const sockets = connectedUsers.get(key) || new Set();
  sockets.add(socket.id);
  connectedUsers.set(key, sockets);
  socket.data.userId = key;
  socket.join(key);
  return sockets.size;
};

const removeSocketForUser = (userId, socketId) => {
  const key = normalizeUserId(userId);
  const sockets = connectedUsers.get(key);

  if (!sockets) {
    return 0;
  }

  sockets.delete(socketId);
  if (sockets.size === 0) {
    connectedUsers.delete(key);
  }

  return sockets.size;
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const handshakeUserId = getHandshakeUserId(socket);

    if (handshakeUserId) {
      const socketCount = addSocketForUser(handshakeUserId, socket);
      console.log(
        `Socket connected | userId=${handshakeUserId} socketId=${socket.id} sockets=${socketCount}`
      );
    } else {
      console.log(`Socket connected without userId | socketId=${socket.id}`);
    }

    socket.on("register", (payload = {}) => {
      const userId = normalizeUserId(payload.userId);
      if (!userId) return;

      const socketCount = addSocketForUser(userId, socket);
      console.log(
        `Socket registered | userId=${userId} socketId=${socket.id} sockets=${socketCount}`
      );
    });

    socket.on("ping", () => socket.emit("pong"));

    socket.on("chat_message", async (payload = {}, ack) => {
      const senderId = normalizeUserId(payload.senderId || socket.data.userId);
      const recipientId = normalizeUserId(
        payload.recipientId || payload.providerId || payload.userId
      );
      const text = (payload.text || payload.message || "").toString().trim();
      const bookingId = normalizeUserId(payload.bookingId);

      if (!senderId || !recipientId || !text) return;

      let message = {
        id: payload.id || `${Date.now()}-${socket.id}`,
        bookingId,
        senderId,
        recipientId,
        text,
        createdAt: new Date().toISOString(),
      };

      if (
        mongoose.Types.ObjectId.isValid(bookingId) &&
        mongoose.Types.ObjectId.isValid(senderId) &&
        mongoose.Types.ObjectId.isValid(recipientId)
      ) {
        try {
          const booking = await Booking.findById(bookingId)
            .select("user provider")
            .lean();

          const participants = booking
            ? [booking.user.toString(), booking.provider.toString()]
            : [];

          if (
            !booking ||
            !participants.includes(senderId) ||
            !participants.includes(recipientId)
          ) {
            if (typeof ack === "function") {
              ack({ success: false, message: "Invalid chat participants" });
            }
            return;
          }

          const doc = await ChatMessage.create({
            booking: bookingId,
            sender: senderId,
            recipient: recipientId,
            participants: [senderId, recipientId],
            text,
          });

          message = {
            id: doc._id.toString(),
            bookingId: doc.booking.toString(),
            senderId: doc.sender.toString(),
            recipientId: doc.recipient.toString(),
            text: doc.text,
            createdAt: doc.createdAt.toISOString(),
          };
        } catch (error) {
          console.error("Failed to persist chat message", error);
        }
      }

      emitToUser(recipientId, "chat_message", message);
      emitToUser(senderId, "chat_message", message);

      if (typeof ack === "function") {
        ack({ success: true, data: message });
      }
    });

    socket.on("disconnect", (reason) => {
      const userId = socket.data.userId;
      if (userId) {
        const socketCount = removeSocketForUser(userId, socket.id);
        console.log(
          `Socket disconnected | userId=${userId} socketId=${socket.id} remaining=${socketCount} reason=${reason}`
        );
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialised - call initSocket first.");
  return io;
};

export const emitToUser = (userId, event, data) => {
  if (!io) return;

  const key = normalizeUserId(userId);
  const socketIds = connectedUsers.get(key);
  if (socketIds?.size) {
    socketIds.forEach((socketId) => io.to(socketId).emit(event, data));
    console.log(`Emitted [${event}] -> userId=${key} sockets=${socketIds.size}`);
  } else {
    console.log(`[${event}] user ${key} is not connected via socket`);
  }
};

export const broadcast = (event, data) => {
  if (!io) return;
  io.emit(event, data);
};

export default { initSocket, getIO, emitToUser, broadcast };
