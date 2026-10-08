const express = require("express");
const router = express.Router();

const {
  getMyCertificates,
  getCertificateDetail,
  downloadCertificate,
  getShareLink,
  createShare,
  listShares,
  revokeShare,
  getOfflinePass,
} = require("../controllers/studentController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect, authorize("student"));

router.get("/certificates", getMyCertificates);
router.get("/certificates/:id", getCertificateDetail);
router.get("/certificates/:id/download", downloadCertificate);
router.get("/certificates/:id/share-link", getShareLink);

router.post("/certificates/:id/shares", createShare);
router.get("/shares", listShares);
router.delete("/shares/:shareId", revokeShare);
router.get("/certificates/:id/offline-pass", getOfflinePass);

module.exports = router;
