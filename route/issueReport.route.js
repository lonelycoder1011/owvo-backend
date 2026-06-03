import express from "express";
import { createIssueReport } from "../controller/issueReport.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/", protect, upload.single("photo"), createIssueReport);

export default router;
