
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { AssignmentSchema } from '@/ai/schemas/assignment';
import { scrapePortal } from '@/lib/scraper';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    const causeMessage = cause instanceof Error ? cause.message : "";
    const causeCode = typeof cause === "object" && cause && "code" in cause ? String(cause.code) : "";

    if (
      error.message.includes("fetch failed") &&
      (causeMessage.includes("Headers Timeout") || causeCode === "UND_ERR_HEADERS_TIMEOUT")
    ) {
      return "Ollama timed out before the local model returned a response. The portal text was extracted, but genesisai-standalone is taking too long or is overloaded. Try closing other memory-heavy apps, restarting Ollama, then syncing again.";
    }

    return causeMessage ? `${error.message}: ${causeMessage}` : error.message;
  }

  return String(error);
};

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

const TolerantAssignmentSchema = AssignmentSchema.omit({priority: true}).extend({
    priority: z.enum(["low", "medium", "high"]).or(z.literal("")).nullable().optional()
});

const TolerantDiscussionSchema = DiscussionSchema.extend({
    postedDate: z.string().optional().nullable()
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

const TolerantPortalPayloadSchema = z.object({
    assignments: z.array(TolerantAssignmentSchema).optional().default([]),
    announcements: z.array(AnnouncementSchema).optional().default([]),
    discussions: z.array(TolerantDiscussionSchema).optional().default([])
}).passthrough();

const TolerantGenkitOutputSchema = z.union([
    TolerantPortalPayloadSchema,
    z.object({
        properties: TolerantPortalPayloadSchema
    }).passthrough()
]);

const normalizePortalOutput = (rawOutput: unknown, currentDate: string): z.infer<typeof PortalParserOutputSchema> => {
    const outputCandidate =
        rawOutput &&
        typeof rawOutput === "object" &&
        "properties" in rawOutput &&
        rawOutput.properties &&
        typeof rawOutput.properties === "object"
            ? rawOutput.properties
            : rawOutput;

    const parsed = TolerantPortalPayloadSchema.parse(outputCandidate || {});

    return PortalParserOutputSchema.parse({
        assignments: parsed.assignments.map((assignment) => ({
            task: assignment.task,
            dueDate: assignment.dueDate || null,
            course: assignment.course || null,
            details: assignment.details || null,
            priority: assignment.priority || undefined
        })),
        announcements: parsed.announcements.map((announcement) => ({
            ...announcement,
            content: announcement.content || "",
            date: announcement.date || null,
            course: announcement.course || null,
            important: Boolean(announcement.important)
        })),
        discussions: parsed.discussions.map((discussion) => ({
            ...discussion,
            content: discussion.content || "",
            dueDate: discussion.dueDate || null,
            postedDate: discussion.postedDate || currentDate,
            course: discussion.course || null,
            author: discussion.author || null
        }))
    });
};

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
            throw new Error(`Portal scraping failed: ${getErrorMessage(scrapeError)}`);
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
        model: 'ollama/genesisai-standalone:latest',
        system: `You are GenesisAi-Standalone. Your mission is to scan the provided portal data and extract EVERYTHING for the student's courses.

        CRITICAL DATA CAPTURE RULES:
        - EXTRACT ALL WEEKS: Identify and extract tasks from every week mentioned.
        - INFER YEARS: Use ${currentDate} to anchor all dates.
        - ISO FORMAT: Always output dates as YYYY-MM-DD.
        - OUTPUT ONLY THE DATA OBJECT. Do not output a JSON schema, "type", "properties", or "required" wrapper.`,
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
        output: { schema: TolerantGenkitOutputSchema }
      });

      return normalizePortalOutput(output, currentDate);
    } catch (error) {
      console.error("GenesisAi portal parsing failed:", error);
      throw new Error(`GenesisAi could not parse the extracted portal text: ${getErrorMessage(error)}`);
    }
  }
);
