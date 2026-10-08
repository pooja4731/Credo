const express = require("express");
const router = express.Router();

const { verifyById, verifyByHash, verifyByUpload, verifyByShare, publicKey, verifyPass } = require("../controllers/verifyController");
const { uploadPDF } = require("../middleware/upload");

// All routes here are intentionally public — no `protect` middleware —
// since certificate verification must work for employers/verifiers
// without an account, per the platform's core design goal.
router.get("/share/:token", verifyByShare);
router.get("/public-key", publicKey);
router.post("/pass", verifyPass);
router.get("/:certificateId", verifyById);
router.post("/hash", verifyByHash);
router.post("/upload", uploadPDF.single("file"), verifyByUpload);

module.exports = router;
