import multer from "multer";
import path from "path";
import fs from "fs";
import AppError from "../errors/AppError.js";

const uploadPath = "uploads/users";
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const fileName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${ext}`;
    cb(null, fileName);
  },
});

const imageExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".heif",
]);
const pdfDocumentFields = new Set([
  "insurance",
  "insuranceDocument",
  "publicLiabilityInsurance",
  "publicLiabilityInsuranceFile",
  "publicLiabilityInsuranceDocument",
  "liabilityInsurance",
]);

const isPdfDocumentField = (fieldName = "") => {
  const normalizedFieldName = fieldName
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return (
    pdfDocumentFields.has(fieldName) ||
    normalizedFieldName.includes("insurance") ||
    normalizedFieldName.includes("liability") ||
    normalizedFieldName.includes("passport") ||
    normalizedFieldName.includes("driving") ||
    normalizedFieldName.includes("licence") ||
    normalizedFieldName.includes("license") ||
    normalizedFieldName.includes("document") ||
    normalizedFieldName.includes("idfile")
  );
};

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname || "").toLowerCase();
  const mimetype = (file.mimetype || "").toLowerCase();
  const isImage = mimetype.startsWith("image/") || imageExtensions.has(extension);
  const isAllowedPdf =
    isPdfDocumentField(file.fieldname) &&
    (mimetype === "application/pdf" || extension === ".pdf");

  if (isImage || isAllowedPdf) {
    cb(null, true);
    return;
  }

  cb(
    new AppError(
      400,
      "Unsupported file type. Upload an image file, or a PDF for Public Liability Insurance."
    ),
    false
  );
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 12 * 1024 * 1024 },
});

