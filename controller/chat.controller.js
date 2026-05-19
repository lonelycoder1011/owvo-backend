import httpStatus from "http-status";
import mongoose from "mongoose";
import AppError from "../errors/AppError.js";
import { Booking } from "../model/booking.model.js";
import { ChatMessage } from "../model/chatMessage.model.js";
import catchAsync from "../utils/catch.Async.js";
import sendResponse from "../utils/sendResponse.js";

const toMessagePayload = (message) => ({
  id: message._id?.toString(),
  bookingId: message.booking?.toString(),
  senderId: message.sender?._id?.toString() || message.sender?.toString(),
  senderName: message.sender?.name || "",
  recipientId:
    message.recipient?._id?.toString() || message.recipient?.toString(),
  recipientName: message.recipient?.name || "",
  text: message.text,
  createdAt: message.createdAt,
});

export const getBookingMessages = catchAsync(async (req, res) => {
  const { bookingId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid bookingId");
  }

  const booking = await Booking.findById(bookingId).select("user provider");
  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, "Booking not found");
  }

  const requesterId = req.user._id.toString();
  const isParticipant =
    booking.user.toString() === requesterId ||
    booking.provider.toString() === requesterId;

  if (!isParticipant && req.user.role !== "admin") {
    throw new AppError(httpStatus.FORBIDDEN, "Access denied");
  }

  const messages = await ChatMessage.find({ booking: booking._id })
    .populate("sender", "name email photo")
    .populate("recipient", "name email photo")
    .sort({ createdAt: 1 })
    .lean();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Chat messages fetched successfully",
    data: messages.map(toMessagePayload),
  });
});
