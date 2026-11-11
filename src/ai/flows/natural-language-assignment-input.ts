import { ollamaModel } from '@/ai/ollama-config';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { AssignmentSchema, type Assignment } from '@/ai/schemas/assignment';

const ParseAssignmentInputSchema = z.object({
  assignmentText: z.string(),
  currentDate: z.string().optional(),
});

export async function parseAssignment(input: z.infer<typeof ParseAssignmentInputSchema>): Promise<Assignment> {
  return parseAssignmentFlow(input);
}

const parseAssignmentFlow = ai.defineFlow(
  {
    name: 'parseAssignmentFlow',
    inputSchema: ParseAssignmentInputSchema,
    outputSchema: AssignmentSchema,
  },
  async (input: any) => {
    console.log("BUDD-IE: Parsing assignment via Ollama...");
    try {
      const cleanedAssignmentText = input.assignmentText.replace(/[^\S\r\n]+/g, ' ').trim();
      const { output } = await ai.generate({
        model: ollamaModel,
        config: {
          num_ctx: 16384,
          temperature: 0.1,
        },
        onChunk: () => {},
        system: `You are BUDD-IE. Convert natural language into a structured assignment JSON object.
        Analyze the input text carefully. If the exact due date is not specified, is ambiguous, or cannot be figured out, set "dueDate" to null.
        Output MUST match this schema:
        {
          "task": string,
          "dueDate": "YYYY-MM-DD" | null,
          "course": string,
          "details": string,
          "priority": "low" | "medium" | "high"
        }`,
        prompt: `Current Date: ${input.currentDate || new Date().toLocaleDateString()}. Input text: ${cleanedAssignmentText}`,
        output: { schema: AssignmentSchema }
      });

      return output || { task: "Unknown Task", dueDate: null, course: "General", details: "", priority: "medium" };
    } catch (error) {
      console.error("BUDD-IE assignment parsing failed:", error);
      throw error;
    }
  }
);
