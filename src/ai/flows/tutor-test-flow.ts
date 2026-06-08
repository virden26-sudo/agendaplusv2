import {ai, buddIEGenerate} from '@/ai/genkit';
import {z} from 'genkit';
import {PlacementTestSchema} from '@/ai/schemas';

const generatePlacementTestFlow = ai.defineFlow(
    {
        name: 'generatePlacementTestFlow',
        inputSchema: z.string().describe("The name of the course."),
        outputSchema: PlacementTestSchema,
    },
    async (courseName: string) => {
        const {output} = await buddIEGenerate({
            model: 'ollama/genesisai-standalone:latest', // Identifier remains to avoid breaking Ollama connection
            config: {
                num_ctx: 16384,
                temperature: 0.3,
            },
            system: `You are Budd-ie, an expert AI tutor. Generate a 5-question multiple-choice placement test for the course: ${courseName}.`,
            prompt: `Generate a challenging 5-question multiple-choice placement test for ${courseName}. 
            Each question should have:
            - questionText
            - options (array of 4)
            - correctAnswerIndex (0-3)
            - explanation

            Ensure the questions cover fundamental concepts of the course.`,
            output: {schema: PlacementTestSchema},
        });

        if (!output) {
            throw new Error("Budd-ie: Placement test generation failed.");
        }
        return output;
    }
);

export async function generatePlacementTest(courseName: string) {
    return generatePlacementTestFlow(courseName);
}
