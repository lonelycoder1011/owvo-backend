import httpStatus from "http-status";
import AppError from "../errors/AppError.js";
import catchAsync from "../utils/catch.Async.js";
import sendResponse from "../utils/sendResponse.js";
import { Coupon } from "../model/coupon.model.js";
import { generateCouponCode } from "../utils/generate.CouponCode.js";

export const createCoupon = catchAsync(async (req, res) => {
  const { couponName, discountPercentage, expiresAt, allowedPostalCodes } =
    req.body;

  if (!couponName || !discountPercentage) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Coupon name and discount percentage are required",
    );
  }

  if (discountPercentage < 1 || discountPercentage > 100) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Discount must be between 1 and 100",
    );
  }

  if (
    !allowedPostalCodes ||
    !Array.isArray(allowedPostalCodes) ||
    allowedPostalCodes.length === 0
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "At least one allowed postal code is required",
    );
  }

  let couponCode;
  let isUnique = false;

  while (!isUnique) {
    couponCode = generateCouponCode();
    const existing = await Coupon.findOne({ couponCode });
    if (!existing) isUnique = true;
  }

  const coupon = await Coupon.create({
    couponName,
    couponCode,
    discountPercentage,
    expiresAt,
    allowedPostalCodes: allowedPostalCodes.map((code) =>
      code.toUpperCase().trim(),
    ),
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Coupon created successfully",
    data: coupon,
  });
});

export const getAllCoupons = catchAsync(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Coupons retrieved successfully",
    data: coupons,
  });
});

export const applyCoupon = catchAsync(async (req, res) => {
  const { couponCode } = req.body;

  if (!couponCode) {
    throw new AppError(httpStatus.BAD_REQUEST, "Coupon code is required");
  }

  const coupon = await Coupon.findOne({
    couponCode: couponCode.toUpperCase(),
    isActive: true,
  });

  if (!coupon) {
    throw new AppError(httpStatus.NOT_FOUND, "Invalid coupon code");
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    throw new AppError(httpStatus.BAD_REQUEST, "Coupon has expired");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Coupon applied successfully",
    data: {
      discountPercentage: coupon.discountPercentage,
    },
  });
});
