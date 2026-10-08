const User = require("../models/User");
const Institution = require("../models/Institution");
const AuditLog = require("../models/AuditLog");
const { signToken } = require("../utils/jwt");
const { asyncHandler } = require("../middleware/errorHandler");

/**
 * POST /api/auth/register/student
 * Public self-registration for students.
 */
const registerStudent = asyncHandler(async (req, res) => {
  const { name, email, password, rollNumber, department } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ success: false, message: "Email already registered." });
  }

  const user = await User.create({
    name,
    email,
    password,
    role: "student",
    rollNumber,
    department,
  });

  const token = signToken(user);
  res.status(201).json({ success: true, token, user: user.toSafeObject() });
});

/**
 * POST /api/auth/register/institution
 * Institution self-registration — creates a pending Institution record
 * and a linked user account. Requires Super Admin approval before the
 * institution can issue certificates (see adminController.approveInstitution).
 */
const registerInstitution = asyncHandler(async (req, res) => {
  const { name, email, password, institutionName, institutionCode, phone, address, walletAddress } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ success: false, message: "Email already registered." });
  }

  const existingInstitution = await Institution.findOne({ code: institutionCode?.toUpperCase() });
  if (existingInstitution) {
    return res.status(409).json({ success: false, message: "Institution code already in use." });
  }

  const institution = await Institution.create({
    name: institutionName,
    code: institutionCode,
    email,
    phone,
    address,
    walletAddress,
    status: "pending",
  });

  const user = await User.create({
    name,
    email,
    password,
    role: "institution",
    institution: institution._id,
  });

  await AuditLog.create({
    actor: user._id,
    actorRole: "institution",
    action: "INSTITUTION_REGISTERED",
    targetType: "Institution",
    targetId: institution._id,
  });

  const token = signToken(user);
  res.status(201).json({
    success: true,
    token,
    user: user.toSafeObject(),
    institution,
    message: "Registration successful. Your institution is pending Super Admin approval.",
  });
});

/**
 * POST /api/auth/login
 * Shared login for all roles (super_admin, institution, student). The
 * frontend's role-specific login buttons all hit this same endpoint and
 * route based on the returned user.role.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password").populate("institution");
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ success: false, message: "Invalid email or password." });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: "This account has been deactivated." });
  }

  if (user.role === "institution" && user.institution && user.institution.status !== "approved") {
    return res.status(403).json({
      success: false,
      message: `Institution account status: ${user.institution.status}. Certificate issuance is disabled until approved.`,
      institutionStatus: user.institution.status,
    });
  }

  user.lastLoginAt = new Date();
  await user.save();

  await AuditLog.create({
    actor: user._id,
    actorRole: user.role,
    action: "LOGIN",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  });

  const token = signToken(user);
  res.json({ success: true, token, user: user.toSafeObject() });
});

/** GET /api/auth/me — returns the currently authenticated user. */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("institution");
  res.json({ success: true, user });
});

module.exports = { registerStudent, registerInstitution, login, getMe };
