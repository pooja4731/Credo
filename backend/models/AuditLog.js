const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    actorRole: { type: String },
    action: {
      type: String,
      required: true,
      // e.g. "LOGIN", "INSTITUTION_APPROVED", "CERTIFICATE_ISSUED",
      // "CERTIFICATE_REVOKED", "VERIFY_ATTEMPT", "BULK_UPLOAD"
    },
    targetType: { type: String }, // "Certificate" | "Institution" | "User"
    targetId: { type: mongoose.Schema.Types.ObjectId },
    ipAddress: { type: String },
    userAgent: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
