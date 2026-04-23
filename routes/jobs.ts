import express, { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDatabase, Job, User } from "../src/db.js";
import { authenticateToken, AuthRequest } from "../middleware/auth.js";

const router = Router();

// Get all jobs
router.get("/", async (req: Request, res: Response) => {
  try {
    await getDatabase();

    const jobs = await Job.find().sort({ createdAt: -1 }).populate('userId', 'company firstName lastName');

    const formattedJobs = jobs.map((job: any) => ({
      id: job.id,
      title: job.title,
      company: job.company || "Loyalty HR inc",
      location: job.location,
      type: job.type,
      salary: job.salary,
      posted: job.posted,
      description: job.description,
      requirements: Array.isArray(job.requirements) ? job.requirements : [],
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
    await getDatabase();

    const job = await Job.findOne({ id: req.params.id }).populate('userId', 'company email phone');

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
      requirements: Array.isArray(job.requirements) ? job.requirements : [],
      userId: job.userId?.id,
      contactEmail: job.userId?.email,
      contactPhone: job.userId?.phone,
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

    await getDatabase();

    // Get user to get their company name
    const user = await User.findOne({ id: req.userId });

    const jobId = uuidv4();
    const now = new Date();

    const job = new Job({
      id: jobId,
      title,
      company: user?.company || "Loyalty HR inc",
      userId: req.userId,
      location,
      type,
      salary,
      description,
      requirements: Array.isArray(requirements) ? requirements : [],
      posted: now,
    });

    await job.save();

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
    await getDatabase();

    // Check ownership
    const job = await Job.findOne({ id: req.params.id });
    if (!job || job.userId !== req.userId) {
      return res.status(403).json({ error: "Not authorized to update this job" });
    }

    await Job.findOneAndUpdate(
      { id: req.params.id },
      {
        title: title || job.title,
        location: location || job.location,
        type: type || job.type,
        salary: salary || job.salary,
        description: description || job.description,
        requirements: requirements ? (Array.isArray(requirements) ? requirements : job.requirements) : job.requirements,
        updatedAt: new Date(),
      }
    );

    const updated = await Job.findOne({ id: req.params.id });
    res.json({
      id: updated?.id,
      title: updated?.title,
      company: updated?.company,
      location: updated?.location,
      type: updated?.type,
      salary: updated?.salary,
      description: updated?.description,
      requirements: Array.isArray(updated?.requirements) ? updated.requirements : [],
      posted: updated?.posted,
    });
  } catch (error) {
    console.error("Update job error:", error);
    res.status(500).json({ error: "Failed to update job" });
  }
});

// Delete job
router.delete("/:id", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();

    // Check ownership
    const job = await Job.findOne({ id: req.params.id });
    if (!job || job.userId !== req.userId) {
      return res.status(403).json({ error: "Not authorized to delete this job" });
    }

    await Job.findOneAndDelete({ id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({ error: "Failed to delete job" });
  }
});

// Get user's jobs
router.get("/user/my-jobs", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();

    const jobs = await Job.find({ userId: req.userId }).sort({ createdAt: -1 });

    const formattedJobs = jobs.map((job: any) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      type: job.type,
      salary: job.salary,
      posted: job.posted,
      description: job.description,
      requirements: Array.isArray(job.requirements) ? job.requirements : [],
    }));

    res.json(formattedJobs);
  } catch (error) {
    console.error("Get user jobs error:", error);
    res.status(500).json({ error: "Failed to get jobs" });
  }
});

export default router;
