const Certificate = require("../models/Certificate");
const { asyncHandler } = require("../middleware/errorHandler");
const { verifyCertificateOnChain } = require("../services/blockchainService");
const crypto = require("crypto");
const ShareLink = require("../models/ShareLink");
const AuditLog = require("../models/AuditLog");
const QRCode = require("qrcode");
const { createOfflinePass } = require("../services/signatureService");

// Attributes a student may choose to disclose. Anything not listed stays hidden.
const SHAREABLE = ["studentName", "rollNumber", "department", "degree", "institution", "issueDate", "certificateType", "typeDetails"];
const MAX_HOURS = 24 * 30;

/** GET /api/student/certificates — all certificates linked to the logged-in student */
const getMyCertificates = asyncHandler(async (req, res) => {
  const certificates = await Certificate.find({ student: req.user._id })
    .populate("institution", "name code logoUrl")
    .sort({ createdAt: -1 });

  res.json({ success: true, certificates });
});

/** GET /api/student/certificates/:id — single certificate with blockchain details */
const getCertificateDetail = asyncHandler(async (req, res) => {
  const certificate = await Certificate.findOne({
    _id: req.params.id,
    student: req.user._id,
  }).populate("institution");

  if (!certificate) {
    return res.status(404).json({ success: false, message: "Certificate not found." });
  }

  const chainDetails = await verifyCertificateOnChain(certificate.certificateId, certificate.certificateHash);

  res.json({ success: true, certificate, blockchain: chainDetails });
});

/** GET /api/student/certificates/:id/download — increments download count, returns IPFS PDF URL */
const downloadCertificate = asyncHandler(async (req, res) => {
  const certificate = await Certificate.findOne({
    _id: req.params.id,
    student: req.user._id,
  });

  if (!certificate) {
    return res.status(404).json({ success: false, message: "Certificate not found." });
  }

  certificate.downloadCount += 1;
  await certificate.save();

  // The PDF itself lives on IPFS (uploaded at issuance time); the backend
  // hands back the gateway URL rather than re-generating the file, so the
  // downloaded bytes always match what was hashed and pinned originally.
  res.json({ success: true, downloadUrl: certificate.ipfsPdfUrl });
});

/** GET /api/student/certificates/:id/share-link — public verification link to share */
const getShareLink = asyncHandler(async (req, res) => {
  const certificate = await Certificate.findOne({
    _id: req.params.id,
    student: req.user._id,
  });

  if (!certificate) {
    return res.status(404).json({ success: false, message: "Certificate not found." });
  }

  const base = process.env.CLIENT_URL || "http://localhost:5173";
  res.json({
    success: true,
    shareLink: `${base}/verify?certificateId=${encodeURIComponent(certificate.certificateId)}`,
  });
});


/** POST /api/student/certificates/:id/shares  { fields[], hours, label } */
const createShare = asyncHandler(async (req, res) => {
  const certificate = await Certificate.findOne({ _id: req.params.id, student: req.user._id });
  if (!certificate) return res.status(404).json({ success: false, message: "Certificate not found." });

  const fields = (req.body.fields || []).filter((f) => SHAREABLE.includes(f));
  if (!fields.length) return res.status(400).json({ success: false, message: "Pick at least one field to share." });
  const hours = Math.min(Math.max(Number(req.body.hours) || 24, 1), MAX_HOURS);

  const share = await ShareLink.create({
    token: crypto.randomBytes(24).toString("base64url"),
    certificate: certificate._id,
    student: req.user._id,
    fields,
    label: req.body.label,
    expiresAt: new Date(Date.now() + hours * 3600 * 1000),
  });
  await AuditLog.create({ actor: req.user._id, actorRole: "student", action: "SHARE_CREATED", targetType: "Certificate", targetId: certificate._id, metadata: { fields, hours } });

  const url = `${process.env.CLIENT_URL || "http://localhost:5173"}/verify/share/${share.token}`;
  res.status(201).json({ success: true, share, url, qr: await QRCode.toDataURL(url) });
});

/** GET /api/student/shares — all shares of the student's certificates */
const listShares = asyncHandler(async (req, res) => {
  const shares = await ShareLink.find({ student: req.user._id }).populate("certificate", "certificateId degree").sort({ createdAt: -1 });
  res.json({ success: true, shares });
});

/** DELETE /api/student/shares/:shareId — owner revokes access instantly */
const revokeShare = asyncHandler(async (req, res) => {
  const share = await ShareLink.findOne({ _id: req.params.shareId, student: req.user._id });
  if (!share) return res.status(404).json({ success: false, message: "Share not found." });
  share.revoked = true;
  share.revokedAt = new Date();
  await share.save();
  await AuditLog.create({ actor: req.user._id, actorRole: "student", action: "SHARE_REVOKED", targetType: "Certificate", targetId: share.certificate });
  res.json({ success: true });
});

/** GET /api/student/certificates/:id/offline-pass — signed pass + QR, works without internet to verify */
const getOfflinePass = asyncHandler(async (req, res) => {
  const certificate = await Certificate.findOne({ _id: req.params.id, student: req.user._id }).populate("institution", "code name");
  if (!certificate) return res.status(404).json({ success: false, message: "Certificate not found." });
  const pass = createOfflinePass(certificate);
  res.json({ success: true, pass, qr: await QRCode.toDataURL(pass, { errorCorrectionLevel: "M", width: 360 }) });
});

module.exports = { getMyCertificates, getCertificateDetail, downloadCertificate, getShareLink, createShare, listShares, revokeShare, getOfflinePass, SHAREABLE };
