import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import AppError from "../errors/AppError.js";
import { User } from "./../model/user.model.js";
import catchAsync from "../utils/catch.Async.js";

export const protect = catchAsync(async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    throw new AppError(httpStatus.UNAUTHORIZED,"Token not found");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded._id);

    if (!user) {
      throw new AppError(httpStatus.UNAUTHORIZED,"User not found");
    }

    if (!(await User.isOTPVerified(user._id))) {
      throw new AppError(httpStatus.FORBIDDEN, "User not verified");
    }

    req.user = user;
    next();
  } catch (err) {
    throw new AppError(httpStatus.UNAUTHORIZED,"Invalid token");
  }
})

export const isAdmin = catchAsync(async(req, res, next) => {
  if (req.user?.role !== "admin") {
    throw new AppError(403, "Access denied. You are not an admin.");
  }
  next();
})

export const isProvider =catchAsync(async (req, res, next) => {
  if (req.user?.role !== "provider") {
    throw new AppError(403,"Access denied. You are not a provider.");
  }
  next();
})
