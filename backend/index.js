// server/index.js
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- PostgreSQL connection ---
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

// --- Test route ---
app.get("/", (req, res) => {
  res.send("Backend running");
});

// --- LOGIN route ---
app.post("/login", async (req, res) => {
  console.log("Login request body:", req.body);
  try {
    const { username, password } = req.body;
    console.log("Username:", username, "Password:", password);

    const result = await pool.query(
      "SELECT * FROM users WHERE username=$1",
      [username]
    );
    console.log("DB result:", result.rows);

    if (result.rows.length === 0)
      return res.status(401).json({ message: "Invalid credentials" });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    console.log("Password valid:", valid);
    if (!valid)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token, role: user.role });
  } catch (err) {
    console.error("ERROR inside /login:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
