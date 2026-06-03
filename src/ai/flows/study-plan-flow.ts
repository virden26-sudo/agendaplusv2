import {ai, buddIEGenerate} from '@/ai/genkit';
import {z} from 'genkit';
import {StudyPlanSchema} from '@/ai/schemas';

const AssignmentInputSchema = z.object({
    id: z.string(),
    title: z.string(),
    course: z.string(),
    dueDate: z.date(),
    completed: z.boolean(),
});

const generateStudyPlanFlow = ai.defineFlow(
    {
        name: 'generateStudyPlanFlow',
        inputSchema: z.array(AssignmentInputSchema),
        outputSchema: StudyPlanSchema,
    },
    async (assignments: any[]) => {
        const currentDate = new Date().toLocaleDateString();
        const assignmentsList = assignments.map(a => `- ${a.title} (Course: ${a.course}) - Due: ${a.dueDate}`).join('\n');

        const {output} = await buddIEGenerate({
            system: `You are an expert academic advisor and productivity coach. Your task is to create a highly detailed, actionable, and effective study plan for a student based on their list of upcoming assignments.`,
            prompt: `Today's date is ${currentDate}. The student needs a clear, strategic plan to master their subjects and prepare for deadlines without cramming.

**Core Instructions:**
1.  **Analyze Assignments:** Review the provided list of assignments, paying close attention to due dates and course subjects. Prioritize assignments that are due sooner.
2.  **Deconstruct Tasks:** For each assignment, break down the work into smaller, manageable study sessions. A single assignment might require multiple sessions (e.g., 'Research and Outline', 'Drafting', 'Review and Edit').
3.  **Schedule Logically:**
    *   Distribute study sessions logically across the available time. Avoid scheduling back-to-back sessions for the same subject to prevent burnout.
    *   Leave at least one day of buffer before a major due date for final review.
    *   Schedule sessions in 1-2 hour blocks with breaks implied between them.
4.  **Provide Actionable Goals:** For each session, define specific, concrete goals. Instead of "Study for Math", use goals like "Complete practice problems 1-15 in Chapter 4" or "Create flashcards for key terms in Psychology lecture 5".
5.  **Suggest Study Techniques:** Recommend effective study methods within the session goals where appropriate (e.g., 'Use the Pomodoro Technique (25 min focus, 5 min break)', 'Practice active recall for key concepts', 'Summarize the chapter in your own words').
6.  **Create a Summary:** Begin with a concise, encouraging summary of the study plan's strategy.
7.  **Format Output:** Return the plan in the requested JSON format, ensuring all dates and times are in the correct ISO 8601 format.

Here is the list of upcoming assignments:
${assignmentsList}

Now, create the detailed study plan.`,
            output: {schema: StudyPlanSchema},
        });

        if (!output) {
            throw new Error("Budd-ie: Study plan generation failed to produce output.");
        }
        return output;
    }
);

export async function generateStudyPlan(assignments: z.infer<typeof AssignmentInputSchema>[]) {
    return generateStudyPlanFlow(assignments);
}
