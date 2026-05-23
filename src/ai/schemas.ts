import {z} from 'genkit';

export const AssignmentSchema = z.object({
    title: z.string().describe('The title of the assignment.'),
    course: z.string().describe("The course name for the assignment (e.g., 'CS 101', 'Intro to Psychology')."),
    dueDate: z.string().describe('The due date of the assignment in ISO 8601 format (YYYY-MM-DD).'),
});

const AcademicItemSchema = z.object({
    title: z.string().describe('The title of the academic item (assignment, quiz, test, etc.).'),
    dueDate: z.string().describe('The due date of the item in ISO 8601 format (YYYY-MM-DD).'),
    type: z.enum(['Assignment', 'Quiz', 'Test', 'Reading', 'Discussion', 'Exam']).describe("The type of academic item."),
    score: z.number().optional().describe("The student's score on the item, if available."),
    totalPoints: z.number().optional().describe("The total possible points for the item, if a grade is available."),
});

export const PortalDataSchema = z.object({
    courseName: z.string().describe("The name or title of the course (e.g., 'Introduction to Psychology', 'CS 101')."),
    items: z.array(AcademicItemSchema).describe('A list of all academic items found, including their grades if present.'),
});

export type PortalData = z.infer<typeof PortalDataSchema>;


const StudySessionSchema = z.object({
    topic: z.string().describe("The main topic or subject for the study session."),
    goals: z.array(z.string()).describe("Specific, actionable goals for the session (e.g., 'Complete Chapter 3 practice problems', 'Review lecture notes on Topic X')."),
    startTime: z.string().datetime().describe("The start time for the study session in ISO 8601 format."),
    endTime: z.string().datetime().describe("The end time for the study session in ISO 8601 format."),
    relatedAssignment: z.string().describe("The title of the assignment or quiz this study session is preparing for."),
});

export const StudyPlanSchema = z.object({
    summary: z.string().describe("A brief, encouraging summary of the study plan strategy."),
    sessions: z.array(StudySessionSchema).describe("A list of scheduled study sessions."),
});

export type StudyPlan = z.infer<typeof StudyPlanSchema>;


// Schemas for the AI Tutor
const TutorAssignmentSchema = z.object({
    id: z.string(),
    title: z.string(),
    course: z.string(),
    dueDate: z.date(),
    completed: z.boolean(),
});

const TutorQuizSchema = z.object({
    id: z.string(),
    title: z.string(),
    course: z.string(),
    dueDate: z.date(),
});

const TutorCourseSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    grade: z.number(),
});

export const TutorInputSchema = z.object({
    question: z.string().describe("The student's question for the AI tutor."),
    context: z.object({
        assignments: z.array(TutorAssignmentSchema).describe("The student's list of upcoming assignments."),
        quizzes: z.array(TutorQuizSchema).describe("The student's list of upcoming quizzes and exams."),
        courses: z.array(TutorCourseSchema).describe("The student's list of courses and their current grades."),
        currentDate: z.string().describe("Today's date, for context."),
    }),
});

export const TutorOutputSchema = z.object({
    response: z.string().describe("The AI tutor's helpful, markdown-formatted response to the student's question."),
});

export type TutorInput = z.infer<typeof TutorInputSchema>;
export type TutorOutput = z.infer<typeof TutorOutputSchema>;
