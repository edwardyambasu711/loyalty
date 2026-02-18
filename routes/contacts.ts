import express, { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../src/db.js";

const router = Router();

// Submit contact form
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = await getDatabase();
    const contactId = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      "INSERT INTO contacts (id, name, email, phone, message, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
      [contactId, name, email, phone || "", message, now]
    );

    res.json({
      id: contactId,
      message: "Thank you for contacting us! We will respond shortly.",
    });
  } catch (error) {
    console.error("Contact submission error:", error);
    res.status(500).json({ error: "Failed to submit contact form" });
  }
});

export default router;
