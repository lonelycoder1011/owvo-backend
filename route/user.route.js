import express from "express";
import {
  changePassword,
  getBankDetails,
  getProfile,
  updateBankDetails,
  updateIdentityInfo,
  updateProfile,
  uploadIdentityIdFile,
  getUserActivity
} from "../controller/user.controller.js";

import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js"; 

const router = express.Router();

router.get("/profile", protect, getProfile);
router.put(
  "/profile",
  protect,
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "idFile", maxCount: 1 },
    { name: "passportOrDrivingLicenseFile", maxCount: 1 },
    { name: "insurance", maxCount: 1 },
  ]),
  updateProfile
);
router.put("/identity",protect,upload.array("idFiles", 5),updateIdentityInfo);
router.put("/password", protect, changePassword);
router.put("/identity/upload-id",protect,upload.array("idFile", 5),uploadIdentityIdFile);
router.get("/bank", protect, getBankDetails);
router.put("/bank", protect, updateBankDetails);
router.get("/activity", protect, getUserActivity);


export default router;
