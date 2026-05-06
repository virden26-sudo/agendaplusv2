'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {AssignmentSchema} from '@/ai/schemas/assignment';
import {scrapePortal} from '@/lib/scraper';

const AnnouncementSchema = z.object({
    title: z.string(),
    content: z.string().optional().nullable(),
    date: z.string().optional().nullable(), // ISO or human readable
    course: z.string().optional().nullable(),
    important: z.boolean().optional().nullable()
});

const DiscussionSchema = z.object({
    title: z.string(),
    content: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    postedDate: z.string(),
    course: z.string().optional().nullable(),
    author: z.string().optional().nullable()
});

const PortalParserInputSchema = z.object({
    portalText: z.string().optional(),
    portalFile: z.string().optional(), // Support for data URIs (images, PDFs)
    url: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    currentDate: z.string().optional(),
});

const PortalParserOutputSchema = z.object({
    assignments: z.array(AssignmentSchema),
    announcements: z.array(AnnouncementSchema),
    discussions: z.array(DiscussionSchema)
});

export async function parsePortalData(input: z.infer<typeof PortalParserInputSchema>): Promise<z.infer<typeof PortalParserOutputSchema>> {
    return parsePortalFlow(input);
}

const parsePortalFlow = ai.defineFlow(
    {
        name: 'parsePortalFlow',
        inputSchema: PortalParserInputSchema,
        outputSchema: PortalParserOutputSchema,
    },
    async (input: any) => {
        let textToParse = input.portalText || "";
        let fileToParse = input.portalFile || "";

        if (input.url) {
            console.log(`GenesisAi: Launching autonomous scraper for ${input.url}`);
            try {
                textToParse = await scrapePortal(input.url, input.username, input.password);
                console.log(`GenesisAi: Scraper returned ${textToParse.length} characters.`);
            } catch (scrapeError) {
                console.warn(`GenesisAi: Scraping failed for ${input.url}:`, scrapeError);
                return {
                    assignments: [],
                    announcements: [],
                    discussions: []
                };
            }
        }

        if (!textToParse && !fileToParse) {
            return {
                assignments: [],
                announcements: [],
                discussions: []
            };
        }

        console.log("GenesisAi: Parsing portal data via Ollama...");

        const currentDate = input.currentDate || new Date().toLocaleDateString('en-CA');
        const isD2L = input.url?.includes('d2l') || textToParse.includes('d2l');

        try {
            const {output} = await ai.generate({
                model: 'ollama/GenesisAi-Standalone',
                system: `You are GenesisAi-Standalone. Your mission is to scan the provided portal data and extract EVERYTHING for the student's courses.

        CRITICAL DATA CAPTURE RULES:
        - EXTRACT ALL WEEKS: Identify and extract tasks from every week mentioned.
        - INFER YEARS: Use ${currentDate} to anchor all dates.
        - ISO FORMAT: Always output dates as YYYY-MM-DD.
        ${isD2L ? '- D2L DETECTION: This looks like a Brightspace D2L portal. Look specifically for "Discussion Topics", "Forums", "Threads", and "Posts".' : ''}
        
        RESPONSE FORMAT:
        - Return ONLY valid JSON
        - Do NOT include markdown code blocks or explanatory text
        - Do NOT add any text before or after the JSON object
        - Ensure all strings are properly quoted and escaped`,
                prompt: `Process this portal data:
        ${textToParse}

        ${fileToParse ? `Media attached: ${fileToParse}` : ''}
        
        Return the extracted data as a valid JSON object with this structure:
        {
          "assignments": [...],
          "announcements": [...],
          "discussions": [...]
        }`,
                messages: fileToParse ? [
                    {
                        role: 'user',
                        content: [
                            {media: {url: fileToParse, contentType: 'image/jpeg'}}, // Adjust content type as needed
                            {text: `Extract data from this portal view. Today is ${currentDate}. Return ONLY valid JSON.`}
                        ]
                    }
                ] : [],
                output: {schema: PortalParserOutputSchema}
            });

            console.log("GenesisAi: Parser output counts", {
                assignments: output?.assignments?.length ?? 0,
                announcements: output?.announcements?.length ?? 0,
                discussions: output?.discussions?.length ?? 0,
            });

            return output || {
                assignments: [],
                announcements: [],
                discussions: []
            };
        } catch (error: any) {
            console.error("GenesisAi portal parsing failed:", error);

            // Log more details to help debug JSON parsing issues
            if (error.message && error.message.includes('JSON5')) {
                console.error("JSON5 parsing error details:", {
                    message: error.message,
                    line: error.lineNumber,
                    column: error.columnNumber
                });
            }

            return {
                assignments: [],
                announcements: [],
                discussions: []
            };
        }
    }
);
