/**
 * @fileOverview A flow that parses syllabus text to extract assignments.
 *
 * - parseSyllabusText - A function that parses raw syllabus text.
 * - ParseSyllabusTextInput - The input type for the function.
 * - ParseSyllabusTextOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { AssignmentSchema } from '@/ai/schemas/assignment';

const ParseSyllabusTextInputSchema = z.object({
  syllabusText: z
    .string()
    .describe(
      "The raw text content of a course syllabus."
    ),
  currentDate: z.string().optional().describe('The current date.'),
});
export type ParseSyllabusTextInput = z.infer<typeof ParseSyllabusTextInputSchema>;

const ParseSyllabusTextOutputSchema = z.object({
    assignments: z.array(AssignmentSchema)
});
export type ParseSyllabusTextOutput = z.infer<typeof ParseSyllabusTextOutputSchema>;

export async function parseSyllabusText(input: ParseSyllabusTextInput): Promise<ParseSyllabusTextOutput> {
  return parseSyllabusTextFlow(input);
}

const parseSyllabusTextFlow = ai.defineFlow(
  {
    name: 'parseSyllabusTextFlow',
    inputSchema: ParseSyllabusTextInputSchema,
    outputSchema: ParseSyllabusTextOutputSchema,
  },
  async (input: any) => {
    const currentDate = input.currentDate || new Date().toLocaleDateString('en-CA');
    console.log("GenesisAi: Parsing syllabus text via Ollama...");

    try {
      const cleanedSyllabusText = input.syllabusText.replace(/[^\S\r\n]+/g, ' ').trim();
      const { output } = await ai.generate({
        model: 'ollama/genesisai-standalone:latest',
        config: {
          num_ctx: 16384,
          temperature: 0.1,
        },
        onChunk: () => {},
        system: `You are GenesisAi-Standalone, a precise academic extraction system.
        Your mission is to extract every assignment, exam, quiz, and project from the syllabus text.

        CRITICAL DATE RULES:
        - Use ${currentDate} as the reference date to infer the correct year.
        - Always output dates in ISO format (YYYY-MM-DD).
        - If no year is specified, assume the year from ${currentDate}.`,
        prompt: `Extract all assignments from this syllabus text:

        ${cleanedSyllabusText}`,
        output: { schema: ParseSyllabusTextOutputSchema }
      });

      return output || { assignments: [] };
    } catch (error) {
      console.error("GenesisAi syllabus text parsing failed:", error);
      return { assignments: [] };
    }
  }
);
