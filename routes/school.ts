import express, { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDatabase, User, Course, Lesson, Quiz, QuizQuestion, Assignment, Enrollment, LessonProgress, QuizAttempt, AssignmentSubmission, Certificate } from "../src/db.js";
import { authenticateToken, verifyToken, AuthRequest } from "../middleware/auth.js";

const router = Router();

async function getUserIdFromHeader(req: Request): Promise<string | null> {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded || typeof decoded.userId !== "string") return null;
  return decoded.userId;
}

async function requireAdmin(req: AuthRequest, res: Response, next: express.NextFunction) {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });
    if (!user || !["admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({ error: "Failed to verify admin" });
  }
}

// Public course listing
router.get("/", async (req: Request, res: Response) => {
  try {
    await getDatabase();
    const published = req.query.published === "true";
    const filter: any = {};
    if (published) filter.is_published = true;
    const courses = await Course.find(filter).sort({ title: 1 });
    res.json(courses);
  } catch (error) {
    console.error("Get courses error:", error);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// Course by slug
router.get("/slug/:slug", async (req: Request, res: Response) => {
  try {
    await getDatabase();
    const course = await Course.findOne({ slug: req.params.slug });
    if (!course) return res.status(404).json({ error: "Course not found" });

    const userId = await getUserIdFromHeader(req);
    let enrolled = false;
    if (userId) {
      const enrollment = await Enrollment.findOne({ userId, courseId: course.id });
      enrolled = Boolean(enrollment);
    }

    const lessonsCount = await Lesson.countDocuments({ courseId: course.id });
    const quizzesCount = await Quiz.countDocuments({ courseId: course.id, kind: "quiz" });
    const finalExists = await Quiz.exists({ courseId: course.id, kind: "final_test" });
    const assignmentExists = await Assignment.exists({ courseId: course.id });

    res.json({
      course,
      summary: {
        lessons: lessonsCount,
        quizzes: quizzesCount,
        hasFinal: Boolean(finalExists),
        hasAssignment: Boolean(assignmentExists),
        enrolled,
      },
    });
  } catch (error) {
    console.error("Get course by slug error:", error);
    res.status(500).json({ error: "Failed to fetch course" });
  }
});

// Course summary data
router.get("/:courseId/summary", async (req: Request, res: Response) => {
  try {
    await getDatabase();
    const course = await Course.findOne({ id: req.params.courseId });
    if (!course) return res.status(404).json({ error: "Course not found" });

    const userId = await getUserIdFromHeader(req);
    let enrolled = false;
    if (userId) {
      const enrollment = await Enrollment.findOne({ userId, courseId: course.id });
      enrolled = Boolean(enrollment);
    }

    const lessonsCount = await Lesson.countDocuments({ courseId: course.id });
    const quizzesCount = await Quiz.countDocuments({ courseId: course.id, kind: "quiz" });
    const finalExists = await Quiz.exists({ courseId: course.id, kind: "final_test" });
    const assignmentExists = await Assignment.exists({ courseId: course.id });

    res.json({
      course,
      summary: {
        lessons: lessonsCount,
        quizzes: quizzesCount,
        hasFinal: Boolean(finalExists),
        hasAssignment: Boolean(assignmentExists),
        enrolled,
      },
    });
  } catch (error) {
    console.error("Get course summary error:", error);
    res.status(500).json({ error: "Failed to fetch course summary" });
  }
});

// Course content for authenticated users
router.get("/:courseId/content", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const course = await Course.findOne({ id: req.params.courseId });
    if (!course) return res.status(404).json({ error: "Course not found" });

    const lessons = await Lesson.find({ courseId: course.id }).sort({ order_index: 1 });
    const quizzes = await Quiz.find({ courseId: course.id });
    const questions = await QuizQuestion.find({ quizId: { $in: quizzes.map((q) => q.id) } }).sort({ order_index: 1 });
    const assignments = await Assignment.find({ courseId: course.id });
    const lessonProgress = await LessonProgress.find({ userId: req.userId, lessonId: { $in: lessons.map((l) => l.id) } });
    const quizAttempts = await QuizAttempt.find({ userId: req.userId, quizId: { $in: quizzes.map((q) => q.id) } });
    const assignmentSubmissions = await AssignmentSubmission.find({ userId: req.userId, assignmentId: { $in: assignments.map((a) => a.id) } });
    const certificate = await Certificate.findOne({ userId: req.userId, courseId: course.id });

    const questionsByQuiz: Record<string, any[]> = {};
    questions.forEach((question) => {
      questionsByQuiz[question.quizId] = questionsByQuiz[question.quizId] || [];
      questionsByQuiz[question.quizId].push(question);
    });

    const quizzesWithQuestions = quizzes.map((quiz) => ({
      ...quiz.toObject(),
      questions: questionsByQuiz[quiz.id] || [],
    }));

    res.json({
      course,
      lessons,
      quizzes: quizzesWithQuestions,
      assignments,
      progress: lessonProgress.map((p) => p.lessonId),
      quizAttempts: quizAttempts.map((attempt) => ({ quizId: attempt.quizId, score: attempt.score, passed: attempt.passed })),
      assignmentSubmissions: assignmentSubmissions.map((submission) => submission.assignmentId),
      certificate,
    });
  } catch (error) {
    console.error("Get course content error:", error);
    res.status(500).json({ error: "Failed to fetch course content" });
  }
});

// Enroll in course
router.post("/:courseId/enroll", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const course = await Course.findOne({ id: req.params.courseId });
    if (!course) return res.status(404).json({ error: "Course not found" });

    const existing = await Enrollment.findOne({ courseId: course.id, userId: req.userId });
    if (existing) return res.status(400).json({ error: "Already enrolled" });

    const enrollment = new Enrollment({
      id: uuidv4(),
      courseId: course.id,
      userId: req.userId,
      status: "active",
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await enrollment.save();

    res.json({ success: true, enrolled: true });
  } catch (error) {
    console.error("Enroll error:", error);
    res.status(500).json({ error: "Failed to enroll" });
  }
});

// Mark lesson complete
router.post("/:courseId/lesson-progress", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const { lessonId } = req.body;
    if (!lessonId) return res.status(400).json({ error: "Lesson ID required" });

    const lesson = await Lesson.findOne({ id: lessonId, courseId: req.params.courseId });
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });

    const existing = await LessonProgress.findOne({ userId: req.userId, lessonId });
    if (existing) return res.json({ success: true });

    const progress = new LessonProgress({
      id: uuidv4(),
      userId: req.userId,
      courseId: req.params.courseId,
      lessonId,
      createdAt: new Date(),
    });
    await progress.save();

    res.json({ success: true });
  } catch (error) {
    console.error("Mark lesson progress error:", error);
    res.status(500).json({ error: "Failed to mark lesson complete" });
  }
});

// Submit quiz attempt
router.post("/:courseId/quiz-attempts", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const { quizId, answers } = req.body;
    if (!quizId || !answers) return res.status(400).json({ error: "Quiz ID and answers are required" });

    const quiz = await Quiz.findOne({ id: quizId, courseId: req.params.courseId });
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });

    const questions = await QuizQuestion.find({ quizId }).sort({ order_index: 1 });
    let correct = 0;
    questions.forEach((question) => {
      if (answers[question.id] === question.correct_index) {
        correct += 1;
      }
    });

    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    const passed = score >= quiz.pass_threshold;

    const attempt = new QuizAttempt({
      id: uuidv4(),
      userId: req.userId,
      courseId: req.params.courseId,
      quizId,
      score,
      passed,
      answers,
      createdAt: new Date(),
    });
    await attempt.save();

    let certificate = null;
    if (quiz.kind === "final_test" && passed) {
      const existingCert = await Certificate.findOne({ userId: req.userId, courseId: req.params.courseId });
      if (!existingCert) {
        const user = await User.findOne({ id: req.userId });
        const verificationCode = `LHR-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        certificate = new Certificate({
          id: uuidv4(),
          courseId: req.params.courseId,
          userId: req.userId,
          studentName: user ? `${user.firstName} ${user.lastName}`.trim() || user.email : "Student",
          courseTitle: course.title,
          finalScore: score,
          verificationCode,
          issuedAt: new Date().toISOString(),
          createdAt: new Date(),
        });
        await certificate.save();
      }

      await Enrollment.findOneAndUpdate(
        { userId: req.userId, courseId: req.params.courseId },
        { status: "completed", progress: 100, updatedAt: new Date() }
      );
    }

    res.json({ attempt, certificate });
  } catch (error) {
    console.error("Submit quiz error:", error);
    res.status(500).json({ error: "Failed to submit quiz attempt" });
  }
});

// Submit assignment
router.post("/assignments/:assignmentId/submissions", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const { assignmentId } = req.params;
    const { submission } = req.body;
    if (!submission) return res.status(400).json({ error: "Submission text is required" });

    const assignment = await Assignment.findOne({ id: assignmentId });
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    const existing = await AssignmentSubmission.findOne({ userId: req.userId, assignmentId });
    if (existing) return res.status(400).json({ error: "Assignment already submitted" });

    const submissionDoc = new AssignmentSubmission({
      id: uuidv4(),
      userId: req.userId,
      courseId: assignment.courseId,
      assignmentId,
      submission,
      createdAt: new Date(),
    });
    await submissionDoc.save();

    res.json({ success: true });
  } catch (error) {
    console.error("Submit assignment error:", error);
    res.status(500).json({ error: "Failed to submit assignment" });
  }
});

// Verify certificate code
router.get("/certificates/verify/:code", async (req: Request, res: Response) => {
  try {
    await getDatabase();
    const certificate = await Certificate.findOne({ verificationCode: req.params.code });
    if (!certificate) return res.status(404).json({ error: "Certificate not found" });
    res.json(certificate);
  } catch (error) {
    console.error("Certificate verify error:", error);
    res.status(500).json({ error: "Failed to verify certificate" });
  }
});

// Admin course creation and updates
router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });
    if (!user || !["admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const { title, slug, description, price, category, is_published, pass_threshold, cover_image_url } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });
    const courseId = uuidv4();
    const normalizedSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const course = new Course({
      id: courseId,
      slug: normalizedSlug,
      title,
      description: description || "",
      price: price || "",
      category: category || "",
      cover_image_url: cover_image_url || "",
      is_published: is_published ?? true,
      pass_threshold: pass_threshold ?? 70,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await course.save();
    res.json(course);
  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({ error: "Failed to create course" });
  }
});

router.put("/:courseId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });
    if (!user || !["admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const { title, slug, description, price, category, is_published, pass_threshold, cover_image_url } = req.body;
    const course = await Course.findOneAndUpdate(
      { id: req.params.courseId },
      {
        title,
        slug,
        description: description || "",
        price: price || "",
        category: category || "",
        cover_image_url: cover_image_url || "",
        is_published: is_published ?? true,
        pass_threshold: pass_threshold ?? 70,
        updatedAt: new Date(),
      },
      { new: true }
    );
    if (!course) return res.status(404).json({ error: "Course not found" });
    res.json(course);
  } catch (error) {
    console.error("Update course error:", error);
    res.status(500).json({ error: "Failed to update course" });
  }
});

router.get("/:courseId/admin", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });
    if (!user || !["admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const course = await Course.findOne({ id: req.params.courseId });
    if (!course) return res.status(404).json({ error: "Course not found" });

    const lessons = await Lesson.find({ courseId: course.id }).sort({ order_index: 1 });
    const quizzes = await Quiz.find({ courseId: course.id });
    const questions = await QuizQuestion.find({ quizId: { $in: quizzes.map((q) => q.id) } }).sort({ order_index: 1 });
    const assignments = await Assignment.find({ courseId: course.id });
    const submissions = await AssignmentSubmission.find({ courseId: course.id });
    const enrollments = await Enrollment.find({ courseId: course.id });

    res.json({ course, lessons, quizzes, questions, assignments, submissions, enrollments });
  } catch (error) {
    console.error("Get admin course data error:", error);
    res.status(500).json({ error: "Failed to load course admin data" });
  }
});

// Generate AI course content (admin only)
router.post("/:courseId/generate", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });
    if (!user || !["admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const course = await Course.findOne({ id: req.params.courseId });
    if (!course) return res.status(404).json({ error: "Course not found" });

    // remove existing learning content for this course
    await Lesson.deleteMany({ courseId: course.id });
    await QuizQuestion.deleteMany({ quizId: { $in: (await Quiz.find({ courseId: course.id })).map((q) => q.id) } });
    await Quiz.deleteMany({ courseId: course.id });
    await Assignment.deleteMany({ courseId: course.id });

    const basePrompt = `${course.title} ${course.description || ""}`.trim();
    const lessonsData = [
      {
        title: `Introduction to ${course.title}`,
        content: `This lesson introduces the core ideas of ${course.title}. ${course.description || ""}`,
      },
      {
        title: `Key concepts for ${course.title}`,
        content: `In this lesson, learners explore the most important concepts, examples, and best practices for ${course.title}.`,
      },
      {
        title: `Applying ${course.title}`,
        content: `This lesson focuses on real-world application of ${course.title}, including practical steps and a short exercise.`,
      },
    ];

    const lessons = await Promise.all(
      lessonsData.map(async (lesson, index) => {
        const record = new Lesson({
          id: uuidv4(),
          courseId: course.id,
          title: lesson.title,
          content: lesson.content,
          order_index: index,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await record.save();
        return record;
      })
    );

    const quizRecords = await Promise.all(
      lessons.map(async (lesson, index) => {
        const quiz = new Quiz({
          id: uuidv4(),
          courseId: course.id,
          lessonId: lesson.id,
          title: `Quiz: ${lesson.title}`,
          kind: "quiz",
          pass_threshold: course.pass_threshold || 70,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await quiz.save();

        const questions = [
          {
            prompt: `What is the most important idea from the lesson '${lesson.title}'?`,
            options: [
              "A summary of the main concept",
              "An unrelated detail",
              "A random opinion",
              "A different course topic",
            ],
            correct_index: 0,
          },
          {
            prompt: `Which action best applies the lesson from '${lesson.title}'?`,
            options: [
              "Use the concepts in a real example",
              "Ignore the lesson",
              "Copy another course exactly",
              "Focus only on theory",
            ],
            correct_index: 0,
          },
        ];

        await Promise.all(
          questions.map(async (question, qIndex) => {
            const quizQuestion = new QuizQuestion({
              id: uuidv4(),
              quizId: quiz.id,
              prompt: question.prompt,
              options: question.options,
              correct_index: question.correct_index,
              order_index: qIndex,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            await quizQuestion.save();
            return quizQuestion;
          })
        );

        return quiz;
      })
    );

    const finalQuiz = new Quiz({
      id: uuidv4(),
      courseId: course.id,
      lessonId: null,
      title: `Final test: ${course.title}`,
      kind: "final_test",
      pass_threshold: course.pass_threshold || 70,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await finalQuiz.save();

    const finalQuestions = [
      {
        prompt: `Which statement best describes the core value of ${course.title}?`,
        options: [
          "A clear summary of the course highlights",
          "An unrelated concept",
          "A vague idea without focus",
          "A different subject entirely",
        ],
        correct_index: 0,
      },
      {
        prompt: `After completing ${course.title}, what should learners be able to do?`,
        options: [
          "Apply the main concepts in practice",
          "Repeat the course title only",
          "Ignore the course material",
          "Change the subject to something else",
        ],
        correct_index: 0,
      },
    ];
    await Promise.all(
      finalQuestions.map(async (question, qIndex) => {
        const quizQuestion = new QuizQuestion({
          id: uuidv4(),
          quizId: finalQuiz.id,
          prompt: question.prompt,
          options: question.options,
          correct_index: question.correct_index,
          order_index: qIndex,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await quizQuestion.save();
        return quizQuestion;
      })
    );

    const assignment = new Assignment({
      id: uuidv4(),
      courseId: course.id,
      title: `Capstone assignment for ${course.title}`,
      instructions: `Write a short plan explaining how you would apply the key lessons from ${course.title} in a real workplace or project.`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await assignment.save();

    const returnedLessons = await Lesson.find({ courseId: course.id }).sort({ order_index: 1 });
    const returnedQuizzes = await Quiz.find({ courseId: course.id });
    const returnedQuestions = await QuizQuestion.find({ quizId: { $in: returnedQuizzes.map((q) => q.id) } }).sort({ order_index: 1 });
    const returnedAssignments = await Assignment.find({ courseId: course.id });

    res.json({ course, lessons: returnedLessons, quizzes: returnedQuizzes, questions: returnedQuestions, assignments: returnedAssignments });
  } catch (error) {
    console.error("Generate course content error:", error);
    res.status(500).json({ error: "Failed to generate course content" });
  }
});

// Lessons CRUD
router.post("/lessons", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });
    if (!user || !["admin", "superadmin"].includes(user.role)) return res.status(403).json({ error: "Not authorized" });
    const { courseId, title, content, order_index } = req.body;
    if (!courseId || !title) return res.status(400).json({ error: "Course and title are required" });
    const lesson = new Lesson({ id: uuidv4(), courseId, title, content: content || "", order_index: order_index ?? 0, createdAt: new Date(), updatedAt: new Date() });
    await lesson.save();
    res.json(lesson);
  } catch (error) {
    console.error("Create lesson error:", error);
    res.status(500).json({ error: "Failed to create lesson" });
  }
});

router.put("/lessons/:lessonId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });
    if (!user || !["admin", "superadmin"].includes(user.role)) return res.status(403).json({ error: "Not authorized" });
    const { title, content, order_index } = req.body;
    const lesson = await Lesson.findOneAndUpdate(
      { id: req.params.lessonId },
      { title, content: content || "", order_index: order_index ?? 0, updatedAt: new Date() },
      { new: true }
    );
    if (!lesson) return res.status(404).json({ error: "Lesson not found" });
    res.json(lesson);
  } catch (error) {
    console.error("Update lesson error:", error);
    res.status(500).json({ error: "Failed to update lesson" });
  }
});

router.delete("/lessons/:lessonId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });
    if (!user || !["admin", "superadmin"].includes(user.role)) return res.status(403).json({ error: "Not authorized" });
    await Lesson.deleteOne({ id: req.params.lessonId });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete lesson error:", error);
    res.status(500).json({ error: "Failed to delete lesson" });
  }
});

// Quizzes CRUD
router.post("/quizzes", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });
    if (!user || !["admin", "superadmin"].includes(user.role)) return res.status(403).json({ error: "Not authorized" });
    const { courseId, lessonId, title, kind, pass_threshold } = req.body;
    if (!courseId || !title || !kind) return res.status(400).json({ error: "Course, title, and kind are required" });
    const quiz = new Quiz({ id: uuidv4(), courseId, lessonId: lessonId || null, title, kind, pass_threshold: pass_threshold ?? 70, createdAt: new Date(), updatedAt: new Date() });
    await quiz.save();
    res.json(quiz);
  } catch (error) {
    console.error("Create quiz error:", error);
    res.status(500).json({ error: "Failed to create quiz" });
  }
});

router.put("/quizzes/:quizId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });
    if (!user || !["admin", "superadmin"].includes(user.role)) return res.status(403).json({ error: "Not authorized" });
    const { title, kind, pass_threshold, lessonId } = req.body;
    const quiz = await Quiz.findOneAndUpdate(
      { id: req.params.quizId },
      { title, kind, pass_threshold: pass_threshold ?? 70, lessonId: lessonId || null, updatedAt: new Date() },
      { new: true }
    );
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });
    res.json(quiz);
  } catch (error) {
    console.error("Update quiz error:", error);
    res.status(500).json({ error: "Failed to update quiz" });
  }
});

router.delete("/quizzes/:quizId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });
    if (!user || !["admin", "superadmin"].includes(user.role)) return res.status(403).json({ error: "Not authorized" });
    await Quiz.deleteOne({ id: req.params.quizId });
    await QuizQuestion.deleteMany({ quizId: req.params.quizId });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete quiz error:", error);
    res.status(500).json({ error: "Failed to delete quiz" });
  }
});

// Quiz questions CRUD
router.post("/quiz-questions", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });
    if (!user || !["admin", "superadmin"].includes(user.role)) return res.status(403).json({ error: "Not authorized" });
    const { quizId, prompt, options, correct_index, order_index } = req.body;
    if (!quizId || !prompt || !options) return res.status(400).json({ error: "Quiz ID, prompt, and options are required" });
    const question = new QuizQuestion({
      id: uuidv4(),
      quizId,
      prompt,
      options,
      correct_index,
      order_index: order_index ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await question.save();
    res.json(question);
  } catch (error) {
    console.error("Create quiz question error:", error);
    res.status(500).json({ error: "Failed to create quiz question" });
  }
});

router.put("/quiz-questions/:questionId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });
    if (!user || !["admin", "superadmin"].includes(user.role)) return res.status(403).json({ error: "Not authorized" });
    const { prompt, options, correct_index, order_index } = req.body;
    const question = await QuizQuestion.findOneAndUpdate(
      { id: req.params.questionId },
      { prompt, options, correct_index, order_index: order_index ?? 0, updatedAt: new Date() },
      { new: true }
    );
    if (!question) return res.status(404).json({ error: "Question not found" });
    res.json(question);
  } catch (error) {
    console.error("Update quiz question error:", error);
    res.status(500).json({ error: "Failed to update quiz question" });
  }
});

router.delete("/quiz-questions/:questionId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });
    if (!user || !["admin", "superadmin"].includes(user.role)) return res.status(403).json({ error: "Not authorized" });
    await QuizQuestion.deleteOne({ id: req.params.questionId });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete quiz question error:", error);
    res.status(500).json({ error: "Failed to delete quiz question" });
  }
});

// Assignment CRUD
router.post("/assignments", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });
    if (!user || !["admin", "superadmin"].includes(user.role)) return res.status(403).json({ error: "Not authorized" });
    const { courseId, title, instructions } = req.body;
    if (!courseId || !title) return res.status(400).json({ error: "Course and title are required" });
    const assignment = new Assignment({ id: uuidv4(), courseId, title, instructions: instructions || "", createdAt: new Date(), updatedAt: new Date() });
    await assignment.save();
    res.json(assignment);
  } catch (error) {
    console.error("Create assignment error:", error);
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

router.put("/assignments/:assignmentId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });
    if (!user || !["admin", "superadmin"].includes(user.role)) return res.status(403).json({ error: "Not authorized" });
    const { title, instructions } = req.body;
    const assignment = await Assignment.findOneAndUpdate(
      { id: req.params.assignmentId },
      { title, instructions: instructions || "", updatedAt: new Date() },
      { new: true }
    );
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    res.json(assignment);
  } catch (error) {
    console.error("Update assignment error:", error);
    res.status(500).json({ error: "Failed to update assignment" });
  }
});

router.delete("/assignments/:assignmentId", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    await getDatabase();
    const user = await User.findOne({ id: req.userId });
    if (!user || !["admin", "superadmin"].includes(user.role)) return res.status(403).json({ error: "Not authorized" });
    await Assignment.deleteOne({ id: req.params.assignmentId });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete assignment error:", error);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
});

export default router;
