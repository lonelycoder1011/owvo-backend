import fs from "fs";
import path from "path";
import httpStatus from "http-status";
import mongoose from "mongoose";
import AppError from "../errors/AppError.js";
import { Booking } from "../model/booking.model.js";
import { ChatMessage } from "../model/chatMessage.model.js";
import { DataRequest } from "../model/dataRequest.model.js";
import { IssueReport } from "../model/issueReport.model.js";
import { paymentInfo } from "../model/payment.model.js";
import { Rating } from "../model/rating.model.js";
import { Receipt } from "../model/receipt.model.js";
import { User } from "../model/user.model.js";
import { UserRating } from "../model/userRating.model.js";
import { Vehicle } from "../model/vehicle.model.js";
import catchAsync from "../utils/catch.Async.js";
import sendResponse from "../utils/sendResponse.js";
import { emitToUser } from "../socket/socket.js";

const UPLOADS_ROOT = path.resolve(process.cwd(), "uploads");
const DATA_EXPORT_SNAPSHOT_VERSION = "2026-07-13-readable-v1";

const toObjectId = (value) =>
  value instanceof mongoose.Types.ObjectId
    ? value
    : new mongoose.Types.ObjectId(value);

const compactRequest = (request) => {
  const data = request.toObject ? request.toObject() : { ...request };
  if (data.status !== "approved") {
    data.exportData = null;
  }
  return data;
};

const removeLocalUpload = (storedUrl = "") => {
  const value = storedUrl.toString().trim();
  if (!value.startsWith("/uploads/")) return;

  const resolved = path.resolve(process.cwd(), value.replace(/^\/+/, ""));
  if (!resolved.startsWith(UPLOADS_ROOT)) return;

  try {
    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
    }
  } catch {
    // Deletion should continue even if an old local file is already gone.
  }
};

const removeUserLocalUploads = (user) => {
  const urls = [
    user?.photo?.url,
    user?.identityVerification?.idFile?.url,
    user?.identityVerification?.passportOrDrivingLicenseFile?.url,
    user?.insurance?.document?.url,
    user?.publicLiabilityInsurance?.document?.url,
    user?.drivewayPhoto?.document?.url,
  ];

  urls.filter(Boolean).forEach(removeLocalUpload);
};
const personSelect = "_id name fullName email role phoneNumber photo";
const serviceSelect = "_id title price serviceType carSize carName carModel";
const vehicleSelect = "_id registrationNo make model year size image isDefault";
const bookingSelect =
  "_id user provider service vehicle vehicleSnapshot price discountPrice finalPrice address postalCode bookingDate payment status cancellationReason cancelledBy cancelledAt isRated currency completedAt arrivedAt washEndsAt createdAt updatedAt";
const bookingPopulate = [
  { path: "user", select: personSelect },
  { path: "provider", select: personSelect },
  { path: "service", select: serviceSelect },
  { path: "vehicle", select: vehicleSelect },
];
const getRatingSnapshot = async (id, role) => {
  const Model = role === "provider" ? Rating : UserRating;
  const field = role === "provider" ? "provider" : "user";
  const rows = await Model.aggregate([
    { $match: { [field]: id } },
    {
      $group: {
        _id: `$${field}`,
        averageRating: { $avg: "$rating" },
        totalRatings: { $sum: 1 },
      },
    },
  ]);
  const stat = rows[0] || { averageRating: 0, totalRatings: 0 };

  return {
    averageRating: Number((stat.averageRating || 0).toFixed(1)),
    totalRatings: stat.totalRatings || 0,
  };
};

const hydrateProfileForExport = async (profile, id) => {
  if (!profile) return profile;

  const ratingSnapshot = await getRatingSnapshot(id, profile.role);
  return {
    ...profile,
    customerRatingAverage: ratingSnapshot.averageRating,
    customerRatingCount: ratingSnapshot.totalRatings,
  };
};

export const buildUserDataExport = async (userId) => {
  const id = toObjectId(userId);

  const [
    profile,
    vehicles,
    bookings,
    payments,
    reports,
    chatMessages,
    providerRatings,
    customerRatings,
    receipts,
  ] = await Promise.all([
    User.findById(id)
      .select("-password -refreshToken -verificationInfo.token -password_reset_token")
      .populate("preferredServices", serviceSelect)
      .populate("adminVerification.reviewedBy", personSelect)
      .populate("enforcement.updatedBy", personSelect)
      .lean(),
    Vehicle.find({ user: id }).sort({ createdAt: -1 }).lean(),
    Booking.find({ $or: [{ user: id }, { provider: id }] })
      .populate(bookingPopulate)
      .sort({ createdAt: -1 })
      .lean(),
    paymentInfo.find({ $or: [{ userId: id }, { providerId: id }] })
      .populate("userId", personSelect)
      .populate("providerId", personSelect)
      .populate({ path: "bookingId", select: bookingSelect, populate: bookingPopulate })
      .sort({ createdAt: -1 })
      .lean(),
    IssueReport.find({ $or: [{ reporter: id }, { reportedUser: id }] })
      .populate("reporter", personSelect)
      .populate("reportedUser", personSelect)
      .populate({ path: "booking", select: bookingSelect, populate: bookingPopulate })
      .populate("assignedTo", personSelect)
      .populate("updatedBy", personSelect)
      .sort({ createdAt: -1 })
      .lean(),
    ChatMessage.find({ $or: [{ sender: id }, { recipient: id }, { participants: id }] })
      .populate({ path: "booking", select: bookingSelect, populate: bookingPopulate })
      .populate("sender", personSelect)
      .populate("recipient", personSelect)
      .populate("participants", personSelect)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean(),
    Rating.find({ $or: [{ user: id }, { provider: id }] })
      .populate("user", personSelect)
      .populate("provider", personSelect)
      .populate({ path: "booking", select: bookingSelect, populate: bookingPopulate })
      .sort({ createdAt: -1 })
      .lean(),
    UserRating.find({ $or: [{ user: id }, { provider: id }] })
      .populate("user", personSelect)
      .populate("provider", personSelect)
      .populate({ path: "booking", select: bookingSelect, populate: bookingPopulate })
      .sort({ createdAt: -1 })
      .lean(),
    Receipt.find({ $or: [{ user: id }, { provider: id }] })
      .populate("user", personSelect)
      .populate("provider", personSelect)
      .populate("service", serviceSelect)
      .populate({ path: "booking", select: bookingSelect, populate: bookingPopulate })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const hydratedProfile = await hydrateProfileForExport(profile, id);

  return {
    generatedAt: new Date(),
    snapshotVersion: DATA_EXPORT_SNAPSHOT_VERSION,
    retentionPolicy:
      "OWVO keeps operational account, booking, support, payment and verification records for up to 6 months unless a longer period is required by law, fraud prevention, dispute handling, tax, accounting, or safety obligations.",
    profile: hydratedProfile,
    vehicles,
    bookings,
    payments,
    reports,
    chatMessages,
    providerRatings,
    customerRatings,
    receipts,
  };
};

const ensureReadableExportSnapshot = async (request) => {
  if (!request || request.status !== "approved") return request;
  if (request.exportData?.snapshotVersion === DATA_EXPORT_SNAPSHOT_VERSION) {
    return request;
  }

  request.exportData = await buildUserDataExport(request.user);
  request.exportGeneratedAt = new Date();
  await request.save();
  return request;
};

export const createDataRequest = catchAsync(async (req, res) => {
  if (!["user", "provider"].includes(req.user?.role)) {
    throw new AppError(httpStatus.FORBIDDEN, "Only app users can request their data.");
  }

  const existingPending = await DataRequest.findOne({
    user: req.user._id,
    status: "pending",
  });

  if (existingPending) {
    if (!existingPending.exportData || existingPending.exportData.snapshotVersion !== DATA_EXPORT_SNAPSHOT_VERSION) {
      existingPending.exportData = await buildUserDataExport(req.user._id);
      existingPending.exportGeneratedAt = existingPending.exportGeneratedAt || new Date();
      await existingPending.save();
    }

    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Your data request is already pending review.",
      data: compactRequest(existingPending),
    });
  }

  const exportData = await buildUserDataExport(req.user._id);
  const request = await DataRequest.create({
    user: req.user._id,
    requesterRole: req.user.role,
    requestNote: req.body?.requestNote?.toString().trim() || "",
    exportData,
    exportGeneratedAt: new Date(),
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Data request submitted successfully.",
    data: compactRequest(request),
  });
});

export const getMyDataRequests = catchAsync(async (req, res) => {
  const requests = await DataRequest.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20);
  const repairedRequests = await Promise.all(
    requests.map(ensureReadableExportSnapshot)
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Data requests fetched successfully.",
    data: repairedRequests.map(compactRequest),
  });
});

export const getAdminDataRequests = catchAsync(async (req, res) => {
  const status = req.query.status?.toString();
  const filter = ["pending", "approved", "rejected"].includes(status)
    ? { status }
    : {};

  const requests = await DataRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(200);
  const repairedRequests = await Promise.all(
    requests.map(ensureReadableExportSnapshot)
  );
  await DataRequest.populate(repairedRequests, [
    { path: "user", select: "_id name email role phoneNumber photo accountStatus" },
    { path: "reviewedBy", select: "_id name email role" },
  ]);
  const data = repairedRequests.map((request) => request.toObject());

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Data requests fetched successfully.",
    data,
  });
});

export const updateAdminDataRequest = catchAsync(async (req, res) => {
  const { requestId } = req.params;
  const { status, adminNote = "" } = req.body || {};

  if (!mongoose.Types.ObjectId.isValid(requestId)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid data request id.");
  }

  if (!["approved", "rejected"].includes(status)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Status must be approved or rejected.");
  }

  const request = await DataRequest.findById(requestId);
  if (!request) {
    throw new AppError(httpStatus.NOT_FOUND, "Data request not found.");
  }

  request.status = status;
  request.adminNote = adminNote.toString().trim();
  request.reviewedBy = req.user._id;
  request.reviewedAt = new Date();

  if (status === "approved") {
    if (!request.exportData || request.exportData.snapshotVersion !== DATA_EXPORT_SNAPSHOT_VERSION) {
      request.exportData = await buildUserDataExport(request.user);
      request.exportGeneratedAt = new Date();
    } else if (!request.exportGeneratedAt) {
      request.exportGeneratedAt = request.createdAt || new Date();
    }
  } else {
    request.exportData = null;
    request.exportGeneratedAt = null;
  }

  await request.save();

  emitToUser(request.user.toString(), "data_request_updated", {
    requestId: request._id.toString(),
    status: request.status,
    message:
      status === "approved"
        ? "Your OWVO data request has been approved."
        : "Your OWVO data request has been rejected.",
  });

  const populated = await DataRequest.findById(request._id)
    .populate("user", "_id name email role phoneNumber photo accountStatus")
    .populate("reviewedBy", "_id name email role")
    .lean();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Data request updated successfully.",
    data: populated,
  });
});

export const deleteMyAccount = catchAsync(async (req, res) => {
  if (!["user", "provider"].includes(req.user?.role)) {
    throw new AppError(httpStatus.FORBIDDEN, "This account cannot be deleted from the app.");
  }

  const confirmed =
    req.body?.confirm === true ||
    req.body?.confirmation?.toString().trim().toUpperCase() === "DELETE";

  if (!confirmed) {
    throw new AppError(httpStatus.BAD_REQUEST, "Please confirm account deletion.");
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found.");
  }

  removeUserLocalUploads(user);

  const id = user._id;
  const suffix = `${id.toString().slice(-8)}-${Date.now()}`;
  const isCustomer = user.role === "user";

  await Promise.all([
    Vehicle.deleteMany({ user: id }),
    ChatMessage.updateMany(
      { $or: [{ sender: id }, { recipient: id }, { participants: id }] },
      { $set: { text: "[Deleted account message removed]" } }
    ),
    Rating.updateMany(
      { $or: [{ user: id }, { provider: id }] },
      { $set: { review: "" } }
    ),
    UserRating.updateMany(
      { $or: [{ user: id }, { provider: id }] },
      { $set: { review: "" } }
    ),
    IssueReport.updateMany(
      { reporter: id },
      {
        $set: {
          description: "[Deleted account report removed]",
          photo: {},
        },
      }
    ),
    isCustomer
      ? Booking.updateMany(
          { user: id },
          {
            $set: {
              "address.addressLine": "Deleted account address removed",
              "address.latitude": 0,
              "address.longitude": 0,
              postalCode: "",
              vehicleSnapshot: {
                registrationNo: "",
                make: "",
                model: "",
                size: "",
                image: "",
              },
            },
          }
        )
      : Promise.resolve(),
  ]);

  user.name = "Deleted account";
  user.email = `deleted-${suffix}@deleted.owvo.local`;
  user.password = `deleted-${suffix}`;
  user.refreshToken = "";
  user.password_reset_token = "";
  user.verificationInfo = { verified: false, token: "" };
  user.isEmailVerified = false;
  user.accountStatus = "disabled";
  user.deleteReason = req.body?.reason?.toString().trim() || "Self-service account deletion";
  user.deletedAt = new Date();
  user.phoneNumber = undefined;
  user.language = "English";
  user.serviceArea = "";
  user.nationalInsuranceNumber = "";
  user.photo = { public_id: "", url: "" };
  user.residentialAddress = "";
  user.providerAddress = { streetAddress: "", city: "", country: "", postcode: "" };
  user.rightToWorkUK = false;
  user.isProfileCompleted = false;
  user.identityVerification = {
    documentType: "",
    documentNumber: "",
    idFile: {},
    passportOrDrivingLicenseFile: {},
    status: "pending",
  };
  user.drivewayEligibility = {};
  user.isIdentityCompleted = false;
  user.bankDetails = {};
  user.stripeConnect = {};
  user.isBankCompleted = false;
  user.insurance = { document: { public_id: "", url: "" } };
  user.publicLiabilityInsurance = { document: { public_id: "", url: "" } };
  user.drivewayPhoto = { document: { public_id: "", url: "" } };
  user.location = undefined;
  user.preferredServices = [];
  user.isOnline = false;
  user.isBusy = false;

  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Account and personal data have been deleted.",
    data: null,
  });
});
