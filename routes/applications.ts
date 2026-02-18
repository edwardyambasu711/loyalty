import express, { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../src/db.js";
import { authenticateToken, AuthRequest } from "../middleware/auth.js";

const router = Router();

// Apply to a job
router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { jobId, resume, coverLetter } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: "Job ID required" });
    }

    const db = await getDatabase();

    // Check if job exists
    const job = await db.get("SELECT * FROM jobs WHERE id = ?", [jobId]);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Check if already applied
    const existing = await db.get(
      "SELECT * FROM applications WHERE jobId = ? AND userId = ?",
      [jobId, req.userId]
    );
    if (existing) {
      return res.status(400).json({ error: "Already applied to this job" });
    }

    const appId = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      "INSERT INTO applications (id, jobId, userId, status, resume, coverLetter, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [appId, jobId, req.userId, "pending", resume || "", coverLetter || "", now, now]
    );

    res.json({
      id: appId,
      jobId,
      status: "pending",
      createdAt: now,
    });
  } catch (error) {
    console.error("Apply error:", error);
    res.status(500).json({ error: "Failed to submit application" });
  }
});

// Get user's applications
router.get("/my-applications", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const applications = await db.all(
      `SELECT a.*, j.title, j.company, j.location, j.type, j.salary
       FROM applications a
       JOIN jobs j ON a.jobId = j.id
       WHERE a.userId = ?
       ORDER BY a.createdAt DESC`,
      [req.userId]
    );

    res.json(
      applications.map((app: any) => ({
        id: app.id,
        jobId: app.jobId,
        jobTitle: app.title,
        company: app.company,
        location: app.location,
        type: app.type,
        salary: app.salary,
        status: app.status,
        appliedAt: app.createdAt,
      }))
    );
  } catch (error) {
    console.error("Get applications error:", error);
    res.status(500).json({ error: "Failed to get applications" });
  }
});

// Get applications for a job (by employer)
router.get("/job/:jobId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();

    // Verify job ownership
    const job = await db.get("SELECT userId FROM jobs WHERE id = ?", [req.params.jobId]);
    if (!job || job.userId !== req.userId) {
      return res.status(403).json({ error: "Not authorized to view applications" });
    }

    const applications = await db.all(
      `SELECT a.*, u.firstName, u.lastName, u.email, u.phone
       FROM applications a
       JOIN users u ON a.userId = u.id
       WHERE a.jobId = ?
       ORDER BY a.createdAt DESC`,
      [req.params.jobId]
    );

    res.json(
      applications.map((app: any) => ({
        id: app.id,
        candidateName: `${app.firstName} ${app.lastName}`,
        email: app.email,
        phone: app.phone,
        status: app.status,
        resume: app.resume,
        coverLetter: app.coverLetter,
        appliedAt: app.createdAt,
      }))
    );
  } catch (error) {
    console.error("Get job applications error:", error);
    res.status(500).json({ error: "Failed to get applications" });
  }
});

// Update application status
router.put("/:id/status", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const db = await getDatabase();

    if (!["pending", "rejected", "shortlisted", "accepted"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Get application to verify permissions
    const app = await db.get(
      `SELECT a.*, j.userId FROM applications a JOIN jobs j ON a.jobId = j.id WHERE a.id = ?`,
      [req.params.id]
    );

    if (!app || app.userId !== req.userId) {
      return res.status(403).json({ error: "Not authorized to update this application" });
    }

    await db.run(
      "UPDATE applications SET status = ?, updatedAt = ? WHERE id = ?",
      [status, new Date().toISOString(), req.params.id]
    );

    res.json({ success: true, status });
  } catch (error) {
    console.error("Update application error:", error);
    res.status(500).json({ error: "Failed to update application" });
  }
});

export default router;
