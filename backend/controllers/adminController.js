const Institution = require("../models/Institution");
const User = require("../models/User");
const Certificate = require("../models/Certificate");
const Transaction = require("../models/Transaction");
const AuditLog = require("../models/AuditLog");
const { asyncHandler } = require("../middleware/errorHandler");
const { setIssuerApproval } = require("../services/blockchainService");

/** GET /api/admin/institutions?status=pending */
const listInstitutions = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const institutions = await Institution.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, institutions });
});

/** PATCH /api/admin/institutions/:id/approve */
const approveInstitution = asyncHandler(async (req, res) => {
  const institution = await Institution.findById(req.params.id);
  if (!institution) return res.status(404).json({ success: false, message: "Institution not found" });

  institution.status = "approved";
  institution.approvedBy = req.user._id;
  institution.approvedAt = new Date();
  await institution.save();

  // Grant on-chain issuer rights if a wallet was provided at registration.
  let chainResult = null;
  if (institution.walletAddress) {
    try {
      chainResult = await setIssuerApproval(institution.walletAddress, true);
    } catch (err) {
      // Institution is approved in the platform even if the on-chain grant
      // fails (e.g. RPC unreachable) — surface the error so admin can retry.
      return res.status(207).json({
        success: true,
        institution,
        warning: `Institution approved, but on-chain issuer approval failed: ${err.message}. Retry via the blockchain admin tools.`,
      });
    }
  }

  await AuditLog.create({
    actor: req.user._id,
    actorRole: "super_admin",
    action: "INSTITUTION_APPROVED",
    targetType: "Institution",
    targetId: institution._id,
  });

  res.json({ success: true, institution, blockchain: chainResult });
});

/** PATCH /api/admin/institutions/:id/reject */
const rejectInstitution = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const institution = await Institution.findById(req.params.id);
  if (!institution) return res.status(404).json({ success: false, message: "Institution not found" });

  institution.status = "rejected";
  institution.rejectionReason = reason;
  await institution.save();

  await AuditLog.create({
    actor: req.user._id,
    actorRole: "super_admin",
    action: "INSTITUTION_REJECTED",
    targetType: "Institution",
    targetId: institution._id,
    metadata: { reason },
  });

  res.json({ success: true, institution });
});

/** GET /api/admin/users */
const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  const users = await User.find(filter).populate("institution").sort({ createdAt: -1 });
  res.json({ success: true, users });
});

/** PATCH /api/admin/users/:id/toggle-active */
const toggleUserActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  user.isActive = !user.isActive;
  await user.save();

  await AuditLog.create({
    actor: req.user._id,
    actorRole: "super_admin",
    action: user.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    targetType: "User",
    targetId: user._id,
  });

  res.json({ success: true, user: user.toSafeObject() });
});

/** GET /api/admin/transactions — paginated blockchain transaction log for the explorer page. */
const listTransactions = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const filter = {};
  if (req.query.type) filter.type = req.query.type;
  if (req.query.status) filter.status = req.query.status;

  const [transactions, total] = await Promise.all([
    Transaction.find(filter)
      .populate("certificate", "certificateId studentName institution")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);

  res.json({
    success: true,
    transactions,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/** GET /api/admin/analytics — platform-wide statistics for the dashboard. */
const getAnalytics = asyncHandler(async (req, res) => {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const [
    totalCertificates,
    revokedCertificates,
    totalInstitutions,
    pendingInstitutions,
    totalStudents,
    totalTransactions,
    failedTransactions,
    recentCertificates,
    recentAuditLogs,
    certificatesByDay,
  ] = await Promise.all([
    Certificate.countDocuments(),
    Certificate.countDocuments({ status: "revoked" }),
    Institution.countDocuments({ status: "approved" }),
    Institution.countDocuments({ status: "pending" }),
    User.countDocuments({ role: "student" }),
    Transaction.countDocuments(),
    Transaction.countDocuments({ status: "failed" }),
    Certificate.find().sort({ createdAt: -1 }).limit(10).populate("institution", "name code"),
    AuditLog.find().sort({ createdAt: -1 }).limit(15),
    Certificate.aggregate([
      { $match: { createdAt: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  // Fill in zero-count days so the chart doesn't have gaps for quiet days.
  const timeSeries = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(fourteenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const match = certificatesByDay.find((r) => r._id === key);
    timeSeries.push({ date: key, count: match ? match.count : 0 });
  }

  res.json({
    success: true,
    analytics: {
      certificates: {
        total: totalCertificates,
        revoked: revokedCertificates,
        active: totalCertificates - revokedCertificates,
      },
      institutions: {
        approved: totalInstitutions,
        pending: pendingInstitutions,
      },
      students: totalStudents,
      blockchain: {
        totalTransactions,
        failedTransactions,
        successRate:
          totalTransactions > 0
            ? (((totalTransactions - failedTransactions) / totalTransactions) * 100).toFixed(1)
            : "100.0",
      },
      recentCertificates,
      recentActivity: recentAuditLogs,
      timeSeries,
    },
  });
});

module.exports = {
  listInstitutions,
  approveInstitution,
  rejectInstitution,
  listUsers,
  toggleUserActive,
  getAnalytics,
  listTransactions,
};
