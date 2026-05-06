'use server';

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
    console.log("GenesisAi: Parsing assignment via Ollama...");
    try {
      const { output } = await ai.generate({
        model: 'ollama/GenesisAi-Standalone',
        system: `You are GenesisAi-Standalone. Convert natural language into a structured assignment JSON object.
        Output MUST match this schema:
        {
          "task": string,
          "dueDate": "YYYY-MM-DD",
          "course": string,
          "details": string,
          "priority": "low" | "medium" | "high"
        }`,
        prompt: `Current Date: ${input.currentDate || new Date().toLocaleDateString()}. Input text: ${input.assignmentText}`,
        output: { schema: AssignmentSchema }
      });

      return output || { task: "Unknown Task", dueDate: new Date().toISOString().split('T')[0], course: "General", details: "", priority: "medium" };
    } catch (error) {
      console.error("GenesisAi assignment parsing failed:", error);
      throw error;
    }
  }
);
