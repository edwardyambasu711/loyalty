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

 if (courseData.finalQuiz && courseData.finalQuiz.questions) {
  for (const [index, questionData] of courseData.finalQuiz.questions.entries()) {
    const existingQuestion = await QuizQuestion.findOne({
      quizId: finalQuiz.id,
      prompt: questionData.prompt,
    });

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
}
async function main() {
  await initializeDatabase();

  const adminUser = await createUserIfMissing("admin@loyaltyhr.com", "Admin123!", "Loyalty", "Admin", "superadmin");
  const studentUser = await createUserIfMissing("student@loyaltyhr.com", "Student123!", "Student", "Demo", "candidate");

  const courses = [

/* =====================================================
   1. EMOTIONAL INTELLIGENCE (VERY VERY VERY VERY BUCKY)
===================================================== */
{
  slug: "emotional-intelligence",
  title: "Introduction to Emotional Intelligence (Advanced Behavioral Psychology & Organizational Neuroscience)",
  price: "$75",
  category: "HR Training",
  pass_threshold: 70,

  lessons: [
  {
    title: "Emotional Intelligence, Neuroscience and Human Organizational Behavior",
    order_index: 0,
    estimated_duration: 180,
    content: `
# 1. Foundations of Emotional Intelligence

Emotional Intelligence (EI) refers to the advanced psychological capacity to:
- perceive emotional states
- regulate emotional responses
- interpret behavioral signals
- manage interpersonal dynamics
- influence organizational relationships

Unlike IQ, emotional intelligence determines:
- leadership effectiveness
- conflict management
- negotiation performance
- organizational trust
- communication quality
- employee morale
- workplace culture

Organizations with emotionally intelligent leadership demonstrate:
- lower turnover
- higher productivity
- stronger collaboration
- improved employee engagement

---

# 2. Historical Evolution of Emotional Intelligence

## Peter Salovey & John Mayer
Defined EI as:
"The ability to monitor one's own and others' emotions and use emotional information to guide thinking and behavior."

---

## Daniel Goleman's Five-Dimensional Model

### Self-Awareness
Understanding emotional triggers, strengths, weaknesses, and behavioral patterns.

### Self-Regulation
Controlling impulsive emotional reactions.

### Motivation
Internal drive beyond financial reward.

### Empathy
Understanding emotional states of others.

### Social Skills
Managing relationships, communication, persuasion, and collaboration.

---

# 3. Neuroscience of Emotion

## The Amygdala
Responsible for:
- fear processing
- emotional memory
- threat detection
- survival reactions

---

## The Prefrontal Cortex
Controls:
- rational thinking
- emotional regulation
- ethical reasoning
- strategic judgment
- impulse control

---

## Amygdala Hijack
Occurs when emotional reactions override logical thinking.

Example:
A senior manager reacts aggressively during criticism causing:
- team fear
- communication shutdown
- morale decline
- organizational tension

---

# 4. Self-Awareness and Behavioral Reflection

High self-awareness includes:
- emotional recognition
- accountability
- reflective thinking
- behavioral correction

Low self-awareness produces:
- denial
- impulsive behavior
- blame shifting
- emotional instability

---

# 5. Emotional Regulation and Leadership Stability

Emotionally regulated leaders:
- remain calm under pressure
- reduce organizational panic
- communicate rationally
- manage crises effectively

Failure of emotional regulation creates:
- toxic culture
- conflict escalation
- psychological insecurity
- employee disengagement

---

# 6. Empathy and Organizational Psychology

## Cognitive Empathy
Understanding perspectives.

## Emotional Empathy
Feeling emotional states of others.

## Compassionate Empathy
Taking supportive action.

Empathy improves:
- trust
- loyalty
- collaboration
- customer relationships
- leadership influence

---

# 7. Emotional Intelligence in Strategic Leadership

Emotionally intelligent leaders:
- inspire commitment
- improve morale
- manage uncertainty
- strengthen culture
- reduce turnover

Low EI leadership creates:
- fear-based management
- employee burnout
- hostility
- communication breakdown

---

# 8. Emotional Intelligence and Decision-Making

Emotions influence:
- judgment
- risk assessment
- ethical reasoning
- strategic thinking

Fear creates excessive caution.
Overconfidence creates reckless decision-making.

---

# 9. Organizational Applications of EI

EI is essential in:
- HR management
- negotiation
- leadership
- customer service
- project management
- conflict resolution
- disciplinary systems

---

# 10. Advanced Case Study

A department manager humiliates staff publicly during performance reviews.

Consequences:
- psychological stress
- employee withdrawal
- reduced innovation
- organizational distrust
- increased absenteeism

Emotionally intelligent alternative:
- private feedback
- constructive coaching
- supportive communication
- behavioral accountability

---

# 11. Conclusion

Emotional Intelligence is not optional.
It is a strategic organizational competency directly connected to leadership effectiveness, employee wellbeing, and organizational sustainability.
`,

    objectives: [
      "Analyze advanced emotional intelligence frameworks",
      "Evaluate organizational emotional dynamics",
      "Apply neuroscience principles to leadership behavior",
      "Assess emotional influence on decision-making",
      "Design emotional intelligence development systems",
      "Evaluate organizational communication failures",
      "Apply empathy and emotional regulation strategies"
    ],

    quizzes: [{
      title: "Advanced Emotional Intelligence Examination Quiz",
      questions: [
        {
          prompt: "What is the primary purpose of emotional intelligence?",
          options: [
            "Managing and understanding emotional behavior",
            "Improving accounting systems",
            "Increasing memory capacity",
            "Technical specialization"
          ],
          correct_index: 0
        },
        {
          prompt: "Which brain structure is associated with emotional reactions?",
          options: [
            "Amygdala",
            "Cerebellum",
            "Spinal cord",
            "Occipital lobe"
          ],
          correct_index: 0
        },
        {
          prompt: "Amygdala hijack occurs when:",
          options: [
            "Logic overrides emotion",
            "Emotion overrides rational thinking",
            "Employees resign",
            "Policies fail"
          ],
          correct_index: 1
        },
        {
          prompt: "Empathy improves:",
          options: [
            "Trust",
            "Communication",
            "Collaboration",
            "All of the above"
          ],
          correct_index: 3
        },
        {
          prompt: "Low emotional intelligence leadership often creates:",
          options: [
            "Fear culture",
            "Trust",
            "Psychological safety",
            "Engagement"
          ],
          correct_index: 0
        }
      ]
    }],

    assignment: {
      title: "Advanced Emotional Intelligence Organizational Case Study",
      instructions: `
Analyze a real or fictional organization where emotional intelligence failures affected organizational performance.

Your analysis must include:
- emotional triggers
- leadership evaluation
- communication analysis
- organizational psychology
- employee behavioral consequences
- conflict escalation
- recommendations
- emotional development systems

Word Count: 3500–4000 words.
`
    }
  }],

  finalQuiz: {
    questions: [
      {
        prompt: "What are the five dimensions of emotional intelligence according to Daniel Goleman?",
        options: [
          "Self-awareness, self-regulation, motivation, empathy, social skills",
          "IQ, EQ, SQ, AQ, PQ",
          "Perception, understanding, regulation, motivation, application",
          "Cognitive, emotional, social, behavioral, organizational"
        ],
        correct_index: 0
      },
      {
        prompt: "Which brain structure is primarily responsible for emotional reactions and fear processing?",
        options: [
          "Prefrontal cortex",
          "Amygdala",
          "Hippocampus",
          "Cerebellum"
        ],
        correct_index: 1
      },
      {
        prompt: "Amygdala hijack refers to:",
        options: [
          "A medical condition",
          "When emotions override rational thinking",
          "A leadership technique",
          "A conflict resolution strategy"
        ],
        correct_index: 1
      },
      {
        prompt: "Which type of empathy involves taking supportive action?",
        options: [
          "Cognitive empathy",
          "Emotional empathy",
          "Compassionate empathy",
          "Strategic empathy"
        ],
        correct_index: 2
      },
      {
        prompt: "Low emotional intelligence in leadership typically creates:",
        options: [
          "Trust and collaboration",
          "Fear-based culture and employee burnout",
          "Psychological safety",
          "High employee engagement"
        ],
        correct_index: 1
      },
      {
        prompt: "Emotional intelligence is most critical in which organizational areas?",
        options: [
          "Accounting and finance",
          "HR management, leadership, and conflict resolution",
          "IT infrastructure",
          "Facility maintenance"
        ],
        correct_index: 1
      },
      {
        prompt: "Self-awareness in emotional intelligence includes:",
        options: [
          "Understanding others' emotions",
          "Recognizing one's own emotional triggers and behavioral patterns",
          "Managing team conflicts",
          "Strategic planning"
        ],
        correct_index: 1
      },
      {
        prompt: "Organizations with emotionally intelligent leadership demonstrate:",
        options: [
          "Higher turnover and lower productivity",
          "Lower turnover and higher productivity",
          "Increased conflict",
          "Poor collaboration"
        ],
        correct_index: 1
      }
    ]
  }
},

/* =====================================================
   2. CONFLICT RESOLUTION (VERY VERY VERY VERY BUCKY)
===================================================== */
{
  slug: "conflict-resolution",
  title: "Conflict Resolution in the Workplace (Advanced Organizational Dynamics & Mediation Systems)",
  price: "$50",
  category: "HR Training",
  pass_threshold: 70,

  lessons: [
  {
    title: "Conflict Psychology, Mediation and Organizational Stability",
    order_index: 0,
    estimated_duration: 170,
    content: `
# 1. Foundations of Workplace Conflict

Conflict occurs when:
- interests collide
- communication fails
- expectations differ
- power struggles emerge
- resources become limited

Conflict may be:
- interpersonal
- organizational
- structural
- behavioral
- psychological

---

# 2. Sources of Organizational Conflict

## Structural Causes
- unclear authority
- workload imbalance
- poor leadership
- role ambiguity
- resource competition

---

## Behavioral Causes
- ego
- emotional instability
- communication failure
- personality clashes
- stress

---

# 3. Conflict Escalation Theory

Conflict escalates through stages:
1. latent tension
2. perceived disagreement
3. emotional reaction
4. confrontation
5. hostility
6. organizational damage

---

# 4. Organizational Psychology of Conflict

Unresolved conflict produces:
- burnout
- mistrust
- absenteeism
- disengagement
- productivity decline

---

# 5. Conflict Resolution Models

## Avoidance
Temporary withdrawal.

## Accommodation
One side sacrifices interests.

## Competition
Power-based domination.

## Compromise
Mutual concessions.

## Collaboration
Joint problem-solving and sustainable agreement.

---

# 6. Communication and Mediation

Effective mediation requires:
- neutrality
- listening
- emotional regulation
- structured dialogue
- accountability

---

# 7. Leadership and Conflict

Poor leadership increases:
- tension
- hostility
- fear culture
- resistance

Strong leadership promotes:
- communication
- psychological safety
- trust
- collaboration

---

# 8. Advanced Case Study

Two departments compete for budget allocation causing:
- communication collapse
- hostility
- reduced cooperation
- productivity decline

Leadership fails to intervene.
Conflict escalates into organizational dysfunction.

---

# 9. Conclusion

Conflict management is essential for organizational sustainability and leadership effectiveness.
`,

    objectives: [
      "Analyze workplace conflict systems",
      "Evaluate mediation frameworks",
      "Assess communication failures",
      "Apply conflict psychology principles",
      "Design organizational conflict resolution systems"
    ],

    quizzes: [{
      title: "Advanced Conflict Resolution Quiz",
      questions: [
        {
          prompt: "Conflict escalation begins with:",
          options: [
            "Latent tension",
            "Termination",
            "Punishment",
            "Promotion"
          ],
          correct_index: 0
        },
        {
          prompt: "Which resolution model focuses on joint problem-solving?",
          options: [
            "Competition",
            "Avoidance",
            "Collaboration",
            "Withdrawal"
          ],
          correct_index: 2
        },
        {
          prompt: "Unresolved conflict often produces:",
          options: [
            "Burnout",
            "Stress",
            "Disengagement",
            "All of the above"
          ],
          correct_index: 3
        }
      ]
    }],

    assignment: {
      title: "Organizational Conflict Resolution Framework",
      instructions: `
Design a multinational workplace conflict management system.

Include:
- mediation procedures
- communication systems
- leadership responsibilities
- accountability frameworks
- employee wellbeing strategies
- escalation management
- behavioral intervention systems

Word Count: 3500 words.
`
    }
  }],

  finalQuiz: {
    questions: [
      {
        prompt: "What are the main sources of organizational conflict?",
        options: [
          "Structural and behavioral causes",
          "Financial incentives",
          "Technology upgrades",
          "Office location"
        ],
        correct_index: 0
      },
      {
        prompt: "Conflict escalation typically progresses through how many stages?",
        options: [
          "2 stages",
          "4 stages",
          "6 stages",
          "8 stages"
        ],
        correct_index: 2
      },
      {
        prompt: "Which conflict resolution model involves joint problem-solving?",
        options: [
          "Competition",
          "Avoidance",
          "Collaboration",
          "Accommodation"
        ],
        correct_index: 2
      },
      {
        prompt: "Effective mediation requires:",
        options: [
          "Taking sides",
          "Neutrality and structured dialogue",
          "Punishment",
          "Ignoring issues"
        ],
        correct_index: 1
      },
      {
        prompt: "Poor leadership in conflict situations increases:",
        options: [
          "Trust and communication",
          "Tension and hostility",
          "Psychological safety",
          "Collaboration"
        ],
        correct_index: 1
      },
      {
        prompt: "Unresolved workplace conflict can lead to:",
        options: [
          "Burnout and disengagement",
          "Higher productivity",
          "Better morale",
          "Increased innovation"
        ],
        correct_index: 0
      }
    ]
  }
},

/* =====================================================
   3. LEADERSHIP SKILLS (VERY VERY VERY VERY BUCKY)
===================================================== */
{
  slug: "leadership-skills",
  title: "Leadership Skills (Advanced Leadership Theory, Organizational Power & Strategic Influence)",
  price: "$50",
  category: "HR Training",
  pass_threshold: 70,

  lessons: [
  {
    title: "Leadership, Power, Ethics and Organizational Influence",
    order_index: 0,
    estimated_duration: 200,
    content: `
# 1. Foundations of Leadership

Leadership is the strategic ability to influence organizational behavior toward shared objectives.

Managers maintain systems.
Leaders create direction, influence culture, and inspire performance.

---

# 2. Major Leadership Theories

## Trait Theory
Leadership is based on inherited characteristics.

## Behavioral Theory
Leadership behaviors can be learned.

## Situational Leadership
Leadership effectiveness depends on context.

## Transformational Leadership
Leaders inspire vision and organizational change.

## Transactional Leadership
Leadership through reward and punishment systems.

---

# 3. Leadership Styles

### Autocratic Leadership
Centralized decision-making.

### Democratic Leadership
Collaborative participation.

### Laissez-Faire Leadership
Minimal supervision.

### Transformational Leadership
Vision-driven inspiration.

### Transactional Leadership
Performance-based control systems.

---

# 4. Organizational Power

Leaders exercise:
- expert power
- reward power
- coercive power
- referent power
- legitimate power

Misuse of power creates:
- fear culture
- resistance
- hostility
- disengagement

---

# 5. Ethical Leadership

Ethical leadership requires:
- integrity
- accountability
- fairness
- transparency
- responsibility

---

# 6. Leadership Failure

Poor leadership produces:
- burnout
- conflict
- mistrust
- emotional exhaustion
- organizational instability

---

# 7. Organizational Vision and Strategy

Effective leaders align:
- mission
- culture
- performance systems
- employee motivation
- strategic direction

---

# 8. Leadership Communication

Strong leadership communication involves:
- clarity
- empathy
- persuasion
- emotional intelligence
- accountability

---

# 9. Advanced Case Study

A CEO uses fear-based leadership to increase productivity.

Short-term outcomes:
- temporary compliance

Long-term outcomes:
- turnover
- emotional exhaustion
- resistance
- innovation decline

---

# 10. Conclusion

Leadership directly determines organizational culture, morale, and long-term strategic sustainability.
`,

    objectives: [
      "Analyze advanced leadership theories",
      "Evaluate leadership power systems",
      "Assess ethical leadership behavior",
      "Apply strategic influence principles",
      "Design leadership development systems",
      "Evaluate organizational culture impact"
    ],

    quizzes: [{
      title: "Advanced Leadership Theory Quiz",
      questions: [
        {
          prompt: "Transformational leadership focuses on:",
          options: [
            "Vision and inspiration",
            "Fear and punishment",
            "Payroll management",
            "Technical maintenance"
          ],
          correct_index: 0
        },
        {
          prompt: "Ethical leadership requires:",
          options: [
            "Manipulation",
            "Integrity",
            "Fear",
            "Secrecy"
          ],
          correct_index: 1
        },
        {
          prompt: "Misuse of organizational power may create:",
          options: [
            "Fear culture",
            "Trust",
            "Innovation",
            "Psychological safety"
          ],
          correct_index: 0
        }
      ]
    }],

    assignment: {
      title: "Strategic Leadership Organizational Evaluation",
      instructions: `
Critically analyze leadership effectiveness within a real or fictional organization.

Your analysis must include:
- leadership style evaluation
- organizational culture assessment
- communication systems
- employee behavioral impact
- ethical analysis
- power dynamics
- recommendations for leadership improvement

Word Count: 4000 words.
`
    }
  }]
}
,

/* =====================================================
   4. TIME MANAGEMENT (VERY VERY VERY VERY BUCKY)
===================================================== */
{
  slug: "time-management",
  title: "Time Management (Advanced Productivity, Strategic Prioritization, Executive Efficiency & Organizational Performance Systems)",
  price: "$50",
  category: "HR Training",
  pass_threshold: 70,

  lessons: [{
    title: "Strategic Time Allocation, Executive Productivity and Organizational Efficiency Systems",
    order_index: 0,
    estimated_duration: 260,
    content: `
# 1. Foundations of Time Management

Time management is the strategic organizational process of allocating:
- attention
- resources
- priorities
- energy
- operational focus
- executive decision capacity

Modern organizations depend on efficient time systems to maintain:
- productivity
- profitability
- operational continuity
- strategic execution
- employee accountability

Poor time management creates:
- financial losses
- operational delays
- project failure
- psychological stress
- organizational inefficiency

---

# 2. Organizational Psychology of Time

Time is not only a scheduling issue.
It is also a behavioral and psychological issue.

Employees lose productivity because of:
- cognitive overload
- distractions
- burnout
- unclear priorities
- emotional stress
- communication interruptions

---

# 3. Causes of Poor Time Management

## Individual Causes
- procrastination
- lack of discipline
- emotional avoidance
- poor concentration
- digital distractions
- weak planning systems

---

## Organizational Causes
- poor leadership
- unclear deadlines
- ineffective delegation
- meeting overload
- communication breakdown
- unrealistic workloads

---

# 4. Procrastination Psychology

Procrastination occurs because of:
- fear of failure
- anxiety
- perfectionism
- low motivation
- emotional exhaustion

Consequences include:
- stress accumulation
- deadline pressure
- performance decline
- organizational inefficiency

---

# 5. Prioritization Systems

## Eisenhower Matrix

### Urgent and Important
Critical crisis tasks.

### Important but Not Urgent
Strategic long-term work.

### Urgent but Not Important
Interruptions requiring delegation.

### Neither Urgent nor Important
Distractions reducing productivity.

---

# 6. Strategic Productivity Frameworks

Organizations implement:
- workflow management systems
- scheduling systems
- accountability frameworks
- digital productivity tools
- project tracking systems
- KPI monitoring systems

---

# 7. Executive Time Management

Senior leaders must manage:
- strategic priorities
- delegation systems
- organizational communication
- operational planning
- crisis response systems

Executive inefficiency affects entire organizations.

---

# 8. Time Management and Stress

Poor time management creates:
- burnout
- emotional exhaustion
- workplace anxiety
- employee disengagement
- operational instability

Effective systems improve:
- wellbeing
- morale
- accountability
- productivity

---

# 9. Organizational Meetings and Time Waste

Inefficient meetings create:
- productivity decline
- communication overload
- decision fatigue
- operational delays

Effective meetings require:
- agendas
- structure
- accountability
- time control
- action tracking

---

# 10. Delegation Systems

Delegation improves:
- leadership efficiency
- employee development
- workload distribution
- organizational speed

Poor delegation creates:
- micromanagement
- bottlenecks
- stress
- operational failure

---

# 11. Technology and Productivity

Modern organizations use:
- scheduling software
- workflow automation
- digital calendars
- task management systems
- productivity analytics

---

# 12. Advanced Case Study

A multinational organization experiences:
- missed deadlines
- employee burnout
- project delays
- communication overload

Investigation reveals:
- excessive meetings
- unclear priorities
- poor delegation
- ineffective leadership planning

---

# 13. Strategic Recommendations

Organizations should implement:
- productivity audits
- delegation frameworks
- workflow automation
- scheduling systems
- performance accountability
- executive planning systems

---

# 14. Conclusion

Time management is a strategic organizational competency directly connected to productivity, leadership effectiveness, operational efficiency, and organizational sustainability.
`,

    objectives: [
      "Analyze advanced productivity systems",
      "Evaluate organizational efficiency structures",
      "Assess procrastination psychology",
      "Apply executive scheduling systems",
      "Design strategic prioritization frameworks",
      "Evaluate operational inefficiencies",
      "Apply delegation management systems",
      "Assess workload distribution systems"
    ],

    quizzes: [{
      title: "Advanced Strategic Time Management Examination",
      questions: [
        {
          prompt: "Poor time management may result in:",
          options: [
            "Burnout",
            "Missed deadlines",
            "Operational inefficiency",
            "All of the above"
          ],
          correct_index: 3
        },
        {
          prompt: "Procrastination is often connected to:",
          options: [
            "Anxiety",
            "Fear of failure",
            "Perfectionism",
            "All of the above"
          ],
          correct_index: 3
        },
        {
          prompt: "Delegation improves:",
          options: [
            "Leadership efficiency",
            "Workload management",
            "Organizational speed",
            "All of the above"
          ],
          correct_index: 3
        },
        {
          prompt: "Inefficient meetings may create:",
          options: [
            "Decision fatigue",
            "Time waste",
            "Productivity decline",
            "All of the above"
          ],
          correct_index: 3
        }
      ]
    }],

    assignment: {
      title: "Enterprise Executive Productivity and Time Management Framework",
      instructions: `
Develop a complete organizational productivity and time management system for a multinational corporation.

Your framework must include:
- executive scheduling systems
- delegation structures
- workflow management systems
- communication systems
- meeting efficiency frameworks
- accountability systems
- productivity tracking systems
- burnout prevention strategies
- organizational performance monitoring
- leadership planning systems

Provide strategic recommendations supported by organizational analysis.

Word Count: 4500–5000 words.
`
    }
  }]
},

/* =====================================================
   5. NEGOTIATION (VERY VERY VERY VERY BUCKY)
===================================================== */
{
  slug: "negotiation",
  title: "Negotiation (Advanced Strategic Negotiation & Organizational Influence)",
  price: "$50",
  category: "HR Training",
  pass_threshold: 70,

  lessons: [{
    title: "Negotiation Psychology, Influence and Strategic Bargaining",
    order_index: 0,
    estimated_duration: 180,
    content: `
# 1. Foundations of Negotiation

Negotiation is the strategic process of resolving competing interests through communication and influence.

---

# 2. Types of Negotiation

## Distributive Negotiation
Win-lose bargaining.

## Integrative Negotiation
Collaborative win-win outcomes.

---

# 3. Negotiation Psychology

Negotiation involves:
- persuasion
- emotional intelligence
- strategic communication
- influence
- power dynamics

---

# 4. BATNA

BATNA = Best Alternative To a Negotiated Agreement.

Strong BATNA increases bargaining power.

---

# 5. Negotiation Stages

1. preparation
2. opening
3. bargaining
4. agreement
5. implementation

---

# 6. Ethical Negotiation

Ethical negotiation requires:
- honesty
- transparency
- fairness
- accountability

---

# 7. Organizational Negotiation

Negotiation occurs in:
- procurement
- HR disputes
- leadership decisions
- salary discussions
- union relations

---

# 8. Conclusion

Strategic negotiation improves organizational relationships and long-term cooperation.
`,

    objectives: [
      "Analyze negotiation psychology",
      "Evaluate bargaining systems",
      "Assess influence strategies",
      "Apply ethical negotiation principles",
      "Design negotiation frameworks"
    ],

    quizzes: [{
      title: "Advanced Negotiation Quiz",
      questions: [
        {
          prompt: "BATNA refers to:",
          options: [
            "Best Alternative To a Negotiated Agreement",
            "Budget allocation system",
            "Leadership framework",
            "Compliance procedure"
          ],
          correct_index: 0
        }
      ]
    }],

    assignment: {
      title: "Strategic Negotiation Analysis",
      instructions: `
Analyze a major organizational negotiation.

Include:
- negotiation stages
- power dynamics
- communication systems
- emotional influence
- outcomes evaluation

Word Count: 3500 words.
`
    }
  }]
},

/* =====================================================
   6. PROJECT MANAGEMENT (VERY VERY VERY VERY BUCKY)
===================================================== */
{
  slug: "project-management",
  title: "Project Management (Advanced Strategic Execution & Organizational Planning)",
  price: "$50",
  category: "HR Training",
  pass_threshold: 70,

  lessons: [{
    title: "Project Leadership, Risk Management and Organizational Execution",
    order_index: 0,
    estimated_duration: 200,
    content: `
# 1. Foundations of Project Management

Project management involves:
- planning
- execution
- monitoring
- coordination
- organizational delivery

---

# 2. Project Life Cycle

1. initiation
2. planning
3. execution
4. monitoring
5. closure

---

# 3. Project Constraints

Organizations manage:
- scope
- cost
- time
- quality

---

# 4. Risk Management

Risks include:
- operational risks
- legal risks
- financial risks
- strategic risks

---

# 5. Leadership in Projects

Project leaders coordinate:
- communication
- accountability
- deadlines
- stakeholder relationships

---

# 6. Project Failure

Failure may result from:
- poor planning
- weak communication
- leadership failure
- unrealistic timelines

---

# 7. Conclusion

Project management is essential for organizational execution and strategic success.
`,

    objectives: [
      "Analyze project management systems",
      "Evaluate organizational execution",
      "Assess project risk frameworks",
      "Apply leadership coordination systems",
      "Design project delivery structures"
    ],

    quizzes: [{
      title: "Advanced Project Management Quiz",
      questions: [
        {
          prompt: "Project constraints include:",
          options: [
            "Scope",
            "Cost",
            "Time",
            "All of the above"
          ],
          correct_index: 3
        }
      ]
    }],

    assignment: {
      title: "Enterprise Project Management Framework",
      instructions: `
Develop a full organizational project management plan.

Include:
- project life cycle
- stakeholder systems
- risk management
- leadership responsibilities
- execution frameworks

Word Count: 4000 words.
`
    }
  }]
},

/* =====================================================
   7. CUSTOMER SERVICE (VERY VERY VERY VERY BUCKY)
===================================================== */
{
  slug: "customer-service",
  title: "Customer Service (Advanced Consumer Psychology & Service Excellence)",
  price: "$50",
  category: "HR Training",
  pass_threshold: 70,

  lessons: [{
    title: "Customer Psychology, Service Systems and Organizational Reputation",
    order_index: 0,
    estimated_duration: 170,
    content: `
# 1. Foundations of Customer Service

Customer service is the organizational process of managing customer relationships and satisfaction.

---

# 2. Customer Psychology

Customer behavior is influenced by:
- emotions
- expectations
- communication
- trust
- experience

---

# 3. Service Excellence

Excellent service requires:
- empathy
- responsiveness
- professionalism
- accountability

---

# 4. Organizational Reputation

Poor customer service causes:
- reputational damage
- customer loss
- negative reviews
- financial decline

---

# 5. Complaint Resolution

Organizations should implement:
- complaint systems
- escalation procedures
- communication protocols
- accountability frameworks

---

# 6. Conclusion

Customer service directly affects organizational growth and sustainability.
`,

    objectives: [
      "Analyze customer behavior",
      "Evaluate service quality systems",
      "Assess organizational reputation management",
      "Apply complaint resolution systems",
      "Design customer satisfaction frameworks"
    ],

    quizzes: [{
      title: "Advanced Customer Service Quiz",
      questions: [
        {
          prompt: "Excellent customer service requires:",
          options: [
            "Empathy",
            "Professionalism",
            "Responsiveness",
            "All of the above"
          ],
          correct_index: 3
        }
      ]
    }],

    assignment: {
      title: "Customer Experience Improvement Strategy",
      instructions: `
Design an organizational customer service improvement framework.

Include:
- communication systems
- complaint handling
- customer psychology
- service standards
- organizational accountability

Word Count: 3000 words.
`
    }
  }]
},

/* =====================================================
   8. PRESENTATION SKILLS (VERY VERY VERY VERY BUCKY)
===================================================== */
{
  slug: "presentation-skills",
  title: "Presentation Skills (Advanced Communication, Persuasion & Public Influence)",
  price: "$50",
  category: "HR Training",
  pass_threshold: 70,

  lessons: [{
    title: "Strategic Communication, Public Speaking and Persuasive Influence",
    order_index: 0,
    estimated_duration: 160,
    content: `
# 1. Foundations of Presentation Skills

Presentations involve strategic communication designed to:
- inform
- persuade
- motivate
- influence audiences

---

# 2. Communication Psychology

Effective communication requires:
- clarity
- confidence
- emotional intelligence
- audience awareness

---

# 3. Presentation Structure

Strong presentations include:
- introduction
- body
- supporting evidence
- conclusion
- audience engagement

---

# 4. Non-Verbal Communication

Important factors include:
- body language
- eye contact
- tone
- posture
- gestures

---

# 5. Presentation Anxiety

Fear may reduce:
- confidence
- communication clarity
- audience trust

Management techniques:
- preparation
- rehearsal
- breathing control
- confidence development

---

# 6. Conclusion

Presentation skills are essential for leadership, persuasion, and organizational influence.
`,

    objectives: [
      "Analyze communication systems",
      "Evaluate persuasive presentation techniques",
      "Assess audience psychology",
      "Apply public speaking strategies",
      "Design presentation structures"
    ],

    quizzes: [{
      title: "Advanced Presentation Skills Quiz",
      questions: [
        {
          prompt: "Non-verbal communication includes:",
          options: [
            "Body language",
            "Tone",
            "Eye contact",
            "All of the above"
          ],
          correct_index: 3
        }
      ]
    }],

    assignment: {
      title: "Strategic Presentation Development",
      instructions: `
Develop a professional executive-level presentation.

Include:
- persuasive structure
- audience analysis
- communication strategy
- engagement systems
- delivery evaluation

Word Count: 2500 words.
`
    }
  }]
}
,

/* =====================================================
   9. TEAMWORK & COLLABORATION (VERY VERY VERY VERY BUCKY)
===================================================== */
{
  slug: "teamwork-collaboration",
  title: "Teamwork & Collaboration (Advanced Group Dynamics, Organizational Psychology & Collective Performance)",
  price: "$50",
  category: "HR Training",
  pass_threshold: 70,

  lessons: [{
    title: "Group Dynamics, Communication Systems and High-Performance Team Development",
    order_index: 0,
    estimated_duration: 240,
    content: `
# 1. Foundations of Teamwork

Teamwork refers to the coordinated interaction of individuals working toward shared organizational objectives.

High-performance organizations depend on:
- collaboration
- communication
- trust
- accountability
- shared responsibility

---

# 2. Organizational Psychology of Teams

Teams are influenced by:
- leadership
- communication quality
- emotional intelligence
- conflict management
- trust systems
- organizational culture

---

# 3. Stages of Team Development

## Forming
Initial relationship building.

## Storming
Conflict and role competition emerge.

## Norming
Behavioral standards develop.

## Performing
High collaboration and efficiency.

## Adjourning
Project completion and transition.

---

# 4. Communication and Collaboration

Strong communication improves:
- trust
- coordination
- efficiency
- morale
- innovation

Poor communication creates:
- confusion
- mistrust
- conflict
- operational delays

---

# 5. Trust and Psychological Safety

Psychological safety allows employees to:
- share ideas
- report mistakes
- communicate openly
- innovate confidently

Fear-based environments reduce:
- collaboration
- creativity
- morale

---

# 6. Team Leadership

Effective team leaders:
- motivate employees
- manage conflict
- coordinate responsibilities
- strengthen morale
- encourage accountability

---

# 7. Diversity in Teams

Diverse teams improve:
- creativity
- innovation
- strategic thinking
- problem-solving

However, poor inclusion systems create:
- communication barriers
- misunderstanding
- exclusion

---

# 8. Team Conflict

Conflict may emerge because of:
- unclear roles
- personality clashes
- stress
- competition
- leadership failure

Organizations require mediation systems and communication frameworks.

---

# 9. Team Performance Systems

Organizations measure:
- productivity
- accountability
- engagement
- collaboration quality
- communication effectiveness

---

# 10. Advanced Case Study

A project team experiences:
- role confusion
- communication breakdown
- conflict escalation
- low morale

Leadership intervention introduces:
- accountability systems
- structured meetings
- communication standards
- collaborative planning

Performance improves significantly.

---

# 11. Conclusion

Teamwork is a strategic organizational capability essential for innovation, operational efficiency, and sustainable growth.
`,

    objectives: [
      "Analyze group dynamics",
      "Evaluate collaboration systems",
      "Assess communication effectiveness",
      "Apply conflict management principles",
      "Design high-performance team structures",
      "Evaluate psychological safety systems"
    ],

    quizzes: [{
      title: "Advanced Teamwork & Collaboration Quiz",
      questions: [
        {
          prompt: "Psychological safety improves:",
          options: [
            "Innovation",
            "Communication",
            "Collaboration",
            "All of the above"
          ],
          correct_index: 3
        },
        {
          prompt: "The storming stage involves:",
          options: [
            "Conflict and role competition",
            "Project closure",
            "Celebration",
            "Financial auditing"
          ],
          correct_index: 0
        }
      ]
    }],

    assignment: {
      title: "High-Performance Team Development Strategy",
      instructions: `
Develop an organizational teamwork and collaboration framework.

Include:
- communication systems
- accountability structures
- leadership systems
- conflict management
- psychological safety strategies
- team performance monitoring

Word Count: 4500 words.
`
    }
  }]
},

/* =====================================================
   10. PERFORMANCE MANAGEMENT (VERY VERY VERY VERY BUCKY)
===================================================== */
{
  slug: "performance-management",
  title: "Performance Management (Advanced Organizational Performance, KPI Systems & Strategic Accountability)",
  price: "$50",
  category: "HR Training",
  pass_threshold: 70,

  lessons: [{
    title: "Performance Systems, Accountability and Organizational Efficiency",
    order_index: 0,
    estimated_duration: 280,
    content: `
# 1. Foundations of Performance Management

Performance management is the organizational system used to:
- evaluate employee output
- improve productivity
- align strategy
- monitor accountability
- strengthen operational efficiency

---

# 2. Organizational Objectives

Performance systems align:
- employee goals
- departmental objectives
- organizational strategy
- operational priorities

---

# 3. KPI Systems

Key Performance Indicators measure:
- productivity
- efficiency
- quality
- profitability
- customer satisfaction

---

# 4. SMART Objectives

Objectives must be:
- specific
- measurable
- achievable
- relevant
- time-bound

---

# 5. Employee Evaluation Systems

Organizations use:
- performance reviews
- appraisals
- productivity monitoring
- behavioral assessments
- competency analysis

---

# 6. Motivation and Performance

Strong performance systems improve:
- accountability
- motivation
- morale
- engagement

Weak systems create:
- confusion
- disengagement
- resentment
- turnover

---

# 7. Leadership and Accountability

Managers must:
- provide feedback
- monitor progress
- support development
- correct underperformance

---

# 8. Performance Improvement Plans

PIPs include:
- behavioral targets
- productivity goals
- timelines
- accountability structures
- monitoring systems

---

# 9. Organizational Consequences of Poor Performance Management

Weak systems create:
- productivity decline
- employee frustration
- inconsistent standards
- operational instability

---

# 10. Advanced Case Study

An organization experiences declining productivity because goals are unclear and performance reviews are inconsistent.

New KPI systems and structured evaluations improve accountability and morale.

---

# 11. Conclusion

Performance management is essential for strategic execution, employee development, and organizational sustainability.
`,

    objectives: [
      "Analyze KPI systems",
      "Evaluate performance frameworks",
      "Assess accountability structures",
      "Apply employee evaluation systems",
      "Design strategic performance systems"
    ],

    quizzes: [{
      title: "Advanced Performance Management Quiz",
      questions: [
        {
          prompt: "KPIs are used to measure:",
          options: [
            "Productivity",
            "Efficiency",
            "Quality",
            "All of the above"
          ],
          correct_index: 3
        },
        {
          prompt: "Poor performance systems may create:",
          options: [
            "Confusion",
            "Disengagement",
            "Operational instability",
            "All of the above"
          ],
          correct_index: 3
        }
      ]
    }],

    assignment: {
      title: "Enterprise Strategic Performance Management Framework",
      instructions: `
Develop a complete organizational performance management system.

Include:
- KPI structures
- SMART objectives
- accountability systems
- employee evaluation frameworks
- leadership responsibilities
- performance improvement plans
- productivity monitoring systems

Word Count: 5000 words.
`
    }
  }]
},

/* =====================================================
   11. SALES SKILLS (VERY VERY VERY VERY BUCKY)
===================================================== */
{
  slug: "sales-skills",
  title: "Sales Skills (Advanced Consumer Psychology, Persuasion & Revenue Strategy)",
  price: "$50",
  category: "HR Training",
  pass_threshold: 70,

  lessons: [{
    title: "Consumer Behavior, Persuasion Psychology and Strategic Sales Systems",
    order_index: 0,
    estimated_duration: 260,
    content: `
# 1. Foundations of Sales

Sales involve the strategic process of:
- persuasion
- relationship building
- customer engagement
- value communication
- revenue generation

---

# 2. Consumer Psychology

Customers are influenced by:
- trust
- emotions
- perception
- communication
- brand reputation

---

# 3. Sales Communication

Effective sales communication requires:
- listening
- empathy
- persuasion
- confidence
- emotional intelligence

---

# 4. Relationship Selling

Long-term customer relationships improve:
- loyalty
- repeat business
- organizational reputation
- profitability

---

# 5. Objection Handling

Sales professionals must manage:
- resistance
- uncertainty
- pricing concerns
- trust barriers

---

# 6. Negotiation in Sales

Sales negotiation includes:
- bargaining
- value positioning
- strategic communication
- compromise

---

# 7. Ethical Selling

Ethical sales require:
- honesty
- transparency
- accountability
- customer respect

---

# 8. Organizational Sales Systems

Organizations implement:
- CRM systems
- sales tracking
- customer analytics
- performance monitoring

---

# 9. Advanced Case Study

A sales organization experiences declining customer retention because employees prioritize aggressive short-term sales instead of relationship management.

Strategic communication and ethical selling systems improve customer trust.

---

# 10. Conclusion

Sales skills combine psychology, communication, persuasion, and relationship management.
`,

    objectives: [
      "Analyze consumer psychology",
      "Evaluate persuasive communication",
      "Assess relationship-selling systems",
      "Apply negotiation principles",
      "Design ethical sales frameworks"
    ],

    quizzes: [{
      title: "Advanced Sales Skills Quiz",
      questions: [
        {
          prompt: "Relationship selling improves:",
          options: [
            "Customer loyalty",
            "Retention",
            "Trust",
            "All of the above"
          ],
          correct_index: 3
        }
      ]
    }],

    assignment: {
      title: "Strategic Sales & Customer Relationship Framework",
      instructions: `
Develop an advanced organizational sales strategy.

Include:
- consumer psychology analysis
- persuasion systems
- relationship management
- CRM structures
- communication systems
- ethical sales principles

Word Count: 4500 words.
`
    }
  }]
}

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
