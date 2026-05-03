import dotenv from "dotenv";
import bcryptjs from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { initializeDatabase, User, Course, Lesson, Quiz, QuizQuestion, Assignment } from "../src/db.js";

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

  await createUserIfMissing("admin@loyaltyhr.com", "Admin123!", "Loyalty", "Admin", "admin");
  await createUserIfMissing("student@loyaltyhr.com", "Student123!", "Student", "Demo", "candidate");

  const courses = [
    {
      slug: "managing-meetings",
      title: "Managing Meetings",
      description: "Learn how to run meetings that finish on time, keep everyone focused, and deliver clear outcomes.",
      price: "$50",
      category: "HR Training",
      pass_threshold: 70,
      lessons: [
        {
          title: "Meeting Preparation",
          content: "Learn how to plan agenda items, invite the right people, and prepare materials so meetings start and finish on time.",
          order_index: 0,
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
              ],
            },
          ],
          assignment: {
            title: "Meeting Preparation Assignment",
            instructions: "Prepare a meeting agenda for a real or hypothetical HR meeting, including topics, time allocations, and desired outcomes.",
          },
        },
        {
          title: "Leading Productive Meetings",
          content: "Learn how to keep discussion focused, manage interruptions, and make sure every attendee understands the next steps.",
          order_index: 1,
          quizzes: [
            {
              title: "Leading Productive Meetings Quiz",
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
              ],
            },
          ],
          assignment: {
            title: "Meeting Facilitation Assignment",
            instructions: "Describe how you would manage one difficult moment in a meeting, including the language and structure you would use.",
          },
        },
        {
          title: "Closing with Clear Outcomes",
          content: "Learn how to summarize decisions, assign actions, and confirm follow-up so meetings become a source of progress, not frustration.",
          order_index: 2,
          quizzes: [
            {
              title: "Closing Meetings Quiz",
              questions: [
                {
                  prompt: "What should you do at the end of every meeting?",
                  options: ["Review actions and owners", "Stop the clock", "Give everyone a break", "Schedule the next unrelated meeting"],
                  correct_index: 0,
                },
                {
                  prompt: "Clear outcomes mean:",
                  options: ["Next steps are assigned and understood", "Everyone stayed in the room", "The meeting lasted long", "There was no agenda"],
                  correct_index: 0,
                },
              ],
            },
          ],
          assignment: {
            title: "Outcome Summary Assignment",
            instructions: "Write a meeting closeout summary that identifies decisions made, actions assigned, and timing for follow-up.",
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
            prompt: "How do you keep meetings on track?",
            options: ["Refer back to the agenda and outcomes", "Let conversations wander", "Avoid taking notes", "Cancel the meeting early"],
            correct_index: 0,
          },
        ],
      },
    },
    {
      slug: "conflict-resolution-in-the-workplace",
      title: "Conflict Resolution in the Workplace",
      description: "Understand common workplace conflict, learn how to handle difficult conversations, and build stronger working relationships.",
      price: "$50",
      category: "HR Training",
      pass_threshold: 70,
      lessons: [
        {
          title: "Identify Conflict Triggers",
          content: "Learn how to spot the early signs of conflict and separate facts from assumptions before the situation escalates.",
          order_index: 0,
          quizzes: [
            {
              title: "Conflict Triggers Quiz",
              questions: [
                {
                  prompt: "Which sign often indicates a conflict is developing?",
                  options: ["Repeated misunderstandings", "Perfect agreement", "Complete silence", "No meetings"],
                  correct_index: 0,
                },
                {
                  prompt: "The best first step is often to:",
                  options: ["Clarify expectations and listen", "Ignore the issue", "Take sides immediately", "Hold a large public meeting"],
                  correct_index: 0,
                },
              ],
            },
          ],
          assignment: {
            title: "Conflict Trigger Worksheet",
            instructions: "Describe a conflict scenario and outline the early signs, the environment, and how you would intervene constructively.",
          },
        },
        {
          title: "Active Listening and Feedback",
          content: "Practice active listening, open questions, and feedback language that helps people feel heard and understood.",
          order_index: 1,
          quizzes: [
            {
              title: "Listening Skills Quiz",
              questions: [
                {
                  prompt: "Active listening means you should: ",
                  options: ["Focus fully on the speaker", "Prepare your response while they speak", "Interrupt to correct them", "Avoid eye contact"],
                  correct_index: 0,
                },
                {
                  prompt: "Good feedback is usually:",
                  options: ["Specific, balanced, and actionable", "Vague and general", "Harsh and public", "Ignored"],
                  correct_index: 0,
                },
              ],
            },
          ],
          assignment: {
            title: "Feedback Plan Assignment",
            instructions: "Write an example of how you would give constructive feedback in a tense situation while keeping the relationship positive.",
          },
        },
        {
          title: "Mediation and Follow-up",
          content: "Learn a simple mediation framework, how to agree next steps, and how to follow up so the conflict stays resolved.",
          order_index: 2,
          quizzes: [
            {
              title: "Mediation Quiz",
              questions: [
                {
                  prompt: "A mediation conversation should begin with:",
                  options: ["Agreeing ground rules and listening first", "Immediately assigning blame", "Skipping the introductions", "Talking about unrelated topics"],
                  correct_index: 0,
                },
                {
                  prompt: "Follow-up after a conflict should be:",
                  options: ["Clear and consistent", "Left uncertain", "Ignored entirely", "Handled by gossip"],
                  correct_index: 0,
                },
              ],
            },
          ],
          assignment: {
            title: "Conflict Resolution Plan",
            instructions: "Write a brief mediation plan that explains how you would resolve a workplace disagreement and follow up afterwards.",
          },
        },
      ],
      finalQuiz: {
        questions: [
          {
            prompt: "What is the most effective first step in resolving conflict?",
            options: ["Listen and understand the issue clearly", "Take a firm stand immediately", "Avoid the people involved", "Postpone indefinitely"],
            correct_index: 0,
          },
          {
            prompt: "The purpose of follow-up is to:",
            options: ["Ensure the solution is working", "Celebrate the problem", "Forget about the issue", "Create more meetings"],
            correct_index: 0,
          },
        ],
      },
    },
    {
      slug: "time-management",
      title: "Time Management",
      description: "Build better routines, reduce distractions, and manage your energy so you get more done without burning out.",
      price: "$50",
      category: "Personal Development",
      pass_threshold: 70,
      lessons: [
        {
          title: "Prioritization Tools",
          content: "Learn how to sort work by urgency, importance, and impact so you focus on the right tasks first.",
          order_index: 0,
          quizzes: [
            {
              title: "Prioritization Quiz",
              questions: [
                {
                  prompt: "A task with high impact and low urgency should be:",
                  options: ["Scheduled and worked on proactively", "Ignored", "Done immediately without thinking", "Delegated randomly"],
                  correct_index: 0,
                },
                {
                  prompt: "The best way to prioritize is to:",
                  options: ["Use a simple framework like urgent vs important", "Do whatever feels easiest", "Focus only on urgent work", "Avoid planning altogether"],
                  correct_index: 0,
                },
              ],
            },
          ],
          assignment: {
            title: "Prioritization Practice",
            instructions: "Create a list of five work tasks and categorize them by urgency and importance with your next action for each.",
          },
        },
        {
          title: "Managing Distractions",
          content: "Discover how to protect your time from interruptions, smartphone habits, and low-value work.",
          order_index: 1,
          quizzes: [
            {
              title: "Distraction Management Quiz",
              questions: [
                {
                  prompt: "A strong way to handle distractions is to:",
                  options: ["Create focused time blocks and minimize interruptions", "Try to multitask constantly", "Leave your devices on all day", "Do only urgent emails"],
                  correct_index: 0,
                },
                {
                  prompt: "Healthy time management depends on:",
                  options: ["Protecting attention and setting boundaries", "Working longer hours only", "Avoiding all planning", "Doing the loudest task first"],
                  correct_index: 0,
                },
              ],
            },
          ],
          assignment: {
            title: "Distraction Reduction Plan",
            instructions: "Write a plan for one day that reduces interruptions and keeps you focused on the most important work.",
          },
        },
        {
          title: "Work-Life Balance",
          content: "Learn how to schedule energy, set realistic goals, and create time for rest so work performance stays sustainable.",
          order_index: 2,
          quizzes: [
            {
              title: "Balance Quiz",
              questions: [
                {
                  prompt: "Good work-life balance requires:",
                  options: ["Realistic schedules and healthy boundaries", "Working all weekend", "Ignoring personal needs", "Never saying no"],
                  correct_index: 0,
                },
                {
                  prompt: "One useful habit is to:",
                  options: ["Plan breaks and recovery time", "Avoid all breaks", "Do everything at once", "Never review progress"],
                  correct_index: 0,
                },
              ],
            },
          ],
          assignment: {
            title: "Weekly Time Plan",
            instructions: "Build a weekly time plan that includes your top priorities, focus blocks, and recovery activities.",
          },
        },
      ],
      finalQuiz: {
        questions: [
          {
            prompt: "What is a key part of strong time management?",
            options: ["Knowing what to work on and when", "Doing everything at once", "Avoiding plans", "Working without breaks"],
            correct_index: 0,
          },
          {
            prompt: "A sustainable schedule includes:",
            options: ["Work, rest, and realistic priorities", "Only meetings", "Always urgent tasks", "No personal time"],
            correct_index: 0,
          },
        ],
      },
    },
  ];

  for (const course of courses) {
    await createCourseContent(course);
  }

  console.log("Seed complete.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
