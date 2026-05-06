'use client';

/**
 * @fileOverview An AI agent that suggests optimal study times based on a student's schedule,
 * assignment difficulty, and due dates.
 *
 * - suggestStudySchedule - A function that handles the study schedule suggestion process.
 * - StudyScheduleInput - The input type for the suggestStudySchedule function.
 * - StudyScheduleOutput - The return type for the suggestStudySchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const StudyScheduleInputSchema = z.object({
  assignments: z
    .string()
    .describe(
      'A list of assignments as a JSON string. Should include assignment name, due date, and estimated difficulty (e.g., easy, medium, hard).'
    ),
});
export type StudyScheduleInput = z.infer<typeof StudyScheduleInputSchema>;

const StudyScheduleOutputSchema = z.object({
  suggestedSchedule: z
    .string()
    .describe(
      'A JSON string containing suggested study schedule. Should include day of the week, start time, end time, and the assignment to work on during that time.'
    ),
  reasoning: z
    .string()
    .describe(
      'A string containing the reasoning for the suggested schedule.'
    ),
});
export type StudyScheduleOutput = z.infer<typeof StudyScheduleOutputSchema>;

export async function suggestStudySchedule(
  input: StudyScheduleInput
): Promise<StudyScheduleOutput> {
  return suggestStudyScheduleFlow(input);
}

const suggestStudyScheduleFlow = ai.defineFlow(
  {
    name: 'suggestStudyScheduleFlow',
    inputSchema: StudyScheduleInputSchema,
    outputSchema: StudyScheduleOutputSchema,
  },
  async (input: any) => {
    console.log("GenesisAi: Generating study schedule suggestions via Ollama...");

    try {
      const { output } = await ai.generate({
        model: 'ollama/GenesisAi-Standalone',
        system: `You are GenesisAi-Standalone, a high-performance academic strategist.
        Your mission is to create an optimized study schedule that maximizes productivity and minimizes stress.

        STRATEGY:
        - Prioritize assignments by proximity of deadline and difficulty.
        - Suggest specific time blocks for deep work.
        - Include short recovery breaks.
        - Be encouraging but focused on tactical execution.`,
        prompt: `Create a study schedule for these assignments:

        ${input.assignments}`,
        output: { schema: StudyScheduleOutputSchema }
      });

      return output || { suggestedSchedule: "[]", reasoning: "Could not generate a schedule at this time." };
    } catch (error) {
      console.error("GenesisAi study schedule generation failed:", error);
      return { suggestedSchedule: "[]", reasoning: "An error occurred while planning your schedule." };
    }
  }
);
