const express = require("express");
const router = express.Router();

const { registerStudent, registerInstitution, login, getMe } = require("../controllers/authController");
const { studentRegisterRules, institutionRegisterRules, loginRules } = require("../middleware/validators");
const { protect } = require("../middleware/auth");

router.post("/register/student", studentRegisterRules, registerStudent);
router.post("/register/institution", institutionRegisterRules, registerInstitution);
router.post("/login", loginRules, login);
router.get("/me", protect, getMe);

module.exports = router;
