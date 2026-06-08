import {ai, buddIEGenerate} from '@/ai/genkit';
import {TestResultsSchema, LearningStrategiesSchema, TestResults} from '@/ai/schemas';

const generateLearningStrategiesFlow = ai.defineFlow(
    {
        name: 'generateLearningStrategiesFlow',
        inputSchema: TestResultsSchema,
        outputSchema: LearningStrategiesSchema,
    },
    async (testResults: TestResults) => {
        const {output} = await buddIEGenerate({
            model: 'ollama/genesisai-standalone:latest',
            config: {
                num_ctx: 16384,
                temperature: 0.2,
            },
            system: `You are Budd-ie, an expert AI tutor. Analyze the student's test results for the course: ${testResults.courseName}.`,
            prompt: `The student took a placement test for ${testResults.courseName}. Here are the results:
            ${JSON.stringify(testResults.results)}

            Analyze the questions they got wrong (where 'wasCorrect' is false).
            For each topic they struggled with, generate specific, actionable learning strategies and resource recommendations to help them improve.
            
            Return the result in the requested JSON format.`,
            output: {schema: LearningStrategiesSchema},
        });

        if (!output) {
            throw new Error("Budd-ie: Learning strategy generation failed.");
        }
        return output;
    }
);

export async function generateLearningStrategies(testResults: TestResults) {
    return generateLearningStrategiesFlow(testResults);
}
