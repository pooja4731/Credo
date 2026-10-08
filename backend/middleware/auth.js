const { verifyToken } = require("../utils/jwt");
const User = require("../models/User");

/**
 * Verifies the Bearer token on the Authorization header, loads the user
 * (excluding password), and attaches it to req.user. Rejects if the user
 * no longer exists or has been deactivated.
 */
async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Not authenticated. Missing token." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "User not found or deactivated." });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
}

/**
 * Restricts a route to one or more roles.
 * Usage: router.get("/admin-only", protect, authorize("super_admin"), handler)
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
      });
    }
    next();
  };
}

module.exports = { protect, authorize };
