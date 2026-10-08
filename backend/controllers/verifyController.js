const Certificate = require("../models/Certificate");
const AuditLog = require("../models/AuditLog");
const { asyncHandler } = require("../middleware/errorHandler");
const { verifyCertificateById, verifyCertificateByFile } = require("../services/certificateService");
const ShareLink = require("../models/ShareLink");
const { verifyOfflinePass, getPublicKeyB64u } = require("../services/signatureService");

/** GET /api/verify/share/:token — shows ONLY the fields the student chose to disclose. */
const verifyByShare = asyncHandler(async (req, res) => {
  const share = await ShareLink.findOne({ token: req.params.token }).populate("certificate");
  if (!share) return res.status(404).json({ success: true, found: false, message: "Share link not found." });
  if (share.revoked) return res.status(410).json({ success: true, found: true, state: "revoked", message: "The certificate holder revoked this link." });
  if (share.expiresAt < new Date()) return res.status(410).json({ success: true, found: true, state: "expired", message: "This link has expired." });

  const result = await verifyCertificateById(share.certificate.certificateId);
  share.views += 1;
  share.lastViewedAt = new Date();
  await share.save();

  const src = { ...result.certificate.toObject(), institution: result.certificate.institution?.name };
  const disclosed = {};
  share.fields.forEach((f) => { if (src[f] !== undefined) disclosed[f] = src[f]; });

  res.json({
    success: true, found: true, state: "active",
    valid: result.valid, revoked: result.revoked, tampered: result.tampered,
    disclosed, hiddenCount: Math.max(0, 8 - share.fields.length),
    sharedFor: share.label, expiresAt: share.expiresAt,
    transactionHash: result.certificate.blockchain?.transactionHash,
  });
});

/** GET /api/verify/public-key — lets verifiers check passes offline. */
const publicKey = asyncHandler(async (req, res) => res.json({ success: true, alg: "Ed25519", publicKey: getPublicKeyB64u() }));

/** POST /api/verify/pass { pass } — signature check, then live chain status if online. */
const verifyPass = asyncHandler(async (req, res) => {
  const { signatureValid, payload } = verifyOfflinePass(req.body.pass);
  if (!signatureValid || !payload) return res.json({ success: true, signatureValid: false });
  const live = await verifyCertificateById(payload.id);
  res.json({ success: true, signatureValid: true, payload, live: { found: live.found, valid: live.valid, revoked: live.revoked, tampered: live.tampered } });
});

/**
 * GET /api/verify/:certificateId
 * Public, no auth required. Used by QR scan and manual ID entry.
 */
const verifyById = asyncHandler(async (req, res) => {
  const result = await verifyCertificateById(req.params.certificateId);

  await AuditLog.create({
    action: "VERIFY_ATTEMPT",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
    metadata: { certificateId: req.params.certificateId, method: "id", found: result.found },
  });

  if (!result.found) {
    return res.status(404).json({ success: true, ...result });
  }

  res.json({
    success: true,
    found: true,
    valid: result.valid,
    revoked: result.revoked,
    tampered: result.tampered,
    certificate: {
      studentName: result.certificate.studentName,
      rollNumber: result.certificate.rollNumber,
      department: result.certificate.department,
      degree: result.certificate.degree,
      certificateType: result.certificate.certificateType,
      typeDetails: result.certificate.typeDetails,
      source: result.certificate.source,
      institution: result.certificate.institution?.name,
      issueDate: result.certificate.issueDate,
      certificateId: result.certificate.certificateId,
      certificateHash: result.certificate.certificateHash,
      qrCodeUrl: result.certificate.qrCodeUrl,
      // Only present for source === "registered_existing" — lets a verifier
      // confirm the original uploaded file's hash matches what's on-chain.
      originalFile: result.certificate.originalFile?.fileHash
        ? {
            fileHash: result.certificate.originalFile.fileHash,
            ipfsUrl: result.certificate.originalFile.ipfsUrl,
          }
        : undefined,
    },
    blockchain: {
      transactionHash: result.certificate.blockchain?.transactionHash,
      blockNumber: result.certificate.blockchain?.blockNumber,
      issuerWallet: result.certificate.blockchain?.issuerWallet,
    },
  });
});

/**
 * POST /api/verify/hash
 * Body: { certificateHash }
 * Looks up a certificate purely by its stored SHA-256 hash — useful when
 * someone has the hash but not the friendly ID.
 */
const verifyByHash = asyncHandler(async (req, res) => {
  const { certificateHash } = req.body;
  if (!certificateHash) {
    return res.status(400).json({ success: false, message: "certificateHash is required" });
  }

  const certificate = await Certificate.findOne({ certificateHash }).populate("institution");
  if (!certificate) {
    return res.status(404).json({ success: true, found: false, message: "No certificate matches this hash." });
  }

  const result = await verifyCertificateById(certificate.certificateId);
  res.json({ success: true, ...result });
});

/**
 * POST /api/verify/upload
 * multipart/form-data: { certificateId, file }
 * Re-hashes the uploaded PDF and cross-checks it against the certificate's
 * on-chain and MongoDB records to detect swapped/tampered files.
 */
const verifyByUpload = asyncHandler(async (req, res) => {
  const { certificateId } = req.body;
  if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded." });
  if (!certificateId) {
    return res.status(400).json({ success: false, message: "certificateId is required alongside the file." });
  }

  const result = await verifyCertificateByFile(certificateId, req.file.buffer);

  await AuditLog.create({
    action: "VERIFY_ATTEMPT",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
    metadata: { certificateId, method: "upload", found: result.found },
  });

  res.json({ success: true, ...result });
});

module.exports = { verifyById, verifyByHash, verifyByUpload, verifyByShare, publicKey, verifyPass };
