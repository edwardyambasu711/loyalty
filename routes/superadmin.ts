import express, { Router, Request, Response } from "express";
import bcryptjs from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { getDatabase, User, Organization, Blog, CaseStudy, Event, Testimonial, FeaturedJob, Job, Application } from "../src/db.js";
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

    await getDatabase();

    const user = await User.findOne({ email });

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
    await getDatabase();
    const requestingUser = await User.findOne({ id: req.userId });

    if (!requestingUser || requestingUser.role !== "superadmin") {
      return res.status(403).json({ error: "Only superadmins can create accounts" });
    }

    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const userId = uuidv4();
    const now = new Date();

    const user = new User({
      id: userId,
      email,
      password: hashedPassword,
      firstName: firstName || "",
      lastName: lastName || "",
      role: "superadmin",
      createdAt: now,
      updatedAt: now,
    });

    await user.save();

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
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const users = await User.find({}, { id: 1, email: 1, firstName: 1, lastName: 1, role: 1, company: 1, createdAt: 1 });
    res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get user details
router.get("/users/:userId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const superAdmin = await User.findOne({ id: req.userId });

    if (superAdmin?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const user = await User.findOne({ id: req.params.userId });
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
    await getDatabase();
    const superAdmin = await User.findOne({ id: req.userId });

    if (superAdmin?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await User.deleteOne({ id: req.params.userId });
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
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const orgs = await Organization.find({});
    res.json(orgs);
  } catch (error) {
    console.error("Get organizations error:", error);
    res.status(500).json({ error: "Failed to fetch organizations" });
  }
});

// Verify organization
router.put("/organizations/:orgId/verify", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await Organization.findOneAndUpdate(
      { id: req.params.orgId },
      { verified: true, updatedAt: new Date() }
    );
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
    await getDatabase();
    const blogs = await Blog.find({}).sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    console.error("Get blogs error:", error);
    res.status(500).json({ error: "Failed to fetch blogs" });
  }
});

// Create blog
router.post("/blogs", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, content, excerpt, image, tags, published } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content required" });
    }

    const id = uuidv4();
    const slug = title.toLowerCase().replace(/\s+/g, "-");
    const now = new Date();

    const blog = new Blog({
      id,
      title,
      slug,
      author: user.email,
      content,
      excerpt: excerpt || "",
      image: image || "",
      tags: tags || "",
      published: published || false,
      createdAt: now,
      updatedAt: now,
    });

    await blog.save();

    res.json({ id, title, slug });
  } catch (error) {
    console.error("Create blog error:", error);
    res.status(500).json({ error: "Failed to create blog" });
  }
});

// Update blog
router.put("/blogs/:blogId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, content, excerpt, image, tags, published } = req.body;
    const now = new Date();

    await Blog.findOneAndUpdate(
      { id: req.params.blogId },
      {
        title,
        content,
        excerpt: excerpt || "",
        image: image || "",
        tags: tags || "",
        published: published || false,
        updatedAt: now,
      }
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
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await Blog.deleteOne({ id: req.params.blogId });
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
    await getDatabase();
    const studies = await CaseStudy.find({}).sort({ createdAt: -1 });
    res.json(studies);
  } catch (error) {
    console.error("Get case studies error:", error);
    res.status(500).json({ error: "Failed to fetch case studies" });
  }
});

// Create case study
router.post("/case-studies", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, client, challenge, solution, results, image, tags, published } = req.body;

    if (!title || !client || !challenge || !solution || !results) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const id = uuidv4();
    const slug = title.toLowerCase().replace(/\s+/g, "-");
    const now = new Date();

    const caseStudy = new CaseStudy({
      id,
      title,
      slug,
      client,
      challenge,
      solution,
      results,
      image: image || "",
      tags: tags || "",
      published: published || false,
      createdAt: now,
      updatedAt: now,
    });

    await caseStudy.save();

    res.json({ id, title, slug });
  } catch (error) {
    console.error("Create case study error:", error);
    res.status(500).json({ error: "Failed to create case study" });
  }
});

// Update case study
router.put("/case-studies/:studyId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, client, challenge, solution, results, image, tags, published } = req.body;
    const now = new Date();

    await CaseStudy.findOneAndUpdate(
      { id: req.params.studyId },
      {
        title,
        client,
        challenge,
        solution,
        results,
        image: image || "",
        tags: tags || "",
        published: published || false,
        updatedAt: now,
      }
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
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await CaseStudy.deleteOne({ id: req.params.studyId });
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
    await getDatabase();
    const events = await Event.find({}).sort({ eventDate: -1 });
    res.json(events);
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Create event
router.post("/events", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, description, location, eventDate, eventTime, image, capacity, published } = req.body;

    if (!title || !description || !location || !eventDate || !eventTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const id = uuidv4();
    const now = new Date();

    const event = new Event({
      id,
      title,
      description,
      location,
      eventDate,
      eventTime,
      image: image || "",
      capacity: capacity || 0,
      published: published || false,
      createdAt: now,
      updatedAt: now,
    });

    await event.save();

    res.json({ id, title });
  } catch (error) {
    console.error("Create event error:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// Update event
router.put("/events/:eventId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, description, location, eventDate, eventTime, image, capacity, published } = req.body;
    const now = new Date();

    await Event.findOneAndUpdate(
      { id: req.params.eventId },
      {
        title,
        description,
        location,
        eventDate,
        eventTime,
        image: image || "",
        capacity: capacity || 0,
        published: published || false,
        updatedAt: now,
      }
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
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await Event.deleteOne({ id: req.params.eventId });
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
    await getDatabase();
    const testimonials = await Testimonial.find({}).sort({ createdAt: -1 });
    res.json(testimonials);
  } catch (error) {
    console.error("Get testimonials error:", error);
    res.status(500).json({ error: "Failed to fetch testimonials" });
  }
});

// Create testimonial
router.post("/testimonials", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { name, title, company, content, image, rating, published } = req.body;

    if (!name || !title || !company || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const id = uuidv4();
    const now = new Date();

    const testimonial = new Testimonial({
      id,
      name,
      title,
      company,
      content,
      image: image || "",
      rating: rating || 5,
      published: published || false,
      createdAt: now,
      updatedAt: now,
    });

    await testimonial.save();

    res.json({ id, name });
  } catch (error) {
    console.error("Create testimonial error:", error);
    res.status(500).json({ error: "Failed to create testimonial" });
  }
});

// Update testimonial
router.put("/testimonials/:testimonialId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { name, title, company, content, image, rating, published } = req.body;
    const now = new Date();

    await Testimonial.findOneAndUpdate(
      { id: req.params.testimonialId },
      {
        name,
        title,
        company,
        content,
        image: image || "",
        rating: rating || 5,
        published: published || false,
        updatedAt: now,
      }
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
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await Testimonial.deleteOne({ id: req.params.testimonialId });
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
    await getDatabase();
    const featured = await FeaturedJob.find({ featured: true }).populate('jobId');
    res.json(featured);
  } catch (error) {
    console.error("Get featured jobs error:", error);
    res.status(500).json({ error: "Failed to fetch featured jobs" });
  }
});

// Feature a job
router.post("/featured-jobs", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { jobId, featuredUntil } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: "jobId required" });
    }

    const id = uuidv4();
    const now = new Date();

    const featuredJob = new FeaturedJob({
      id,
      jobId,
      featured: true,
      featuredUntil: featuredUntil || null,
      createdAt: now,
    });

    await featuredJob.save();

    res.json({ id, jobId });
  } catch (error) {
    console.error("Feature job error:", error);
    res.status(500).json({ error: "Failed to feature job" });
  }
});

// Remove featured job
router.delete("/featured-jobs/:featuredJobId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await FeaturedJob.deleteOne({ id: req.params.featuredJobId });
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
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const jobs = await Job.find({}).sort({ createdAt: -1 });
    res.json(jobs);
  } catch (error) {
    console.error("Get jobs error:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// Delete job
router.delete("/jobs/:jobId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await Job.deleteOne({ id: req.params.jobId });
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
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const applications = await Application.find({}).sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    console.error("Get applications error:", error);
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

// Get CVs (applications with resume)
router.get("/cvs", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const cvs = await Application.find({ resume: { $ne: null } }).populate('userId', 'email firstName lastName');
    res.json(cvs);
  } catch (error) {
    console.error("Get CVs error:", error);
    res.status(500).json({ error: "Failed to fetch CVs" });
  }
});

export default router;
