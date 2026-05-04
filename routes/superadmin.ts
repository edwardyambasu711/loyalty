import express, { Router, Request, Response } from "express";
import bcryptjs from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { getDatabase, User, Organization, Blog, CaseStudy, Event, Testimonial, FeaturedJob, Job, Application, Course, Lesson, Quiz, QuizQuestion, Assignment, Enrollment } from "../src/db.js";
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

// ============ COURSES MANAGEMENT ============

// Get all courses
router.get("/courses", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const courses = await Course.find({}).sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    console.error("Get courses error:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// Get course details with lessons, quizzes, assignments, and enrollments
router.get("/courses/:courseId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const course = await Course.findOne({ id: req.params.courseId });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const lessons = await Lesson.find({ courseId: req.params.courseId }).sort({ order_index: 1 });
    const quizzes = await Quiz.find({ courseId: req.params.courseId });
    const assignments = await Assignment.find({ courseId: req.params.courseId });
    const enrollments = await Enrollment.find({ courseId: req.params.courseId });

    res.json({
      course,
      lessons,
      quizzes,
      assignments,
      enrollmentCount: enrollments.length,
      enrollments: enrollments.map((e) => ({
        id: e.id,
        userId: e.userId,
        status: e.status,
        progress: e.progress,
        completedAt: e.completedAt,
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    console.error("Get course details error:", error);
    res.status(500).json({ error: "Failed to fetch course details" });
  }
});

// Create course
router.post("/courses", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, slug, description, price, category, cover_image_url, is_published, pass_threshold } = req.body;

    if (!title || !slug) {
      return res.status(400).json({ error: "Title and slug required" });
    }

    const existing = await Course.findOne({ slug });
    if (existing) {
      return res.status(400).json({ error: "Slug already exists" });
    }

    const id = uuidv4();
    const now = new Date();

    const course = new Course({
      id,
      slug,
      title,
      description: description || "",
      price: price || "",
      category: category || "",
      cover_image_url: cover_image_url || "",
      is_published: is_published !== undefined ? is_published : true,
      pass_threshold: pass_threshold || 70,
      createdAt: now,
      updatedAt: now,
    });

    await course.save();

    res.json({ id, title, slug });
  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({ error: "Failed to create course" });
  }
});

// Update course
router.put("/courses/:courseId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, description, price, category, cover_image_url, is_published, pass_threshold } = req.body;
    const now = new Date();

    await Course.findOneAndUpdate(
      { id: req.params.courseId },
      {
        title,
        description: description || "",
        price: price || "",
        category: category || "",
        cover_image_url: cover_image_url || "",
        is_published: is_published !== undefined ? is_published : true,
        pass_threshold: pass_threshold || 70,
        updatedAt: now,
      }
    );

    res.json({ message: "Course updated" });
  } catch (error) {
    console.error("Update course error:", error);
    res.status(500).json({ error: "Failed to update course" });
  }
});

// Delete course
router.delete("/courses/:courseId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Delete all related data
    await Lesson.deleteMany({ courseId: req.params.courseId });
    await Quiz.deleteMany({ courseId: req.params.courseId });
    await Assignment.deleteMany({ courseId: req.params.courseId });
    await Enrollment.deleteMany({ courseId: req.params.courseId });
    await Course.deleteOne({ id: req.params.courseId });

    res.json({ message: "Course deleted" });
  } catch (error) {
    console.error("Delete course error:", error);
    res.status(500).json({ error: "Failed to delete course" });
  }
});

// ============ LESSONS MANAGEMENT ============

// Create lesson
router.post("/courses/:courseId/lessons", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, content, order_index, objectives, estimated_duration, videos, readings, materials } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title required" });
    }

    const id = uuidv4();
    const now = new Date();

    const lesson = new Lesson({
      id,
      courseId: req.params.courseId,
      title,
      content: content || "",
      order_index: order_index ?? 0,
      objectives: objectives || [],
      estimated_duration: estimated_duration || 0,
      videos: videos || [],
      readings: readings || [],
      materials: materials || [],
      createdAt: now,
      updatedAt: now,
    });

    await lesson.save();

    res.json({ id, title });
  } catch (error) {
    console.error("Create lesson error:", error);
    res.status(500).json({ error: "Failed to create lesson" });
  }
});

// Update lesson
router.put("/courses/:courseId/lessons/:lessonId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, content, order_index, objectives, estimated_duration, videos, readings, materials } = req.body;
    const now = new Date();

    await Lesson.findOneAndUpdate(
      { id: req.params.lessonId, courseId: req.params.courseId },
      {
        title,
        content: content || "",
        order_index: order_index ?? 0,
        objectives: objectives || [],
        estimated_duration: estimated_duration || 0,
        videos: videos || [],
        readings: readings || [],
        materials: materials || [],
        updatedAt: now,
      }
    );

    res.json({ message: "Lesson updated" });
  } catch (error) {
    console.error("Update lesson error:", error);
    res.status(500).json({ error: "Failed to update lesson" });
  }
});

// Delete lesson
router.delete("/courses/:courseId/lessons/:lessonId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Delete related quizzes
    await Quiz.deleteMany({ lessonId: req.params.lessonId });
    await Lesson.deleteOne({ id: req.params.lessonId });

    res.json({ message: "Lesson deleted" });
  } catch (error) {
    console.error("Delete lesson error:", error);
    res.status(500).json({ error: "Failed to delete lesson" });
  }
});

// ============ QUIZZES MANAGEMENT ============

// Create quiz
router.post("/courses/:courseId/quizzes", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { lessonId, title, kind, pass_threshold, questions } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title required" });
    }

    const id = uuidv4();
    const now = new Date();

    const quiz = new Quiz({
      id,
      courseId: req.params.courseId,
      lessonId: lessonId || null,
      title,
      kind: kind || "quiz",
      pass_threshold: pass_threshold || 70,
      createdAt: now,
      updatedAt: now,
    });

    await quiz.save();

    // Create questions if provided
    if (questions && Array.isArray(questions)) {
      for (const [index, q] of questions.entries()) {
        const questionId = uuidv4();
        const question = new QuizQuestion({
          id: questionId,
          quizId: id,
          prompt: q.prompt,
          options: q.options,
          correct_index: q.correct_index,
          order_index: index,
          createdAt: now,
          updatedAt: now,
        });
        await question.save();
      }
    }

    res.json({ id, title });
  } catch (error) {
    console.error("Create quiz error:", error);
    res.status(500).json({ error: "Failed to create quiz" });
  }
});

// Update quiz
router.put("/courses/:courseId/quizzes/:quizId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, kind, pass_threshold } = req.body;
    const now = new Date();

    await Quiz.findOneAndUpdate(
      { id: req.params.quizId, courseId: req.params.courseId },
      {
        title,
        kind: kind || "quiz",
        pass_threshold: pass_threshold || 70,
        updatedAt: now,
      }
    );

    res.json({ message: "Quiz updated" });
  } catch (error) {
    console.error("Update quiz error:", error);
    res.status(500).json({ error: "Failed to update quiz" });
  }
});

// Delete quiz
router.delete("/courses/:courseId/quizzes/:quizId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Delete related questions
    await QuizQuestion.deleteMany({ quizId: req.params.quizId });
    await Quiz.deleteOne({ id: req.params.quizId });

    res.json({ message: "Quiz deleted" });
  } catch (error) {
    console.error("Delete quiz error:", error);
    res.status(500).json({ error: "Failed to delete quiz" });
  }
});

// ============ ASSIGNMENTS MANAGEMENT ============

// Create assignment
router.post("/courses/:courseId/assignments", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, instructions } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title required" });
    }

    const id = uuidv4();
    const now = new Date();

    const assignment = new Assignment({
      id,
      courseId: req.params.courseId,
      title,
      instructions: instructions || "",
      createdAt: now,
      updatedAt: now,
    });

    await assignment.save();

    res.json({ id, title });
  } catch (error) {
    console.error("Create assignment error:", error);
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

// Update assignment
router.put("/courses/:courseId/assignments/:assignmentId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const { title, instructions } = req.body;
    const now = new Date();

    await Assignment.findOneAndUpdate(
      { id: req.params.assignmentId, courseId: req.params.courseId },
      {
        title,
        instructions: instructions || "",
        updatedAt: now,
      }
    );

    res.json({ message: "Assignment updated" });
  } catch (error) {
    console.error("Update assignment error:", error);
    res.status(500).json({ error: "Failed to update assignment" });
  }
});

// Delete assignment
router.delete("/courses/:courseId/assignments/:assignmentId", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await Assignment.deleteOne({ id: req.params.assignmentId });

    res.json({ message: "Assignment deleted" });
  } catch (error) {
    console.error("Delete assignment error:", error);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
});

// Get course enrollments
router.get("/courses/:courseId/enrollments", authenticateSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });

    if (user?.role !== "superadmin") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const enrollments = await Enrollment.find({ courseId: req.params.courseId });
    res.json(enrollments);
  } catch (error) {
    console.error("Get enrollments error:", error);
    res.status(500).json({ error: "Failed to fetch enrollments" });
  }
});

export default router;
