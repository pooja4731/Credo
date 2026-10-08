const mongoose = require("mongoose");

const institutionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    website: { type: String, trim: true },
    logoUrl: { type: String, trim: true },

    // Certificate look & feel, fully controlled by the institution.
    branding: {
      headerName: { type: String, trim: true, maxlength: 60 }, // shown as certificate header (defaults to name)
      certificateTitle: { type: String, trim: true, maxlength: 60 }, // overrides "Certificate of Completion"
      headerCase: { type: String, enum: ["upper", "title", "asis"] },
      headerSize: { type: String, enum: ["small", "medium", "large"], default: "medium" },
      bgColor: { type: String, match: /^#[0-9a-fA-F]{6}$/, default: "#FFFFFF" },
      tagline: { type: String, trim: true, maxlength: 80 },
      template: { type: String, enum: ["classic", "modern", "elegant"], default: "classic" },
      fontFamily: { type: String, enum: ["helvetica", "times", "courier", "playfair", "montserrat", "lora"], default: "helvetica" },
      primaryColor: { type: String, match: /^#[0-9a-fA-F]{6}$/, default: "#3F4D20" },
      accentColor: { type: String, match: /^#[0-9a-fA-F]{6}$/, default: "#C9843F" },
      footerText: { type: String, trim: true, maxlength: 120 },
      signatoryName: { type: String, trim: true, maxlength: 60 },
      signatoryTitle: { type: String, trim: true, maxlength: 60 },
      logoDataUrl: { type: String, maxlength: 600000 }, // PNG/JPG data URL, ~400 KB max
    },

    // Ethereum wallet used to sign issuance transactions on-chain
    walletAddress: {
      type: String,
      trim: true,
      match: [/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"],
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectionReason: { type: String },

    stats: {
      certificatesIssued: { type: Number, default: 0 },
      studentsCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Institution", institutionSchema);
