import express, { Router, Request, Response } from "express";
import bcryptjs from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../src/db.js";
import { generateToken, authenticateToken, AuthRequest } from "../middleware/auth.js";

const router = Router();

// Register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const db = await getDatabase();
    const existingUser = await db.get("SELECT * FROM users WHERE email = ?", [email]);

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const userId = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      "INSERT INTO users (id, email, password, firstName, lastName, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, email, hashedPassword, firstName || "", lastName || "", role || "candidate", now, now]
    );

    const token = generateToken(userId);
    res.json({
      token,
      user: {
        id: userId,
        email,
        firstName: firstName || "",
        lastName: lastName || "",
        role: role || "candidate",
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const passwordMatch = await bcryptjs.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        company: user.company,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Get current user
router.get("/me", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      company: user.company,
      phone: user.phone,
      bio: user.bio,
      avatar: user.avatar,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// Update user profile
router.put("/profile", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, company, phone, bio, avatar } = req.body;
    const db = await getDatabase();

    await db.run(
      "UPDATE users SET firstName = ?, lastName = ?, company = ?, phone = ?, bio = ?, avatar = ?, updatedAt = ? WHERE id = ?",
      [firstName || "", lastName || "", company || "", phone || "", bio || "", avatar || "", new Date().toISOString(), req.userId]
    );

    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      company: user.company,
      phone: user.phone,
      bio: user.bio,
      avatar: user.avatar,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
