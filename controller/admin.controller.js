import httpStatus from "http-status";
import { User } from "../model/user.model.js";
import AppError from "../errors/AppError.js";
import sendResponse from "../utils/sendResponse.js";
import catchAsync from "../utils/catch.Async.js";

export const getAllUsers = catchAsync(async (req, res) => {
  const users = await User.find().select(
    "-password -refreshToken -verificationInfo.token"
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All users fetched successfully",
    data: users,
  });
});

export const getAllProviders = catchAsync(async (req, res) => {
  const providers = await User.find({ role: "provider" });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All providers fetched successfully",
    data: providers,
  });
});

export const changeUserRole = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!["user", "admin", "provider"].includes(role)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid role");
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  user.role = role;
  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User role updated successfully",
    data: user,
  });
});

export const deleteUser = catchAsync(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findByIdAndDelete(userId);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User deleted successfully",
  });
});
