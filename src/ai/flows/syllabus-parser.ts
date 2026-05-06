'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {AssignmentSchema} from '@/ai/schemas/assignment';

const ParseSyllabusInputSchema = z.object({
    syllabusFile: z.string(),
    currentDate: z.string().optional(),
});

const ParseSyllabusOutputSchema = z.object({
    assignments: z.array(AssignmentSchema)
});

export async function parseSyllabus(input: z.infer<typeof ParseSyllabusInputSchema>): Promise<z.infer<typeof ParseSyllabusOutputSchema>> {
    return parseSyllabusFlow(input);
}

const parseSyllabusFlow = ai.defineFlow(
    {
        name: 'parseSyllabusFlow',
        inputSchema: ParseSyllabusInputSchema,
        outputSchema: ParseSyllabusOutputSchema,
    },
    async (input: any) => {
        console.log("GenesisAi: Analyzing syllabus file via Ollama...");
        try {
            const {output} = await ai.generate({
                model: 'ollama/GenesisAi-Standalone',
                system: `You are GenesisAi-Standalone. Extract all assignments from the syllabus document.
        Output MUST be valid JSON with an 'assignments' array matching the schema.`,
                prompt: `Current Date: ${input.currentDate || new Date().toLocaleDateString()}. Extract assignments from this document.`,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {media: {url: input.syllabusFile, contentType: 'application/pdf'}}, // Assuming PDF as default for syllabus
                            {text: `Extract all assignments from this syllabus. Today is ${input.currentDate}.`}
                        ]
                    }
                ],
                output: {schema: ParseSyllabusOutputSchema}
            });

            return output || {assignments: []};
        } catch (error) {
            console.error("GenesisAi syllabus parsing failed:", error);
            return {assignments: []};
        }
    }
);
