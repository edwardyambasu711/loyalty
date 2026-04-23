import express, { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDatabase, Application, Job, User } from "../src/db.js";
import { authenticateToken, AuthRequest } from "../middleware/auth.js";

const router = Router();

// Apply to a job
router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { jobId, resume, coverLetter } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: "Job ID required" });
    }

    await getDatabase();

    // Check if job exists
    const job = await Job.findOne({ id: jobId });
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Check if already applied
    const existing = await Application.findOne({ jobId, userId: req.userId });
    if (existing) {
      return res.status(400).json({ error: "Already applied to this job" });
    }

    const appId = uuidv4();

    const application = new Application({
      id: appId,
      jobId,
      userId: req.userId,
      status: "pending",
      resume: resume || "",
      coverLetter: coverLetter || "",
    });

    await application.save();

    res.json({
      id: appId,
      jobId,
      status: "pending",
      createdAt: application.createdAt,
    });
  } catch (error) {
    console.error("Apply error:", error);
    res.status(500).json({ error: "Failed to submit application" });
  }
});

// Get user's applications
router.get("/my-applications", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();

    const applications = await Application.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .populate('jobId', 'title company location type salary');

    res.json(
      applications.map((app: any) => ({
        id: app.id,
        jobId: app.jobId?.id,
        jobTitle: app.jobId?.title,
        company: app.jobId?.company,
        location: app.jobId?.location,
        type: app.jobId?.type,
        salary: app.jobId?.salary,
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
    await getDatabase();

    // Verify job ownership
    const job = await Job.findOne({ id: req.params.jobId });
    if (!job || job.userId !== req.userId) {
      return res.status(403).json({ error: "Not authorized to view applications" });
    }

    const applications = await Application.find({ jobId: req.params.jobId })
      .sort({ createdAt: -1 })
      .populate('userId', 'firstName lastName email phone');

    res.json(
      applications.map((app: any) => ({
        id: app.id,
        candidateName: `${app.userId?.firstName} ${app.userId?.lastName}`,
        email: app.userId?.email,
        phone: app.userId?.phone,
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
    await getDatabase();

    if (!["pending", "rejected", "shortlisted", "accepted"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Get application to verify permissions
    const app = await Application.findOne({ id: req.params.id }).populate('jobId', 'userId');
    if (!app || app.jobId?.userId !== req.userId) {
      return res.status(403).json({ error: "Not authorized to update this application" });
    }

    await Application.findOneAndUpdate(
      { id: req.params.id },
      { status, updatedAt: new Date() }
    );

    res.json({ success: true, status });
  } catch (error) {
    console.error("Update application error:", error);
    res.status(500).json({ error: "Failed to update application" });
  }
});

export default router;
