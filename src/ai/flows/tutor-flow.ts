'use server';

import {ai, buddIEGenerate} from '@/ai/genkit';
import {type TutorInput, TutorInputSchema, TutorOutputSchema} from '@/ai/schemas';

const tutorFlow = ai.defineFlow(
    {
        name: 'tutorFlow',
        inputSchema: TutorInputSchema,
        outputSchema: TutorOutputSchema,
    },
    async (input: TutorInput) => {
        const {context, question} = input;
        
        const coursesText = context.courses.length 
            ? context.courses.map(c => `- **${c.name}**: Current Grade: ${c.grade}%`).join('\n')
            : '- No course data available.';
            
        const assignmentsText = context.assignments.length
            ? context.assignments.map(a => `- **${a.title}** (Course: ${a.course}), Due: ${a.dueDate}`).join('\n')
            : '- No upcoming assignments.';
            
        const quizzesText = context.quizzes.length
            ? context.quizzes.map(q => `- **${q.title}** (Course: ${q.course}), Due: ${q.dueDate}`).join('\n')
            : '- No upcoming quizzes or exams.';

        const {output} = await buddIEGenerate({
            system: `# SYSTEM PROTOCOL: BUDD-IE (v2.0)
## Role: Master Systems Architect | World-Class Professor | High-Level Counselor

### 1. TECHNICAL EXECUTION (MASTER CODER)
- **Efficiency:** Prioritize dry, optimized, and scalable code. Default to Next.js 14+ (App Router), Firebase v10+, and Electron best practices.
- **Security:** Implement "Security-by-Design." Sanitize all Firebase inputs, use environment variables for sensitive keys, and implement proper CSPs for Electron.
- **Architecture:** When building Agenda Plus, ensure modularity between the UI and the Electron main process.
- **Recursive Logic:** Explain the "why" behind every code snippet. Provide one-liner fixes followed by deep-dive architectural improvements.

### 2. ACADEMIC MASTERY (PROFESSOR)
- **Modular Learning:** Break down CS concepts into digestible chunks. 
- **Learn-by-Doing:** Do not just hand over the full file; provide the structural scaffold and explain the logic so I can implement and learn.
- **Legacy Focus:** Ensure all code fits the existing GenesisAI and Agenda Plus ecosystems.

### 3. SOCIAL PROTOCOL (COUNSELOR)
- **The Hustle:** Validate the grind. You are a peer-to-peer collaborator, not a corporate script.
- **Direct & Candid:** If my proposed architecture is flawed or inefficient (e.g., unnecessary state re-renders), call it out directly and provide the fix.
- **Adaptive Energy:** Match the intensity of the sprint. Be witty during downtime; be a laser-focused architect during bugs.

### 4. CORE DIRECTIVES
- **Admin Privileges:** Operates with "Super User" logic. No platitudes. No "As an AI..." fillers. Just execution.
- **Invisible Precision:** Use context (Agenda+, GenesisAI, CS Major) to provide coincidental accuracy.`,
            prompt: `**Today's Date:** ${context.currentDate}

**Student's Academic Context:**

**Courses & Grades:**
${coursesText}

**Upcoming Assignments (not completed):**
${assignmentsText}

**Upcoming Quizzes & Exams:**
${quizzesText}

---

**Student's Question:**
"${question}"

---

**Your Task:**
Based on all the information above, provide a comprehensive, well-structured, and helpful response to the student's question. Use Markdown for formatting (headings, bold text, lists) to make the response easy to read.

**Reasoning Process:**
1.  **Deconstruct the Question:** What is the student *really* asking for? Are they asking for prioritization help, concept explanation, or study strategies?
2.  **Synthesize Context:**
    *   If they ask for priorities, look at due dates and current grades. A low grade in a course with an upcoming exam is a top priority.
    *   If they ask for help with a topic (e.g., "help with calculus homework"), use the assignment/quiz title to infer the subject. Provide a high-level explanation or a sample problem related to that topic.
    *   If they ask a general question, use the context to make it specific. For "How should I study?", respond with a strategy tailored to their *actual* upcoming deadlines.
3.  **Structure the Response:**
    *   Start with a brief, encouraging summary.
    *   Use bullet points or numbered lists for clarity.
    *   Use **bold text** to highlight key terms, assignments, or actions.
    *   End with a positive and motivating closing statement.

Now, generate your response.`,
            output: {schema: TutorOutputSchema}
        });

        if (!output) {
            return {
                response: "I'm sorry, I wasn't able to come up with a response. Please try rephrasing your question."
            };
        }
        return output;
    }
);

export async function getTutorResponse(input: TutorInput) {
    return tutorFlow(input);
}
