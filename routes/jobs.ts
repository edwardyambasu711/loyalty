import express, { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../src/db.js";
import { authenticateToken, AuthRequest } from "../middleware/auth.js";

const router = Router();

// Get all jobs
router.get("/", async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const jobs = await db.all(
      `SELECT j.*, u.company, u.firstName, u.lastName 
       FROM jobs j 
       LEFT JOIN users u ON j.userId = u.id 
       ORDER BY j.createdAt DESC`
    );

    const formattedJobs = jobs.map((job: any) => ({
      id: job.id,
      title: job.title,
      company: job.company || "Loyalty HR inc",
      location: job.location,
      type: job.type,
      salary: job.salary,
      posted: job.posted,
      description: job.description,
      requirements: JSON.parse(job.requirements || "[]"),
    }));

    res.json(formattedJobs);
  } catch (error) {
    console.error("Get jobs error:", error);
    res.status(500).json({ error: "Failed to get jobs" });
  }
});

// Get job by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDatabase();
    const job = await db.get(
      `SELECT j.*, u.company, u.email, u.phone 
       FROM jobs j 
       LEFT JOIN users u ON j.userId = u.id 
       WHERE j.id = ?`,
      [req.params.id]
    );

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({
      id: job.id,
      title: job.title,
      company: job.company || "Loyalty HR inc",
      location: job.location,
      type: job.type,
      salary: job.salary,
      posted: job.posted,
      description: job.description,
      requirements: JSON.parse(job.requirements || "[]"),
      userId: job.userId,
      contactEmail: job.email,
      contactPhone: job.phone,
    });
  } catch (error) {
    console.error("Get job error:", error);
    res.status(500).json({ error: "Failed to get job" });
  }
});

// Create job (authenticated)
router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { title, location, type, salary, description, requirements } = req.body;

    if (!title || !location || !type || !salary || !description) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const db = await getDatabase();
    const jobId = uuidv4();
    const now = new Date().toISOString();

    // Get user to get their company name
    const user = await db.get("SELECT company FROM users WHERE id = ?", [req.userId]);

    await db.run(
      `INSERT INTO jobs (id, title, company, userId, location, type, salary, description, requirements, posted, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        jobId,
        title,
        user?.company || "Loyalty HR inc",
        req.userId,
        location,
        type,
        salary,
        description,
        JSON.stringify(Array.isArray(requirements) ? requirements : []),
        now,
        now,
        now,
      ]
    );

    res.json({
      id: jobId,
      title,
      company: user?.company || "Loyalty HR inc",
      location,
      type,
      salary,
      description,
      requirements: Array.isArray(requirements) ? requirements : [],
      posted: now,
    });
  } catch (error) {
    console.error("Create job error:", error);
    res.status(500).json({ error: "Failed to create job" });
  }
});

// Update job
router.put("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { title, location, type, salary, description, requirements } = req.body;
    const db = await getDatabase();

    // Check ownership
    const job = await db.get("SELECT userId FROM jobs WHERE id = ?", [req.params.id]);
    if (!job || job.userId !== req.userId) {
      return res.status(403).json({ error: "Not authorized to update this job" });
    }

    await db.run(
      `UPDATE jobs SET title = ?, location = ?, type = ?, salary = ?, description = ?, requirements = ?, updatedAt = ? WHERE id = ?`,
      [
        title || job.title,
        location || job.location,
        type || job.type,
        salary || job.salary,
        description || job.description,
        requirements ? JSON.stringify(requirements) : job.requirements,
        new Date().toISOString(),
        req.params.id,
      ]
    );

    const updated = await db.get("SELECT * FROM jobs WHERE id = ?", [req.params.id]);
    res.json({
      id: updated.id,
      title: updated.title,
      company: updated.company,
      location: updated.location,
      type: updated.type,
      salary: updated.salary,
      description: updated.description,
      requirements: JSON.parse(updated.requirements),
      posted: updated.posted,
    });
  } catch (error) {
    console.error("Update job error:", error);
    res.status(500).json({ error: "Failed to update job" });
  }
});

// Delete job
router.delete("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();

    // Check ownership
    const job = await db.get("SELECT userId FROM jobs WHERE id = ?", [req.params.id]);
    if (!job || job.userId !== req.userId) {
      return res.status(403).json({ error: "Not authorized to delete this job" });
    }

    await db.run("DELETE FROM jobs WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({ error: "Failed to delete job" });
  }
});

// Get user's jobs
router.get("/user/my-jobs", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const jobs = await db.all(
      "SELECT * FROM jobs WHERE userId = ? ORDER BY createdAt DESC",
      [req.userId]
    );

    const formattedJobs = jobs.map((job: any) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      type: job.type,
      salary: job.salary,
      posted: job.posted,
      description: job.description,
      requirements: JSON.parse(job.requirements || "[]"),
    }));

    res.json(formattedJobs);
  } catch (error) {
    console.error("Get user jobs error:", error);
    res.status(500).json({ error: "Failed to get jobs" });
  }
});

export default router;
