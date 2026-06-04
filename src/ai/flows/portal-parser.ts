
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { AssignmentSchema } from '@/ai/schemas/assignment';
import { scrapePortal } from '@/lib/scraper';
import { countPortalItems, mergePortalParseResults, parsePortalTextHeuristically } from '@/lib/portal-text-parser';

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

const TolerantAssignmentSchema = z.object({
    task: z.string().optional(),
    title: z.string().optional(),
    evaluationStatus: z.string().optional(),
    dueDate: z.string().optional().nullable(),
    course: z.string().optional().nullable(),
    details: z.string().optional().nullable(),
    priority: z.enum(["low", "medium", "high"]).or(z.literal("")).nullable().optional()
}).passthrough();

const TolerantDiscussionSchema = z.object({
    title: z.string().optional(),
    task: z.string().optional(),
    content: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    postedDate: z.string().optional().nullable(),
    course: z.string().optional().nullable(),
    author: z.string().optional().nullable()
}).passthrough();

const TolerantAnnouncementSchema = z.object({
    title: z.string().optional(),
    content: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    course: z.string().optional().nullable(),
    important: z.boolean().optional().nullable()
}).passthrough();

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
    discussions: z.array(DiscussionSchema),
    quizzes: z.array(AssignmentSchema).optional().default([]),
    grades: z.array(z.object({
        course: z.string(),
        grade: z.string(), // Keeping as string to handle "95%" or "A"
        details: z.string().optional().nullable()
    })).optional().default([])
});

const TolerantPortalPayloadSchema = z.object({
    assignments: z.array(TolerantAssignmentSchema).optional().default([]),
    announcements: z.array(TolerantAnnouncementSchema).optional().default([]),
    discussions: z.array(TolerantDiscussionSchema).optional().default([]),
    quizzes: z.array(TolerantAssignmentSchema).optional().default([]),
    grades: z.array(z.object({
        course: z.string().optional().default(""),
        grade: z.string().optional().default(""),
        details: z.string().optional().nullable()
    })).optional().default([])
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
            task: assignment.task || assignment.title || "Untitled Assignment",
            dueDate: assignment.dueDate || null,
            course: assignment.course || null,
            details: assignment.details || null,
            priority: (assignment.priority as "low" | "medium" | "high" | "" | null | undefined) || undefined
        })),
        announcements: parsed.announcements.map((announcement) => ({
            title: announcement.title || "Untitled Announcement",
            content: announcement.content || "",
            date: announcement.date || null,
            course: announcement.course || null,
            important: Boolean(announcement.important)
        })),
        discussions: parsed.discussions.map((discussion) => ({
            title: discussion.title || discussion.task || "Untitled Discussion",
            content: discussion.content || "",
            dueDate: discussion.dueDate || null,
            postedDate: discussion.postedDate || currentDate,
            course: discussion.course || null,
            author: discussion.author || null
        })),
        quizzes: (parsed.quizzes || []).map((quiz) => ({
            task: quiz.task || quiz.evaluationStatus || quiz.title || "Untitled Quiz",
            dueDate: quiz.dueDate || null,
            course: quiz.course || null,
            details: quiz.details || null,
            priority: (quiz.priority as "low" | "medium" | "high" | "" | null | undefined) || undefined
        })),
        grades: (parsed.grades || []).map((g) => ({
            course: g.course || "Current Course",
            grade: g.grade || "N/A",
            details: g.details || null
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
  async (input: z.infer<typeof PortalParserInputSchema>) => {
    let textToParse = input.portalText || "";
    let fileToParse = input.portalFile || "";

    if (input.url) {
        console.log(`GenesisAi: Launching autonomous scraper for ${input.url}`);
        try {
            textToParse = await scrapePortal(input.url, input.username, input.password);
        } catch (scrapeError: unknown) {
            console.warn(`GenesisAi: Scraping failed for ${input.url}:`, scrapeError);
            const message = getErrorMessage(scrapeError);
            if (/detached|lifecyclewatcher/i.test(message)) {
                throw new Error(
                    `Portal scraping interrupted while the page was still loading. Leave the login browser open on your D2L course, wait for assignments to appear, then Rescan. (${message})`
                );
            }
            throw new Error(`Portal scraping failed: ${message}`);
        }
    }

    if (!textToParse && !fileToParse) {
        return {
            assignments: [],
            announcements: [],
            discussions: [],
            quizzes: [],
            grades: []
        };
    }

    const currentDate = input.currentDate || new Date().toLocaleDateString('en-CA');
    const cleanedText = textToParse.replace(/[^\S\r\n]+/g, ' ').trim();
    console.log(`GenesisAi: Scraped portal text length: ${cleanedText.length} characters`);

    if (cleanedText.length < 200) {
      throw new Error(
        "The portal page did not return enough text to parse. Complete login in the browser window, open your course home, then sync again."
      );
    }

    const deterministicResult = parsePortalTextHeuristically(cleanedText, currentDate);
    const deterministicCount = countPortalItems(deterministicResult);

    console.log("GenesisAi: Deterministic portal parser found", {
      assignments: deterministicResult.assignments.length,
      quizzes: deterministicResult.quizzes.length,
      discussions: deterministicResult.discussions.length,
      announcements: deterministicResult.announcements.length,
      total: deterministicCount,
    });

    // Reliable path: scraped D2L section text parses without waiting on Ollama.
    if (deterministicCount > 0) {
      console.log("GenesisAi: Using deterministic extraction (Ollama skipped).");
      return {
        ...deterministicResult,
        grades: [],
      };
    }

    console.log("GenesisAi: No heuristic matches; parsing portal data via Ollama...");

    try {
      const { output } = await ai.generate({
        model: 'ollama/genesisai-standalone:latest',
        config: {
          temperature: 0.1,
          num_ctx: 16384, // Increase context window for large portal data
        },
        onChunk: () => {
          // Providing a no-op chunk handler forces streaming at the Ollama level,
          // which ensures headers are sent immediately and prevents UND_ERR_HEADERS_TIMEOUT
          // during long prompt processing.
        },
        system: `You are GenesisAi-Standalone. Your mission is to scan the provided portal data and extract EVERYTHING for the student's courses.

        The data is organized into sections: Assignments, Quizzes, Discussions, and Grades.

        CRITICAL DATA CAPTURE RULES:
        - EXTRACT ALL SECTIONS: Identify and extract tasks from Assignments, Quizzes, and Discussions.
        - EXTRACT GRADES: Look for course names and current grades/percentages.
        - INFER YEARS: Use ${currentDate} to anchor all dates.
        - ISO FORMAT: Always output dates as YYYY-MM-DD.
        - OUTPUT ONLY THE DATA OBJECT. Do not output a JSON schema, "type", "properties", or "required" wrapper.`,
        messages: [
            {
                role: 'user',
                content: [
                    ...(fileToParse ? [{ media: { url: fileToParse, contentType: 'image/jpeg' } }] : []),
                    { 
                      text: `Process this multi-section portal data. Today is ${currentDate}.
                      
                      Portal Data:
                      ${cleanedText}` 
                    }
                ]
            }
        ],
        output: { schema: TolerantGenkitOutputSchema }
      });

      const aiResult = normalizePortalOutput(output, currentDate);
      const merged = mergePortalParseResults(aiResult, {
        ...deterministicResult,
        grades: [],
      });

      if (countPortalItems(merged) === 0) {
        throw new Error(
          "GenesisAi extracted portal text but could not find assignments, quizzes, or discussions. Open Assignments in your portal, then sync again."
        );
      }

      return merged;
    } catch (error: unknown) {
      console.error("GenesisAi portal parsing failed:", error);
      if (
        deterministicResult.assignments.length > 0 ||
        deterministicResult.quizzes.length > 0 ||
        deterministicResult.discussions.length > 0 ||
        deterministicResult.announcements.length > 0
      ) {
        console.warn("GenesisAi: Ollama failed, using deterministic portal parser result.");
        return {
          ...deterministicResult,
          grades: [],
        };
      }

      throw new Error(`GenesisAi could not parse the extracted portal text: ${getErrorMessage(error)}`);
    }
  }
);
