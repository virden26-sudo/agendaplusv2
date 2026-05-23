'use client';

/**
 * @fileOverview A flow that parses grade information from raw text.
 *
 * - parseGrades - A function that parses raw grades text.
 * - ParseGradesInput - The input type for the function.
 * - ParseGradesOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { CourseSchema } from '@/ai/schemas/course';

const ParseGradesInputSchema = z.object({
  gradesText: z
    .string()
    .describe(
      "The raw text content of a student's grades page."
    ),
});
export type ParseGradesInput = z.infer<typeof ParseGradesInputSchema>;

const ParseGradesOutputSchema = z.object({
    courses: z.array(CourseSchema)
});
export type ParseGradesOutput = z.infer<typeof ParseGradesOutputSchema>;

export async function parseGrades(input: ParseGradesInput): Promise<ParseGradesOutput> {
  return parseGradesFlow(input);
}

const parseGradesFlow = ai.defineFlow(
  {
    name: 'parseGradesFlow',
    inputSchema: ParseGradesInputSchema,
    outputSchema: ParseGradesOutputSchema,
  },
  async (input: any) => {
    console.log("GenesisAi: Parsing grades via Ollama...");

    try {
      const { output } = await ai.generate({
        model: 'ollama/GenesisAi-Standalone',
        system: `You are GenesisAi-Standalone, an academic performance analyst.
        Your mission is to scan raw grades text and extract course names and their corresponding grades.

        RULES:
        - Identify all courses and their current grades/percentages.
        - If points are provided (e.g., "450 / 500"), calculate the percentage.
        - Only include courses where a grade is available.`,
        prompt: `Extract course grades from this text:

        ${input.gradesText}`,
        output: { schema: ParseGradesOutputSchema }
      });

      return output || { courses: [] };
    } catch (error) {
      console.error("GenesisAi grade parsing failed:", error);
      return { courses: [] };
    }
  }
);
