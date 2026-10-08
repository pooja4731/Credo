const mongoose = require("mongoose");

/**
 * Connects to MongoDB using the URI in the environment.
 * Exits the process on failure so orchestration tools (pm2, docker, etc.)
 * can restart the service rather than silently running without a DB.
 */
async function connectDB() {
  try {
    mongoose.set("strictQuery", true);
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Modern mongoose (6+) no longer needs useNewUrlParser/useUnifiedTopology,
      // they are defaults, but kept here as explicit documentation.
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
