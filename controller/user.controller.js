import fs from "fs";
import httpStatus from "http-status";
import mongoose from "mongoose";
import AppError from "../errors/AppError.js";
import { Booking } from "../model/booking.model.js";
import { Rating } from "../model/rating.model.js";
import { User } from "../model/user.model.js";
import { uploadOnCloudinary } from "../utils/common.Method.js";
import catchAsync from "../utils/catch.Async.js";
import sendResponse from "../utils/sendResponse.js";


export const getProfile = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -refreshToken -verificationInfo.token -password_reset_token"
  );

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile fetched successfully",
    data: user,
  });
});


const calculateAge = (date) => {
  const today = new Date();
  const dob = new Date(date);

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dob.getDate())
  ) {
    age--;
  }

  return age;
};

const parseBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return undefined;
};

const normalizeOptionalString = (value) => {
  if (value === undefined || value === null) return undefined;
  const normalized = value.toString().trim();
  return normalized ? normalized : undefined;
};

export const updateProfile = catchAsync(async (req, res) => {
  const {
    name,
    email,
    phoneNumber,
    language,
    dateOfBirth,
    residentialAddress,
    rightToWorkUK,
    serviceArea,
    providerStreetAddress,
    providerCity,
    providerCountry,
    providerPostcode,
    nationalInsuranceNumber,

    documentType,
    documentNumber,

    isPrivateProperty,
    hasPermission,
    noRoadPayment,
    oneCarSpaceOnly,
    notSharedOrCommunal,

    accountHolderName,
    bankAddress,
    city,
    postcode,
    bankDateOfBirth,
    accountNumber,
    sortCode,
  } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  // ---------------------------
  // Unique checks
  // ---------------------------
  const normalizedEmail = normalizeOptionalString(email)?.toLowerCase();
  if (email !== undefined && normalizedEmail && normalizedEmail !== user.email) {
    const existingEmailUser = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
    if (existingEmailUser) throw new AppError(httpStatus.BAD_REQUEST, "Email already in use");
    user.email = normalizedEmail;
  }

  const normalizedPhoneNumber = normalizeOptionalString(phoneNumber);
  if (phoneNumber !== undefined && normalizedPhoneNumber !== user.phoneNumber) {
    if (normalizedPhoneNumber) {
      const existingPhoneUser = await User.findOne({ phoneNumber: normalizedPhoneNumber, _id: { $ne: user._id } });
      if (existingPhoneUser) throw new AppError(httpStatus.BAD_REQUEST, "Phone number already in use");
    }
    user.phoneNumber = normalizedPhoneNumber;
  }

  // ---------------------------
  // Basic profile fields
  // ---------------------------
  if (name !== undefined) user.name = name;
  if (language !== undefined) user.language = language;
  if (residentialAddress !== undefined) user.residentialAddress = residentialAddress;
  if (serviceArea !== undefined) user.serviceArea = serviceArea;
  const hasProviderAddressUpdate =
    providerStreetAddress !== undefined ||
    providerCity !== undefined ||
    providerCountry !== undefined ||
    providerPostcode !== undefined;

  if (hasProviderAddressUpdate) {
    if (!user.providerAddress) user.providerAddress = {};
    if (providerStreetAddress !== undefined) {
      user.providerAddress.streetAddress = providerStreetAddress;
    }
    if (providerCity !== undefined) user.providerAddress.city = providerCity;
    if (providerCountry !== undefined) user.providerAddress.country = providerCountry;
    if (providerPostcode !== undefined) user.providerAddress.postcode = providerPostcode;

    const providerAddressLine = [
      user.providerAddress.streetAddress,
      user.providerAddress.city,
      user.providerAddress.country,
      user.providerAddress.postcode,
    ]
      .filter(Boolean)
      .join(", ");

    if (providerAddressLine) {
      if (residentialAddress === undefined) user.residentialAddress = providerAddressLine;
      if (serviceArea === undefined) user.serviceArea = providerAddressLine;
    }
  }
  if (nationalInsuranceNumber !== undefined) user.nationalInsuranceNumber = nationalInsuranceNumber;

  const parsedRightToWorkUK = parseBoolean(rightToWorkUK);
  if (parsedRightToWorkUK !== undefined) user.rightToWorkUK = parsedRightToWorkUK;

  if (dateOfBirth) {
    const age = calculateAge(dateOfBirth);
    if (age < 18) throw new AppError(httpStatus.BAD_REQUEST, "User must be 18 years or older");
    user.dateOfBirth = new Date(dateOfBirth);
  }

  // ---------------------------
  // Identity verification
  // ---------------------------
  if (documentType !== undefined) user.identityVerification.documentType = documentType;
  if (documentNumber !== undefined) user.identityVerification.documentNumber = documentNumber;

  // ---------------------------
  // Driveway eligibility
  // ---------------------------
  if (isPrivateProperty !== undefined) user.drivewayEligibility.isPrivateProperty = parseBoolean(isPrivateProperty);
  if (hasPermission !== undefined) user.drivewayEligibility.hasPermission = parseBoolean(hasPermission);
  if (noRoadPayment !== undefined) user.drivewayEligibility.noRoadPayment = parseBoolean(noRoadPayment);
  if (oneCarSpaceOnly !== undefined) user.drivewayEligibility.oneCarSpaceOnly = parseBoolean(oneCarSpaceOnly);
  if (notSharedOrCommunal !== undefined) user.drivewayEligibility.notSharedOrCommunal = parseBoolean(notSharedOrCommunal);

  // ---------------------------
  // Bank details
  // ---------------------------
  if (accountHolderName !== undefined) user.bankDetails.accountHolderName = accountHolderName;
  if (bankAddress !== undefined) user.bankDetails.address = bankAddress;
  if (city !== undefined) user.bankDetails.city = city;
  if (postcode !== undefined) user.bankDetails.postcode = postcode;
  if (bankDateOfBirth) {
    const bankAge = calculateAge(bankDateOfBirth);
    if (bankAge < 18) throw new AppError(httpStatus.BAD_REQUEST, "Bank date of birth must be 18 years or older");
    user.bankDetails.dateOfBirth = new Date(bankDateOfBirth);
  }
  if (accountNumber !== undefined) user.bankDetails.accountNumber = accountNumber;
  if (sortCode !== undefined) user.bankDetails.sortCode = sortCode;

  // ---------------------------
  // File uploads to Cloudinary
  // ---------------------------
  if (req.files?.photo?.[0]) {
  const uploadResult = await uploadOnCloudinary(
    req.files.photo[0].path,
    "users"
  );

  user.photo = {
    public_id: uploadResult.public_id,
    url: uploadResult.secure_url,
  };
}

if (req.files?.idFile?.[0]) {
  const uploadResult = await uploadOnCloudinary(
    req.files.idFile[0].path,
    "users/identity"
  );

  user.identityVerification.idFile = {
    public_id: uploadResult.public_id,
    url: uploadResult.secure_url,
  };
}

if (req.files?.passportOrDrivingLicenseFile?.[0]) {
  const uploadResult = await uploadOnCloudinary(
    req.files.passportOrDrivingLicenseFile[0].path,
    "users/identity"
  );

  user.identityVerification.passportOrDrivingLicenseFile = {
    public_id: uploadResult.public_id,
    url: uploadResult.secure_url,
  };
}

if (req.files?.insurance?.[0]) {
  const uploadResult = await uploadOnCloudinary(
    req.files.insurance[0].path,
    "users/insurance"
  );

  user.insurance = {
    document: {
      public_id: uploadResult.public_id,
      url: uploadResult.secure_url,
    },
    uploadedAt: new Date(),
  };
}
  // ---------------------------
  // Completion checks
  // ---------------------------
  const providerAddressLine = [
    user.providerAddress?.streetAddress,
    user.providerAddress?.city,
    user.providerAddress?.country,
    user.providerAddress?.postcode,
  ]
    .filter(Boolean)
    .join(", ");
  const isPersonalCompleted = Boolean(
    user.name &&
    user.email &&
    user.phoneNumber &&
    user.dateOfBirth &&
    (user.residentialAddress || providerAddressLine)
  );
  user.isProfileCompleted = isPersonalCompleted;

  const d = user.drivewayEligibility;
  const isIdentityCompleted = Boolean(
    user.identityVerification.documentType &&
    user.identityVerification.documentNumber &&
    user.identityVerification.idFile &&
    user.identityVerification.passportOrDrivingLicenseFile &&
    d.isPrivateProperty &&
    d.hasPermission &&
    d.noRoadPayment &&
    d.oneCarSpaceOnly &&
    d.notSharedOrCommunal
  );
  user.isIdentityCompleted = isIdentityCompleted;
  if (isIdentityCompleted && !user.identityVerification.submittedAt) {
    user.identityVerification.submittedAt = new Date();
  }

  const isBankCompleted = Boolean(
    user.bankDetails.accountHolderName &&
    user.bankDetails.address &&
    user.bankDetails.city &&
    user.bankDetails.postcode &&
    user.bankDetails.dateOfBirth &&
    user.bankDetails.accountNumber &&
    user.bankDetails.sortCode
  );
  user.isBankCompleted = isBankCompleted;

  // ---------------------------
  // Save user and respond
  // ---------------------------
  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: user,
  });
});

export const uploadPhoto = catchAsync(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "No file uploaded");
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");
  if (user.photo && fs.existsSync(user.photo)) fs.unlinkSync(user.photo);
  user.photo = req.files[0].path;

  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Photo uploaded successfully",
    data: user,
  });
});

export const changePassword = catchAsync(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "All password fields are required"
    );
  }

  if (newPassword !== confirmPassword) {
    throw new AppError(httpStatus.BAD_REQUEST, "Passwords do not match");
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  const isMatch = await User.isPasswordMatched(
    currentPassword,
    user.password
  );

  if (!isMatch) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Current password is incorrect"
    );
  }

  user.password = newPassword;
  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password changed successfully",
  });
});

export const updateIdentityInfo = catchAsync(async (req, res) => {
  const {
    documentType, // "passport" | "driving_license"
    drivewayEligibility, // object of booleans
  } = req.body;
  const drivewayEligibility1 = JSON.parse(drivewayEligibility || "{}");

  const user = await User.findById(req.user._id);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  // ✅ documentType update
  if (documentType) {
    const allowed = ["passport", "driving_license"];
    if (!allowed.includes(documentType)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "documentType must be passport or driving_license"
      );
    }
    user.identityVerification = user.identityVerification || {};
    user.identityVerification.documentType = documentType;
  }

  // ✅ driveway eligibility update
  if (drivewayEligibility && typeof drivewayEligibility === "object") {
    user.drivewayEligibility = user.drivewayEligibility || {};

    const keys = [
      "isPrivateProperty",
      "hasPermission",
      "noRoadPayment",
      "oneCarSpaceOnly",
      "notSharedOrCommunal",
    ];

    keys.forEach((k) => {
      if (drivewayEligibility1[k] !== undefined) {
        user.drivewayEligibility[k] = Boolean(drivewayEligibility1[k]);
      }
    });
  }

  const allDrivewayChecks =
    user.drivewayEligibility?.isPrivateProperty &&
    user.drivewayEligibility?.hasPermission &&
    user.drivewayEligibility?.noRoadPayment &&
    user.drivewayEligibility?.oneCarSpaceOnly &&
    user.drivewayEligibility?.notSharedOrCommunal;

  if (
    user.identityVerification?.documentType &&
    user.identityVerification?.idFile &&
    allDrivewayChecks
  ) {
    user.isIdentityCompleted = true;
    user.identityVerification.status = "pending";
    user.identityVerification.submittedAt = new Date();
  } else {
    user.isIdentityCompleted = false;
  }
    user.identityVerification = user.identityVerification || {};

  // ✅ delete old id file if exists
  if (user.identityVerification.idFile && fs.existsSync(user.identityVerification.idFile)) {
    fs.unlinkSync(user.identityVerification.idFile);
  }

  user.identityVerification.idFile = req.file.path;

  // if they upload file, keep status pending
  if (!user.identityVerification.status) user.identityVerification.status = "pending";
  user.idNumber = idNumber || user.idNumber;

  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Identity information updated successfully",
    data: user,
  });
});

export const uploadIdentityIdFile = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError(httpStatus.BAD_REQUEST, "No file uploaded");
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  user.identityVerification = user.identityVerification || {};

  if (user.identityVerification.idFile && fs.existsSync(user.identityVerification.idFile)) {
    fs.unlinkSync(user.identityVerification.idFile);
  }

  user.identityVerification.idFile = req.file.path;

  if (!user.identityVerification.status) user.identityVerification.status = "pending";

  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "ID uploaded successfully",
    data: user,
  });
});

export const getBankDetails = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "bankDetails isBankCompleted"
  );

  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Bank details fetched successfully",
    data: {
      bankDetails: user.bankDetails || {},
      isBankCompleted: user.isBankCompleted,
    },
  });
});

export const updateBankDetails = catchAsync(async (req, res) => {
  const {
    accountHolderName,
    address,
    city,
    postcode,
    dateOfBirth,
    accountNumber,
    sortCode,
  } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

  user.bankDetails = user.bankDetails || {};

  if (accountHolderName !== undefined)
    user.bankDetails.accountHolderName = accountHolderName;

  if (address !== undefined) user.bankDetails.address = address;
  if (city !== undefined) user.bankDetails.city = city;
  if (postcode !== undefined) user.bankDetails.postcode = postcode;

  if (dateOfBirth) {
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invalid dateOfBirth");
    }
    user.bankDetails.dateOfBirth = dob;
  }

  if (accountNumber !== undefined)
    user.bankDetails.accountNumber = accountNumber;

  if (sortCode !== undefined) user.bankDetails.sortCode = sortCode;

  const bd = user.bankDetails;
  const completed =
    bd.accountHolderName &&
    bd.address &&
    bd.city &&
    bd.postcode &&
    bd.dateOfBirth &&
    bd.accountNumber &&
    bd.sortCode;

  user.isBankCompleted = Boolean(completed);

  await user.save();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Bank details updated successfully",
    data: {
      bankDetails: user.bankDetails,
      isBankCompleted: user.isBankCompleted,
    },
  });
});

export const getUserActivity = catchAsync(async (req, res) => {
  const userId = req.user._id;

  const bookings = await Booking.find({ user: userId })
    .populate(
      "provider",
      "_id name email role photo phoneNumber location providerAddress residentialAddress serviceArea"
    )
    .populate("service", "_id title price serviceType carSize carName carModel")
    .populate("vehicle", "registrationNo make model year size image isDefault")
    .sort({ createdAt: -1 })
    .lean();

  const bookingIds = bookings.map((booking) => booking._id);
  const providerIds = [
    ...new Set(
      bookings
        .map((booking) => booking.provider?._id?.toString())
        .filter(Boolean)
    ),
  ];

  const [bookingRatings, providerRatingStats] = await Promise.all([
    Rating.find({ booking: { $in: bookingIds }, user: userId })
      .select("booking rating review createdAt")
      .lean(),
    Rating.aggregate([
      {
        $match: {
          provider: {
            $in: providerIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
      },
      {
        $group: {
          _id: "$provider",
          averageRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 },
        },
      },
    ]),
  ]);

  const ratingsByBookingId = new Map(
    bookingRatings.map((rating) => [
      rating.booking.toString(),
      {
        rating: rating.rating,
        review: rating.review || "",
        createdAt: rating.createdAt,
      },
    ])
  );

  const ratingsByProviderId = new Map(
    providerRatingStats.map((stat) => [
      stat._id.toString(),
      {
        averageRating: Number((stat.averageRating || 0).toFixed(1)),
        totalRatings: stat.totalRatings || 0,
      },
    ])
  );

  const decorateBooking = (booking) => {
    const rating = ratingsByBookingId.get(booking._id.toString()) || null;
    const providerId = booking.provider?._id?.toString();
    const providerRating = providerId
      ? ratingsByProviderId.get(providerId) || {
          averageRating: 0,
          totalRatings: 0,
        }
      : { averageRating: 0, totalRatings: 0 };

    return {
      ...booking,
      isRated: Boolean(rating) || Boolean(booking.isRated),
      userRating: rating,
      provider: booking.provider
        ? {
            ...booking.provider,
            averageRating: providerRating.averageRating,
            totalRatings: providerRating.totalRatings,
          }
        : booking.provider,
    };
  };

  const decoratedBookings = bookings.map(decorateBooking);
  const activeStatuses = new Set(["pending", "accepted", "arrived", "ongoing"]);
  const ongoingBooking =
    decoratedBookings.find((booking) => activeStatuses.has(booking.status)) ||
    null;
  const recentBookings = decoratedBookings.slice(0, 10);

  const providerHistory = new Map();
  decoratedBookings.forEach((booking) => {
    const provider = booking.provider;
    if (!provider?._id) return;

    const providerId = provider._id.toString();
    const providerRating = ratingsByProviderId.get(providerId) || {
      averageRating: 0,
      totalRatings: 0,
    };

    const current = providerHistory.get(providerId) || {
      _id: provider._id,
      name: provider.name,
      email: provider.email,
      role: provider.role,
      photo: provider.photo,
      phoneNumber: provider.phoneNumber,
      averageRating: providerRating.averageRating,
      totalRatings: providerRating.totalRatings,
      totalBookings: 0,
      lastBooking: null,
      ongoingBooking: null,
      recentBookings: [],
    };

    current.totalBookings += 1;
    if (!current.lastBooking) current.lastBooking = booking;
    if (!current.ongoingBooking && activeStatuses.has(booking.status)) {
      current.ongoingBooking = booking;
    }
    if (current.recentBookings.length < 3) {
      current.recentBookings.push(booking);
    }

    providerHistory.set(providerId, current);
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User activity fetched successfully",
    data: {
      ongoingBooking,
      recentBookings,
      providers: Array.from(providerHistory.values()),
      totalBookings: bookings.length,
    },
  });
});
