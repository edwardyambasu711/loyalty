import dotenv from "dotenv";
import bcryptjs from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { initializeDatabase, User, Course, Lesson, Quiz, QuizQuestion, Assignment, Enrollment } from "../src/db.js";

dotenv.config();

async function createUserIfMissing(email: string, password: string, firstName: string, lastName: string, role: string) {
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`User already exists: ${email}`);
    return existing;
  }

  const hashedPassword = await bcryptjs.hash(password, 10);
  const user = new User({
    id: uuidv4(),
    email,
    password: hashedPassword,
    firstName,
    lastName,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await user.save();
  console.log(`Created user: ${email} (${role})`);
  return user;
}

async function createCourseContent(courseData: any) {
  let course = await Course.findOne({ slug: courseData.slug });
  if (!course) {
    course = new Course({
      id: uuidv4(),
      slug: courseData.slug,
      title: courseData.title,
      description: courseData.description,
      price: courseData.price,
      category: courseData.category,
      cover_image_url: courseData.cover_image_url || "",
      is_published: true,
      pass_threshold: courseData.pass_threshold || 70,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await course.save();
    console.log(`Created course: ${course.title}`);
  } else {
    console.log(`Course already exists: ${course.title}`);
  }

  for (const lessonData of courseData.lessons) {
    let lesson = await Lesson.findOne({ courseId: course.id, title: lessonData.title });
    if (!lesson) {
      lesson = new Lesson({
        id: uuidv4(),
        courseId: course.id,
        title: lessonData.title,
        content: lessonData.content,
        order_index: lessonData.order_index,
        objectives: lessonData.objectives || [],
        estimated_duration: lessonData.estimated_duration || 30,
        videos: lessonData.videos || [],
        readings: lessonData.readings || [],
        materials: lessonData.materials || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await lesson.save();
      console.log(`  Created lesson: ${lesson.title}`);
    } else {
      console.log(`  Lesson already exists: ${lesson.title}`);
    }

    for (const quizData of lessonData.quizzes) {
      let quiz = await Quiz.findOne({ courseId: course.id, lessonId: lesson.id, title: quizData.title });
      if (!quiz) {
        quiz = new Quiz({
          id: uuidv4(),
          courseId: course.id,
          lessonId: lesson.id,
          title: quizData.title,
          kind: "quiz",
          pass_threshold: course.pass_threshold,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await quiz.save();
        console.log(`    Created quiz: ${quiz.title}`);
      }

      for (const [index, questionData] of quizData.questions.entries()) {
        const existingQuestion = await QuizQuestion.findOne({ quizId: quiz.id, prompt: questionData.prompt });
        if (!existingQuestion) {
          const question = new QuizQuestion({
            id: uuidv4(),
            quizId: quiz.id,
            prompt: questionData.prompt,
            options: questionData.options,
            correct_index: questionData.correct_index,
            order_index: index,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await question.save();
          console.log(`      Created quiz question: ${question.prompt}`);
        }
      }
    }

    const existingAssignment = await Assignment.findOne({ courseId: course.id, title: lessonData.assignment.title });
    if (!existingAssignment) {
      const assignment = new Assignment({
        id: uuidv4(),
        courseId: course.id,
        title: lessonData.assignment.title,
        instructions: lessonData.assignment.instructions,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await assignment.save();
      console.log(`  Created assignment: ${assignment.title}`);
    }
  }

  let finalQuiz = await Quiz.findOne({ courseId: course.id, kind: "final_test" });
  if (!finalQuiz) {
    finalQuiz = new Quiz({
      id: uuidv4(),
      courseId: course.id,
      lessonId: null,
      title: `${course.title} Final Test`,
      kind: "final_test",
      pass_threshold: course.pass_threshold,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await finalQuiz.save();
    console.log(`  Created final test: ${finalQuiz.title}`);
  }

  for (const [index, questionData] of courseData.finalQuiz.questions.entries()) {
    const existingQuestion = await QuizQuestion.findOne({ quizId: finalQuiz.id, prompt: questionData.prompt });
    if (!existingQuestion) {
      const question = new QuizQuestion({
        id: uuidv4(),
        quizId: finalQuiz.id,
        prompt: questionData.prompt,
        options: questionData.options,
        correct_index: questionData.correct_index,
        order_index: index,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await question.save();
      console.log(`    Created final test question: ${question.prompt}`);
    }
  }
}

async function main() {
  await initializeDatabase();

  const adminUser = await createUserIfMissing("admin@loyaltyhr.com", "Admin123!", "Loyalty", "Admin", "superadmin");
  const studentUser = await createUserIfMissing("student@loyaltyhr.com", "Student123!", "Student", "Demo", "candidate");

  const courses = [
    {
      slug: "managing-meetings",
      title: "Managing Meetings",
      description: "Master the art of running efficient, productive meetings that drive results and respect everyone's time.",
      price: "$50",
      category: "HR Training",
      pass_threshold: 70,
      lessons: [
        {
          title: "Meeting Preparation & Strategy",
          content: `Learn how to plan agenda items, invite the right people, and prepare materials so meetings start and finish on time.
          
This lesson covers:
- Pre-meeting assessment and objectives
- Participant selection criteria
- Agenda design and distribution
- Materials preparation
- Timeline management
- Virtual meeting setup best practices`,
          order_index: 0,
          objectives: [
            "Understand the core principles of effective meeting preparation",
            "Design clear, actionable meeting agendas",
            "Select appropriate participants for different meeting types",
            "Prepare supporting materials and documentation",
          ],
          estimated_duration: 45,
          videos: [
            {
              id: uuidv4().slice(0, 8),
              title: "Planning an Effective Meeting Agenda",
              url: "https://example.com/videos/meeting-agenda.mp4",
              transcript: "This video walks through creating a structured agenda that keeps meetings on track...",
              duration: 12,
            },
            {
              id: uuidv4().slice(0, 8),
              title: "Selecting the Right Participants",
              url: "https://example.com/videos/participants.mp4",
              transcript: "Learn how to choose who should attend to ensure productive discussions...",
              duration: 8,
            },
          ],
          readings: [
            {
              id: uuidv4().slice(0, 8),
              title: "Harvard Business Review: Meeting Efficiency",
              url: "https://example.com/articles/hbr-meetings",
              content: "Article on latest research about meeting productivity...",
              type: "external",
            },
            {
              id: uuidv4().slice(0, 8),
              title: "Meeting Preparation Checklist",
              url: "https://example.com/resources/checklist.pdf",
              content: "Downloadable PDF checklist for meeting preparation",
              type: "pdf",
            },
          ],
          materials: [
            {
              id: uuidv4().slice(0, 8),
              name: "Meeting Agenda Template",
              url: "https://example.com/templates/agenda.docx",
              type: "template",
            },
            {
              id: uuidv4().slice(0, 8),
              name: "Participant Analysis Worksheet",
              url: "https://example.com/templates/participants.xlsx",
              type: "worksheet",
            },
          ],
          quizzes: [
            {
              title: "Meeting Preparation Quiz",
              questions: [
                {
                  prompt: "What is the first step when planning a meeting?",
                  options: ["Create a clear agenda", "Invite everyone in the company", "Book the biggest room", "Choose refreshments"],
                  correct_index: 0,
                },
                {
                  prompt: "A good meeting agenda should include:",
                  options: ["Topics, time slots, and desired outcomes", "A lot of details unrelated to the meeting", "Only the meeting title", "No structure"],
                  correct_index: 0,
                },
                {
                  prompt: "How far in advance should you typically send the agenda?",
                  options: ["At least 24-48 hours before", "Right when the meeting starts", "A week before", "Never - keep it a surprise"],
                  correct_index: 0,
                },
              ],
            },
          ],
          assignment: {
            title: "Create a Meeting Agenda",
            instructions: `Design a realistic meeting agenda for one of these scenarios:
1. Quarterly business review with 8 stakeholders
2. Weekly team sync for a department
3. One-on-one performance discussion
4. All-hands company meeting

Your agenda should include:
- Clear meeting objective
- Specific agenda items with time allocations
- Who should speak/lead each section
- Expected outcomes
- Pre-meeting materials needed
- Follow-up actions planned`,
          },
        },
        {
          title: "Leading Productive Discussions",
          content: `Learn how to keep discussion focused, manage interruptions, encourage participation, and ensure every attendee understands the next steps.
          
This lesson covers:
- Active listening techniques
- Facilitating balanced discussions
- Managing dominant speakers
- Encouraging quiet participants
- Handling conflict and disagreement
- Decision-making frameworks
- Documentation and action items`,
          order_index: 1,
          objectives: [
            "Facilitate inclusive and balanced discussions",
            "Use proven facilitation techniques to keep meetings on track",
            "Handle difficult personalities and conflicts constructively",
            "Ensure all voices are heard",
          ],
          estimated_duration: 50,
          videos: [
            {
              id: uuidv4().slice(0, 8),
              title: "Facilitation Techniques for Engaging All Participants",
              url: "https://example.com/videos/facilitation.mp4",
              transcript: "Practical techniques to draw out insights from quiet team members...",
              duration: 15,
            },
            {
              id: uuidv4().slice(0, 8),
              title: "Managing Difficult Meeting Moments",
              url: "https://example.com/videos/difficult-moments.mp4",
              transcript: "How to handle tangents, conflicts, and dominating speakers...",
              duration: 12,
            },
          ],
          readings: [
            {
              id: uuidv4().slice(0, 8),
              title: "The Facilitator's Guide",
              url: "https://example.com/resources/facilitator-guide.pdf",
              content: "Comprehensive guide to meeting facilitation",
              type: "pdf",
            },
          ],
          materials: [
            {
              id: uuidv4().slice(0, 8),
              name: "Facilitation Techniques Reference Card",
              url: "https://example.com/templates/facilitation-card.pdf",
              type: "reference",
            },
          ],
          quizzes: [
            {
              title: "Facilitation Skills Quiz",
              questions: [
                {
                  prompt: "What is the best way to stop a sidetrack in a meeting?",
                  options: ["Acknowledge it and return to the agenda", "Ignore it", "Let it continue until it finishes", "End the meeting immediately"],
                  correct_index: 0,
                },
                {
                  prompt: "How should a meeting leader handle a quiet participant?",
                  options: ["Invite them to share their thoughts", "Ask someone else instead", "End the meeting", "Send them the notes later"],
                  correct_index: 0,
                },
                {
                  prompt: "When two people disagree in a meeting, you should:",
                  options: ["Help them find common ground and clarify facts", "Take sides immediately", "Move on quickly", "Have them argue it out"],
                  correct_index: 0,
                },
              ],
            },
          ],
          assignment: {
            title: "Facilitate a Mock Discussion",
            instructions: `Describe how you would facilitate a 30-minute discussion on this topic: "How should we improve our remote work policy?"
            
Include:
- Opening statement to set the tone
- Questions you'd ask to draw out insights
- Techniques to manage different personality types (quiet, dominant, skeptical)
- How you'd handle if discussion goes off-track
- How you'd summarize and close with clear decisions
- Document the decisions and action items`,
          },
        },
        {
          title: "Closing with Clear Outcomes",
          content: `Learn how to summarize decisions, assign actions, confirm follow-up, communicate outcomes, and ensure accountability so meetings become a source of progress.
          
This lesson covers:
- Effective meeting summaries
- Clear action item assignment
- Owner and deadline assignment
- Creating meeting minutes
- Communicating outcomes to stakeholders
- Follow-up meeting scheduling
- Accountability mechanisms`,
          order_index: 2,
          objectives: [
            "Wrap up meetings with clear summaries and decisions",
            "Assign specific, accountable action items",
            "Create professional meeting documentation",
            "Ensure follow-up and accountability",
          ],
          estimated_duration: 40,
          videos: [
            {
              id: uuidv4().slice(0, 8),
              title: "Creating Effective Action Items",
              url: "https://example.com/videos/action-items.mp4",
              transcript: "How to ensure action items are clear, owned, and tracked...",
              duration: 11,
            },
            {
              id: uuidv4().slice(0, 8),
              title: "Writing Professional Meeting Minutes",
              url: "https://example.com/videos/meeting-minutes.mp4",
              transcript: "Best practices for documenting meetings...",
              duration: 10,
            },
          ],
          readings: [
            {
              id: uuidv4().slice(0, 8),
              title: "Action Item Best Practices",
              url: "https://example.com/resources/action-items.pdf",
              content: "Guide to creating trackable action items",
              type: "pdf",
            },
          ],
          materials: [
            {
              id: uuidv4().slice(0, 8),
              name: "Meeting Minutes Template",
              url: "https://example.com/templates/meeting-minutes.docx",
              type: "template",
            },
            {
              id: uuidv4().slice(0, 8),
              name: "Action Item Tracker",
              url: "https://example.com/templates/action-tracker.xlsx",
              type: "worksheet",
            },
          ],
          quizzes: [
            {
              title: "Meeting Closeout Quiz",
              questions: [
                {
                  prompt: "What should you do at the end of every meeting?",
                  options: ["Review actions and owners", "Stop the clock", "Give everyone a break", "Schedule the next unrelated meeting"],
                  correct_index: 0,
                },
                {
                  prompt: "Each action item should have:",
                  options: ["Owner, deadline, and clear description", "Just a vague idea", "No deadline", "Multiple owners to share blame"],
                  correct_index: 0,
                },
              ],
            },
          ],
          assignment: {
            title: "Write Meeting Minutes",
            instructions: `You facilitated a meeting with these elements:
- 5 attendees from different departments
- 3 decisions were made
- 4 action items were assigned
- 1 major conflict that was resolved
- 2 follow-up meetings scheduled

Write professional meeting minutes that:
- Summarizes the key discussion points
- Lists all decisions with context
- Lists all action items with owners and deadlines
- Notes who will follow up on the conflict
- Confirms the follow-up meeting dates`,
          },
        },
      ],
      finalQuiz: {
        questions: [
          {
            prompt: "What is the most important element of a productive meeting?",
            options: ["A clear agenda and follow-up actions", "Plenty of slides", "A long duration", "Free snacks"],
            correct_index: 0,
          },
          {
            prompt: "How should you prepare for a meeting?",
            options: ["Define objectives, design agenda, prepare materials", "Wing it", "Arrive early and improvise", "Send the agenda during the meeting"],
            correct_index: 0,
          },
          {
            prompt: "The best way to handle a tangent is to:",
            options: ["Acknowledge and redirect to agenda", "Let it go on indefinitely", "Shut it down harshly", "Have a side conversation"],
            correct_index: 0,
          },
        ],
      },
    },
    {
      slug: "conflict-resolution-advanced",
      title: "Conflict Resolution in the Workplace",
      description: "Master difficult conversations, transform conflict into opportunity, and build stronger teams through structured resolution approaches.",
      price: "$50",
      category: "HR Training",
      pass_threshold: 70,
      lessons: [
        {
          title: "Understanding Conflict Dynamics",
          content: `Learn the psychology and patterns of workplace conflict, how to identify root causes, and understand different conflict styles.
          
This lesson covers:
- Conflict triggers and escalation patterns
- Root cause analysis techniques
- Conflict style assessment (Thomas-Kilmann)
- Power dynamics and stakeholder analysis
- Emotional intelligence in conflict
- Early warning signs`,
          order_index: 0,
          objectives: [
            "Recognize different types of workplace conflicts",
            "Identify root causes vs. surface symptoms",
            "Understand your own conflict style",
            "Assess emotional dimensions of conflict",
          ],
          estimated_duration: 55,
          videos: [
            {
              id: uuidv4().slice(0, 8),
              title: "The Anatomy of Workplace Conflict",
              url: "https://example.com/videos/conflict-anatomy.mp4",
              transcript: "Understanding how conflicts start and escalate...",
              duration: 14,
            },
          ],
          readings: [
            {
              id: uuidv4().slice(0, 8),
              title: "Conflict Styles Assessment",
              url: "https://example.com/resources/conflict-styles.pdf",
              content: "Self-assessment tool for your conflict management style",
              type: "pdf",
            },
          ],
          materials: [
            {
              id: uuidv4().slice(0, 8),
              name: "Root Cause Analysis Worksheet",
              url: "https://example.com/templates/root-cause.xlsx",
              type: "worksheet",
            },
          ],
          quizzes: [
            {
              title: "Conflict Dynamics Quiz",
              questions: [
                {
                  prompt: "The first step in understanding conflict is to:",
                  options: ["Identify the actual root cause", "Take sides", "Avoid the issue", "Let it resolve itself"],
                  correct_index: 0,
                },
              ],
            },
          ],
          assignment: {
            title: "Analyze a Real Conflict",
            instructions: "Describe a workplace conflict you've witnessed or experienced. Identify: the trigger, root cause, conflict style of each party, escalation pattern, and how it was (or should be) resolved.",
          },
        },
        {
          title: "Advanced Communication Skills",
          content: `Master active listening, non-violent communication, empathetic language, and techniques for understanding all perspectives in a conflict.`,
          order_index: 1,
          objectives: [
            "Use active listening to understand underlying interests",
            "Employ non-violent communication framework",
            "Build rapport even in conflict",
            "Recognize and address emotional undercurrents",
          ],
          estimated_duration: 60,
          videos: [
            {
              id: uuidv4().slice(0, 8),
              title: "Active Listening Mastery",
              url: "https://example.com/videos/active-listening.mp4",
              transcript: "Deep dive into reflective listening techniques...",
              duration: 16,
            },
          ],
          readings: [
            {
              id: uuidv4().slice(0, 8),
              title: "Nonviolent Communication",
              url: "https://example.com/resources/nvc.pdf",
              content: "Marshall Rosenberg's framework for compassionate communication",
              type: "pdf",
            },
          ],
          materials: [
            {
              id: uuidv4().slice(0, 8),
              name: "Empathetic Language Guide",
              url: "https://example.com/templates/language-guide.docx",
              type: "reference",
            },
          ],
          quizzes: [
            {
              title: "Communication Skills Quiz",
              questions: [
                {
                  prompt: "Active listening primarily means:",
                  options: ["Understanding the other person's perspective", "Waiting for your turn to talk", "Taking notes furiously", "Arguing your point"],
                  correct_index: 0,
                },
              ],
            },
          ],
          assignment: {
            title: "Write Difficult Conversation Scripts",
            instructions: "Write how you would initiate three difficult conversations: performance issue, boundary violation, and team dysfunction. Use empathetic language techniques.",
          },
        },
        {
          title: "Mediation Frameworks & Techniques",
          content: `Learn structured mediation approaches, facilitation techniques, and how to guide parties toward resolution.`,
          order_index: 2,
          objectives: [
            "Follow a structured mediation process",
            "Remain neutral and fair",
            "Help parties find common ground",
            "Create durable agreements",
          ],
          estimated_duration: 65,
          videos: [
            {
              id: uuidv4().slice(0, 8),
              title: "Mediation Step-by-Step",
              url: "https://example.com/videos/mediation-steps.mp4",
              transcript: "A complete walk-through of the mediation process...",
              duration: 18,
            },
          ],
          readings: [
            {
              id: uuidv4().slice(0, 8),
              title: "Interest-Based Negotiation",
              url: "https://example.com/resources/negotiation.pdf",
              content: "How to find win-win solutions based on interests not positions",
              type: "pdf",
            },
          ],
          materials: [
            {
              id: uuidv4().slice(0, 8),
              name: "Mediation Protocol Template",
              url: "https://example.com/templates/mediation-protocol.docx",
              type: "template",
            },
          ],
          quizzes: [
            {
              title: "Mediation Quiz",
              questions: [
                {
                  prompt: "The goal of mediation is to:",
                  options: ["Help parties reach their own agreement", "Judge who was wrong", "Enforce compliance", "Punish the aggressor"],
                  correct_index: 0,
                },
              ],
            },
          ],
          assignment: {
            title: "Design a Mediation Plan",
            instructions: "Create a detailed mediation plan for resolving conflict between two team members. Include: setup, opening statements, listening phases, collaborative problem-solving, and agreement documentation.",
          },
        },
      ],
      finalQuiz: {
        questions: [
          {
            prompt: "Before mediating a conflict, you should:",
            options: ["Understand root causes and all perspectives", "Only hear one side", "Make a quick judgment", "Avoid learning too much"],
            correct_index: 0,
          },
          {
            prompt: "The best resolution approach focuses on:",
            options: ["Shared interests and mutual benefit", "Winning at all costs", "Splitting the difference", "Avoiding the issue"],
            correct_index: 0,
          },
        ],
      },
    },
  ];

  for (const course of courses) {
    await createCourseContent(course);
  }

  // Create sample enrollments
  const managingMeetingsCourse = await Course.findOne({ slug: "managing-meetings" });
  if (managingMeetingsCourse && studentUser) {
    const existingEnrollment = await Enrollment.findOne({
      courseId: managingMeetingsCourse.id,
      userId: studentUser.id,
    });
    if (!existingEnrollment) {
      const enrollment = new Enrollment({
        id: uuidv4(),
        courseId: managingMeetingsCourse.id,
        userId: studentUser.id,
        status: "active",
        progress: 0,
        createdAt: new Date(),
      });
      await enrollment.save();
      console.log(`Created enrollment for student in ${managingMeetingsCourse.title}`);
    }
  }

  console.log("Seed complete with rich university-level content.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
