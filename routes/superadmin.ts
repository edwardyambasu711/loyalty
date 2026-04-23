import express, { Router, Request, Response } from "express";
import bcryptjs from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { getDatabase } from "../src/db.js";
import { authenticateSuperAdmin, generateToken, AuthRequest } from "../middleware/auth.js";

const router = Router();

// ============ AUTHENTICATION ============

// Superadmin Login
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized: Not a superadmin" });
    }

    const validPassword = await bcryptjs.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
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
      },
    });
  } catch (error) {
    console.error("Superadmin login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// Superadmin Register (Protected - only via direct DB insert initially)
router.post("/register", authenticateSuperAdmin, async (req: Request, res: Response) => {
  try {
    // Only allow if requesting user is superadmin
    const db = await getDatabase();
    const requestingUser = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (!requestingUser || requestingUser.role !== "superadmin") {
      return res.status(403).json({ error: "Only superadmins can create accounts" });
    }

    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const existingUser = await db.get("SELECT * FROM users WHERE email = ?", [email]);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const userId = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      "INSERT INTO users (id, email, password, firstName, lastName, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [userId, email, hashedPassword, firstName || "", lastName || "", "superadmin", now, now]
    );

    res.json({
      user: {
        id: userId,
        email,
        firstName: firstName || "",
        lastName: lastName || "",
        role: "superadmin",
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ============ USER MANAGEMENT ============

// Get all users
router.get("/users", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const users = await db.all("SELECT id, email, firstName, lastName, role, company, createdAt FROM users");
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get user details
router.get("/users/:userId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const superAdmin = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (superAdmin?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.params.userId]);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Delete user
router.delete("/users/:userId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const superAdmin = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (superAdmin?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await db.run("DELETE FROM users WHERE id = ?", [req.params.userId]);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ============ ORGANIZATIONS ============

// Get all organizations
router.get("/organizations", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const orgs = await db.all("SELECT * FROM organizations");
    res.json(orgs);
  } catch (error) {
    console.error("Get organizations error:", error);
    res.status(500).json({ error: "Failed to fetch organizations" });
  }
});

// Verify organization
router.put("/organizations/:orgId/verify", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await db.run("UPDATE organizations SET verified = 1, updatedAt = ? WHERE id = ?", [new Date().toISOString(), req.params.orgId]);
    res.json({ message: "Organization verified" });
  } catch (error) {
    console.error("Verify org error:", error);
    res.status(500).json({ error: "Failed to verify organization" });
  }
});

// ============ BLOGS ============

// Get all blogs
router.get("/blogs", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const blogs = await db.all("SELECT * FROM blogs ORDER BY createdAt DESC");
    res.json(blogs);
  } catch (error) {
    console.error("Get blogs error:", error);
    res.status(500).json({ error: "Failed to fetch blogs" });
  }
});

// Create blog
router.post("/blogs", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, content, excerpt, image, tags, published } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content required" });
    }

    const id = uuidv4();
    const slug = title.toLowerCase().replace(/\s+/g, "-");
    const now = new Date().toISOString();

    await db.run(
      "INSERT INTO blogs (id, title, slug, author, content, excerpt, image, tags, published, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, title, slug, user.email, content, excerpt || "", image || "", tags || "", published || false, now, now]
    );

    res.json({ id, title, slug });
  } catch (error) {
    console.error("Create blog error:", error);
    res.status(500).json({ error: "Failed to create blog" });
  }
});

// Update blog
router.put("/blogs/:blogId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, content, excerpt, image, tags, published } = req.body;
    const now = new Date().toISOString();

    await db.run(
      "UPDATE blogs SET title = ?, content = ?, excerpt = ?, image = ?, tags = ?, published = ?, updatedAt = ? WHERE id = ?",
      [title, content, excerpt || "", image || "", tags || "", published || false, now, req.params.blogId]
    );

    res.json({ message: "Blog updated" });
  } catch (error) {
    console.error("Update blog error:", error);
    res.status(500).json({ error: "Failed to update blog" });
  }
});

// Delete blog
router.delete("/blogs/:blogId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await db.run("DELETE FROM blogs WHERE id = ?", [req.params.blogId]);
    res.json({ message: "Blog deleted" });
  } catch (error) {
    console.error("Delete blog error:", error);
    res.status(500).json({ error: "Failed to delete blog" });
  }
});

// ============ CASE STUDIES ============

// Get all case studies
router.get("/case-studies", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const studies = await db.all("SELECT * FROM case_studies ORDER BY createdAt DESC");
    res.json(studies);
  } catch (error) {
    console.error("Get case studies error:", error);
    res.status(500).json({ error: "Failed to fetch case studies" });
  }
});

// Create case study
router.post("/case-studies", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, client, challenge, solution, results, image, tags, published } = req.body;

    if (!title || !client || !challenge || !solution || !results) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const id = uuidv4();
    const slug = title.toLowerCase().replace(/\s+/g, "-");
    const now = new Date().toISOString();

    await db.run(
      "INSERT INTO case_studies (id, title, slug, client, challenge, solution, results, image, tags, published, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, title, slug, client, challenge, solution, results, image || "", tags || "", published || false, now, now]
    );

    res.json({ id, title, slug });
  } catch (error) {
    console.error("Create case study error:", error);
    res.status(500).json({ error: "Failed to create case study" });
  }
});

// Update case study
router.put("/case-studies/:studyId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, client, challenge, solution, results, image, tags, published } = req.body;
    const now = new Date().toISOString();

    await db.run(
      "UPDATE case_studies SET title = ?, client = ?, challenge = ?, solution = ?, results = ?, image = ?, tags = ?, published = ?, updatedAt = ? WHERE id = ?",
      [title, client, challenge, solution, results, image || "", tags || "", published || false, now, req.params.studyId]
    );

    res.json({ message: "Case study updated" });
  } catch (error) {
    console.error("Update case study error:", error);
    res.status(500).json({ error: "Failed to update case study" });
  }
});

// Delete case study
router.delete("/case-studies/:studyId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await db.run("DELETE FROM case_studies WHERE id = ?", [req.params.studyId]);
    res.json({ message: "Case study deleted" });
  } catch (error) {
    console.error("Delete case study error:", error);
    res.status(500).json({ error: "Failed to delete case study" });
  }
});

// ============ EVENTS ============

// Get all events
router.get("/events", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const events = await db.all("SELECT * FROM events ORDER BY eventDate DESC");
    res.json(events);
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Create event
router.post("/events", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, description, location, eventDate, eventTime, image, capacity, published } = req.body;

    if (!title || !description || !location || !eventDate || !eventTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      "INSERT INTO events (id, title, description, location, eventDate, eventTime, image, capacity, published, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, title, description, location, eventDate, eventTime, image || "", capacity || 0, published || false, now, now]
    );

    res.json({ id, title });
  } catch (error) {
    console.error("Create event error:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// Update event
router.put("/events/:eventId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, description, location, eventDate, eventTime, image, capacity, published } = req.body;
    const now = new Date().toISOString();

    await db.run(
      "UPDATE events SET title = ?, description = ?, location = ?, eventDate = ?, eventTime = ?, image = ?, capacity = ?, published = ?, updatedAt = ? WHERE id = ?",
      [title, description, location, eventDate, eventTime, image || "", capacity || 0, published || false, now, req.params.eventId]
    );

    res.json({ message: "Event updated" });
  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({ error: "Failed to update event" });
  }
});

// Delete event
router.delete("/events/:eventId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await db.run("DELETE FROM events WHERE id = ?", [req.params.eventId]);
    res.json({ message: "Event deleted" });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

// ============ TESTIMONIALS ============

// Get all testimonials
router.get("/testimonials", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const testimonials = await db.all("SELECT * FROM testimonials ORDER BY createdAt DESC");
    res.json(testimonials);
  } catch (error) {
    console.error("Get testimonials error:", error);
    res.status(500).json({ error: "Failed to fetch testimonials" });
  }
});

// Create testimonial
router.post("/testimonials", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { name, title, company, content, image, rating, published } = req.body;

    if (!name || !title || !company || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      "INSERT INTO testimonials (id, name, title, company, content, image, rating, published, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, name, title, company, content, image || "", rating || 5, published || false, now, now]
    );

    res.json({ id, name });
  } catch (error) {
    console.error("Create testimonial error:", error);
    res.status(500).json({ error: "Failed to create testimonial" });
  }
});

// Update testimonial
router.put("/testimonials/:testimonialId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { name, title, company, content, image, rating, published } = req.body;
    const now = new Date().toISOString();

    await db.run(
      "UPDATE testimonials SET name = ?, title = ?, company = ?, content = ?, image = ?, rating = ?, published = ?, updatedAt = ? WHERE id = ?",
      [name, title, company, content, image || "", rating || 5, published || false, now, req.params.testimonialId]
    );

    res.json({ message: "Testimonial updated" });
  } catch (error) {
    console.error("Update testimonial error:", error);
    res.status(500).json({ error: "Failed to update testimonial" });
  }
});

// Delete testimonial
router.delete("/testimonials/:testimonialId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await db.run("DELETE FROM testimonials WHERE id = ?", [req.params.testimonialId]);
    res.json({ message: "Testimonial deleted" });
  } catch (error) {
    console.error("Delete testimonial error:", error);
    res.status(500).json({ error: "Failed to delete testimonial" });
  }
});

// ============ FEATURED JOBS ============

// Get featured jobs
router.get("/featured-jobs", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const featured = await db.all(
      "SELECT fj.*, j.title, j.company, j.description FROM featured_jobs fj JOIN jobs j ON fj.jobId = j.id WHERE fj.featured = 1"
    );
    res.json(featured);
  } catch (error) {
    console.error("Get featured jobs error:", error);
    res.status(500).json({ error: "Failed to fetch featured jobs" });
  }
});

// Feature a job
router.post("/featured-jobs", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { jobId, featuredUntil } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: "jobId required" });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      "INSERT INTO featured_jobs (id, jobId, featured, featuredUntil, createdAt) VALUES (?, ?, ?, ?, ?)",
      [id, jobId, true, featuredUntil || "", now]
    );

    res.json({ id, jobId });
  } catch (error) {
    console.error("Feature job error:", error);
    res.status(500).json({ error: "Failed to feature job" });
  }
});

// Remove featured job
router.delete("/featured-jobs/:featuredJobId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await db.run("DELETE FROM featured_jobs WHERE id = ?", [req.params.featuredJobId]);
    res.json({ message: "Job unfeatured" });
  } catch (error) {
    console.error("Remove featured job error:", error);
    res.status(500).json({ error: "Failed to remove featured job" });
  }
});

// ============ JOBS MANAGEMENT ============

// Get all jobs (admin view)
router.get("/jobs", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const jobs = await db.all("SELECT * FROM jobs ORDER BY createdAt DESC");
    res.json(jobs);
  } catch (error) {
    console.error("Get jobs error:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// Delete job
router.delete("/jobs/:jobId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await db.run("DELETE FROM jobs WHERE id = ?", [req.params.jobId]);
    res.json({ message: "Job deleted" });
  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({ error: "Failed to delete job" });
  }
});

// ============ APPLICATIONS MANAGEMENT ============

// Get all applications
router.get("/applications", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const applications = await db.all("SELECT * FROM applications ORDER BY createdAt DESC");
    res.json(applications);
  } catch (error) {
    console.error("Get applications error:", error);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

// Get CVs (applications with resume)
router.get("/cvs", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDatabase();
    const user = await db.get("SELECT * FROM users WHERE id = ?", [req.userId]);

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const cvs = await db.all(
      "SELECT a.*, u.email, u.firstName, u.lastName FROM applications a JOIN users u ON a.userId = u.id WHERE a.resume IS NOT NULL"
    );
    res.json(cvs);
  } catch (error) {
    console.error("Get CVs error:", error);
    res.status(500).json({ error: "Failed to fetch CVs" });
  }
});

export default router;
