const mongoose = require("mongoose");

// A student-controlled, expiring, revocable share of ONE certificate.
// `fields` is the allow-list of attributes a verifier may see (selective disclosure).
const shareLinkSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true, index: true },
    certificate: { type: mongoose.Schema.Types.ObjectId, ref: "Certificate", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    fields: [{ type: String }],
    label: { type: String, trim: true, maxlength: 80 }, // e.g. "Infosys HR"
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
    views: { type: Number, default: 0 },
    lastViewedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ShareLink", shareLinkSchema);
