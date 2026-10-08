const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    certificate: { type: mongoose.Schema.Types.ObjectId, ref: "Certificate" },
    type: {
      type: String,
      enum: ["issue", "revoke", "verify"],
      required: true,
    },
    transactionHash: { type: String },
    blockNumber: { type: Number },
    fromAddress: { type: String },
    status: {
      type: String,
      enum: ["pending", "confirmed", "failed"],
      default: "pending",
    },
    gasUsed: { type: String },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

transactionSchema.index({ transactionHash: 1 });
transactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
