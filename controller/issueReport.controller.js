import httpStatus from "http-status";
import mongoose from "mongoose";
import AppError from "../errors/AppError.js";
import catchAsync from "../utils/catch.Async.js";
import sendResponse from "../utils/sendResponse.js";
import { Booking } from "../model/booking.model.js";
import { IssueReport } from "../model/issueReport.model.js";

const photoFromFile = (file) => {
  if (!file) return undefined;

  return {
    public_id: file.filename || "",
    url: file.path || "",
  };
};

export const createIssueReport = catchAsync(async (req, res) => {
  const { bookingId, reportedUserId, description } = req.body || {};
  const trimmedDescription = description?.toString().trim();

  if (!trimmedDescription) {
    throw new AppError(httpStatus.BAD_REQUEST, "Report description is required");
  }

  let booking = null;
  let reportedUser = reportedUserId || null;

  if (bookingId) {
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid bookingId");
    }

    booking = await Booking.findById(bookingId).select("user provider");
    if (!booking) {
      throw new AppError(httpStatus.NOT_FOUND, "Booking not found");
    }

    const requesterId = req.user._id.toString();
    const customerId = booking.user?.toString();
    const providerId = booking.provider?.toString();

    if (requesterId !== customerId && requesterId !== providerId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You can only report issues for your own bookings"
      );
    }

    if (!reportedUser) {
      reportedUser = requesterId === customerId ? providerId : customerId;
    }
  }

  if (reportedUser && !mongoose.Types.ObjectId.isValid(reportedUser)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid reportedUserId");
  }

  const report = await IssueReport.create({
    reporter: req.user._id,
    reporterRole: req.user.role,
    booking: booking?._id || null,
    reportedUser,
    description: trimmedDescription,
    photo: photoFromFile(req.file),
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Issue report submitted successfully",
    data: report,
  });
});
