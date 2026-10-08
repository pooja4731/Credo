const { body, validationResult } = require("express-validator");

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: "Validation failed", errors: errors.array() });
  }
  next();
}

const studentRegisterRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  body("rollNumber").trim().notEmpty().withMessage("Roll number is required"),
  body("department").trim().notEmpty().withMessage("Department is required"),
  handleValidation,
];

const institutionRegisterRules = [
  body("name").trim().notEmpty().withMessage("Contact name is required"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  body("institutionName").trim().notEmpty().withMessage("Institution name is required"),
  body("institutionCode").trim().notEmpty().withMessage("Institution code is required"),
  body("walletAddress")
    .optional({ checkFalsy: true })
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage("Wallet address must be a valid Ethereum address"),
  handleValidation,
];

const loginRules = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
  handleValidation,
];

module.exports = { studentRegisterRules, institutionRegisterRules, loginRules, handleValidation };
