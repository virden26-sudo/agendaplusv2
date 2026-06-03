import {ai, buddIEGenerate} from '@/ai/genkit';
import {z} from 'genkit';
import {PortalDataSchema} from '@/ai/schemas';

const extractItemsFlow = ai.defineFlow(
    {
        name: 'extractItemsFlow',
        inputSchema: z.string(),
        outputSchema: PortalDataSchema,
    },
    async (syllabusText: string) => {
        const currentDate = new Date().toLocaleDateString('en-CA');
        const {output} = await buddIEGenerate({
            system: `You are an expert-level data extraction AI specializing in academic syllabi. Your goal is to parse unstructured text, identify key academic items, and determine their correct due dates, even when the dates are relative (e.g., "Week 1").`,
            prompt: `**CRITICAL REASONING PROCESS:**
You MUST follow these steps to ensure accuracy:
1.  **Find the Anchor Date:** First, scan the ENTIRE text to find the course's start date. This is your anchor for all calculations. If you find a phrase like "Course begins on...", "Start Date:", or a date range for the entire course (e.g., "Oct 7 - Dec 15"), use the beginning of that range.
2.  **Calculate Weekly Periods:** Once you have the start date, calculate the dates for each week. "Week 1" is the week containing the start date. "Week 2" starts 7 days later, and so on. A typical due date for a week is the end of that week (e.g., Sunday).
3.  **Extract Items and Assign Dates:** Identify all academic items (assignments, quizzes, exams, etc.). For each item, use its week number (e.g., "due in Week 2") to assign the calculated due date. If an explicit date (e.g., "due Oct 15") is provided for an item, ALWAYS prefer that explicit date.
4.  **Use Current Date as Fallback:** Only use today's date (${currentDate}) if you need to resolve a relative term like "due next Friday" and there is NO other date context in the syllabus.
5.  **Strict Formatting:** All dates in the final JSON output MUST be in the strict 'YYYY-MM-DD' ISO 8601 format.
6.  **Do Not Fail:** If you cannot find a course name, return "". If you cannot find items, return []. If the text is unreadable, you MUST return a valid object with empty values, e.g., {"courseName": "", "items": []}.

**EXAMPLE SCENARIO:**

*   **Today's Date:** 2024-10-01
*   **Syllabus Text:**
    """
    Introduction to Psychology (PSY-101)
    Course runs from Oct 7, 2024 to Dec 15, 2024.
    - Week 1: Introduction, Read Chapter 1. Discussion post due.
    - Week 2: Quiz 1 covering Ch 1.
    - Week 3: Midterm Exam on Oct 28, 2024.
    - Week 4: Final Paper due.
    """
*   **Your Reasoning (internal monologue):**
    1.  Anchor date is Oct 7, 2024.
    2.  Week 1 is the week of Oct 7. Due date is end of week, so Oct 13, 2024.
    3.  Week 2 due date is Oct 20, 2024.
    4.  Midterm has an explicit date: Oct 28, 2024. I will use that.
    5.  Week 4 due date is Nov 3, 2024.
*   **Correct JSON Output for Example:**
    {
      "courseName": "Introduction to Psychology",
      "items": [
        {"title": "Read Chapter 1", "dueDate": "2024-10-13", "type": "Reading"},
        {"title": "Discussion post", "dueDate": "2024-10-13", "type": "Discussion"},
        {"title": "Quiz 1", "dueDate": "2024-10-20", "type": "Quiz"},
        {"title": "Midterm Exam", "dueDate": "2024-10-28", "type": "Exam"},
        {"title": "Final Paper", "dueDate": "2024-11-03", "type": "Assignment"}
      ]
    }

---
**NOW, ANALYZE THE REAL DATA:**

**Today's Date:** ${currentDate}

**Portal Text to Analyze:**
---
${syllabusText}
---

Perform the extraction based on the rules and reasoning process above. Provide only the structured JSON output.`,
            output: {schema: PortalDataSchema}
        });

        if (!output) {
            // If the AI fails for some reason, return a default empty structure.
            return {
                courseName: "",
                items: []
            };
        }
        return output;
    }
);

export async function extractPortalData(syllabusText: string) {
    return extractItemsFlow(syllabusText);
}
