/**
 * Seeds the database with a Super Admin account so you're never locked out
 * on a fresh install (there's no "first user is admin" bootstrap route on
 * purpose — that pattern is a common privilege-escalation footgun).
 *
 * Usage:
 *   node scripts/seed.js                  → creates Super Admin only
 *   node scripts/seed.js --with-demo-data → also creates a demo approved
 *                                            institution + one student
 *
 * Reads SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD from env if set, otherwise
 * falls back to sensible defaults you should change immediately after login.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../utils/db");

const User = require("../models/User");
const Institution = require("../models/Institution");

const WITH_DEMO_DATA = process.argv.includes("--with-demo-data");

async function seed() {
  await connectDB();

  // --- Super Admin ---
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@credo.app";
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || "ChangeMe123!";

  let admin = await User.findOne({ email: adminEmail });
  if (admin) {
    console.log(`Super Admin already exists (${adminEmail}) — skipping creation.`);
  } else {
    admin = await User.create({
      name: "Credo Super Admin",
      email: adminEmail,
      password: adminPassword,
      role: "super_admin",
    });
    console.log("Created Super Admin:");
    console.log(`  Email:    ${adminEmail}`);
    console.log(`  Password: ${adminPassword}`);
    console.log("  ⚠ Change this password immediately after first login.");
  }

  if (WITH_DEMO_DATA) {
    // --- Demo approved institution ---
    let institution = await Institution.findOne({ code: "DEMOU" });
    if (!institution) {
      institution = await Institution.create({
        name: "Demo University of Technology",
        code: "DEMOU",
        email: "registrar@demou.edu",
        phone: "+91-9000000000",
        address: "123 University Road, Coimbatore, Tamil Nadu",
        status: "approved",
        approvedBy: admin._id,
        approvedAt: new Date(),
      });
      console.log(`Created demo institution: ${institution.name} (${institution.code})`);
    } else {
      console.log("Demo institution already exists — skipping.");
    }

    // --- Demo institution login user ---
    const instEmail = "institution@demou.edu";
    let instUser = await User.findOne({ email: instEmail });
    if (!instUser) {
      instUser = await User.create({
        name: "Demo Registrar",
        email: instEmail,
        password: "Institution123!",
        role: "institution",
        institution: institution._id,
      });
      console.log(`Created demo institution login: ${instEmail} / Institution123!`);
    } else {
      console.log("Demo institution user already exists — skipping.");
    }

    // --- Demo student ---
    const studentEmail = "student@demou.edu";
    let student = await User.findOne({ email: studentEmail });
    if (!student) {
      student = await User.create({
        name: "Demo Student",
        email: studentEmail,
        password: "Student123!",
        role: "student",
        rollNumber: "DEMOU2026CSE001",
        department: "Computer Science",
        institution: institution._id,
      });
      console.log(`Created demo student login: ${studentEmail} / Student123!`);
    } else {
      console.log("Demo student already exists — skipping.");
    }
  }

  console.log("Seed complete.");
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
