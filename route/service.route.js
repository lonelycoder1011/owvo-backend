import express from "express";
import {
  createService,
  getAllServices,
  getMyServices,
  getSingleService,
  updateService,
  deleteService,
} from "../controller/service.controller.js";

import {protect, isProvider} from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getAllServices);
router.post("/", protect, isProvider, createService);
router.get("/provider/me", protect, isProvider, getMyServices);
router.get("/:id", getSingleService);
router.patch("/:id", protect, isProvider, updateService);
router.delete("/:id", protect, isProvider, deleteService);

export default router;
