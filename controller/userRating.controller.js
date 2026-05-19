import httpStatus from "http-status";
import AppError from "../errors/AppError.js";
import { Booking } from "../model/booking.model.js";
import { User } from "../model/user.model.js";
import { UserRating } from "../model/userRating.model.js";
import catchAsync from "../utils/catch.Async.js";
import sendResponse from "../utils/sendResponse.js";

const refreshCustomerRatingStats = async (userId) => {
  const stats = await UserRating.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: "$user",
        averageRating: { $avg: "$rating" },
        totalRatings: { $sum: 1 },
      },
    },
  ]);

  const stat = stats[0] || { averageRating: 0, totalRatings: 0 };
  await User.findByIdAndUpdate(userId, {
    customerRatingAverage: Number((stat.averageRating || 0).toFixed(1)),
    customerRatingCount: stat.totalRatings || 0,
  });
};

export const createUserRating = catchAsync(async (req, res) => {
  const providerId = req.user._id;
  const { bookingId, rating, review } = req.body;
  const ratingValue = Number(rating);

  if (!bookingId) {
    throw new AppError(httpStatus.BAD_REQUEST, "bookingId is required");
  }

  if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
    throw new AppError(httpStatus.BAD_REQUEST, "Rating must be between 1 and 5");
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError(httpStatus.NOT_FOUND, "Booking not found");
  }

  if (String(booking.provider) !== String(providerId)) {
    throw new AppError(httpStatus.FORBIDDEN, "Access denied");
  }

  if (booking.status !== "completed") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "You can rate the user only after booking is completed"
    );
  }

  const doc = await UserRating.findOneAndUpdate(
    { booking: booking._id },
    {
      booking: booking._id,
      provider: providerId,
      user: booking.user,
      rating: ratingValue,
      review: review?.trim() || "",
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await refreshCustomerRatingStats(booking.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User rating submitted successfully",
    data: doc,
  });
});
