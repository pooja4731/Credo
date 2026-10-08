const express = require("express");
const router = express.Router();

const {
  listInstitutions,
  approveInstitution,
  rejectInstitution,
  listUsers,
  toggleUserActive,
  getAnalytics,
  listTransactions,
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect, authorize("super_admin"));

router.get("/institutions", listInstitutions);
router.patch("/institutions/:id/approve", approveInstitution);
router.patch("/institutions/:id/reject", rejectInstitution);

router.get("/users", listUsers);
router.patch("/users/:id/toggle-active", toggleUserActive);

router.get("/analytics", getAnalytics);
router.get("/transactions", listTransactions);

module.exports = router;
