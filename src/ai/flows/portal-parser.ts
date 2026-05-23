
'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { AssignmentSchema } from '@/ai/schemas/assignment';
import { scrapePortal } from '@/lib/scraper';

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

    try {
      const { output } = await ai.generate({
        model: 'ollama/GenesisAi-Standalone',
        system: `You are GenesisAi-Standalone. Your mission is to scan the provided portal data and extract EVERYTHING for the student's courses.

        CRITICAL DATA CAPTURE RULES:
        - EXTRACT ALL WEEKS: Identify and extract tasks from every week mentioned.
        - INFER YEARS: Use ${currentDate} to anchor all dates.
        - ISO FORMAT: Always output dates as YYYY-MM-DD.`,
        prompt: `Process this portal data:
        ${textToParse}

        ${fileToParse ? `Media attached: ${fileToParse}` : ''}`,
        messages: fileToParse ? [
            {
                role: 'user',
                content: [
                    { media: { url: fileToParse, contentType: 'image/jpeg' } }, // Adjust content type as needed
                    { text: `Extract data from this portal view. Today is ${currentDate}.` }
                ]
            }
        ] : [],
        output: { schema: PortalParserOutputSchema }
      });

      return output || {
        assignments: [],
        announcements: [],
        discussions: []
      };
    } catch (error) {
      console.error("GenesisAi portal parsing failed:", error);
      return {
        assignments: [],
        announcements: [],
        discussions: []
      };
    }
  }
);
