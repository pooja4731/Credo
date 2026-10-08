const express = require("express");
const router = express.Router();

const {
  getDashboard,
  getProfile,
  updateProfile,
  previewBranding,
  getCertificateTypes,
  issueSingleCertificate,
  registerExisting,
  bulkPreview,
  bulkIssue,
  getIssueHistory,
} = require("../controllers/institutionController");
const { protect, authorize } = require("../middleware/auth");
const { uploadSpreadsheet, uploadCertificateFile } = require("../middleware/upload");
const { body } = require("express-validator");
const { handleValidation } = require("../middleware/validators");

router.use(protect, authorize("institution"));

router.get("/dashboard", getDashboard);
router.get("/profile", getProfile);
router.patch("/profile", updateProfile);
router.post("/branding/preview", previewBranding);

router.get("/certificates/types", getCertificateTypes);

router.post(
  "/certificates/issue",
  [
    body("studentName").trim().notEmpty().withMessage("Student name is required"),
    body("rollNumber").trim().notEmpty().withMessage("Roll number is required"),
    body("department").trim().notEmpty().withMessage("Department is required"),
    body("degree").trim().notEmpty().withMessage("Degree is required"),
    body("certificateType")
      .optional()
      .isIn(["degree", "internship", "course", "competition", "other"])
      .withMessage("Invalid certificate type"),
    handleValidation,
  ],
  issueSingleCertificate
);

// Register an existing/legacy certificate: upload the original file (PDF or
// scanned image), hash it, and make it publicly verifiable via QR + on-chain
// record, without generating a new Credo PDF for it.
router.post(
  "/certificates/register-existing",
  uploadCertificateFile.single("file"),
  [
    body("studentName").trim().notEmpty().withMessage("Student name is required"),
    body("rollNumber").trim().notEmpty().withMessage("Roll number is required"),
    body("department").trim().notEmpty().withMessage("Department is required"),
    body("degree").trim().notEmpty().withMessage("Degree is required"),
    body("certificateType")
      .optional()
      .isIn(["degree", "internship", "course", "competition", "other"])
      .withMessage("Invalid certificate type"),
    handleValidation,
  ],
  registerExisting
);

router.post("/certificates/bulk-preview", uploadSpreadsheet.single("file"), bulkPreview);
router.post("/certificates/bulk-issue", bulkIssue);
router.get("/certificates", getIssueHistory);

module.exports = router;
