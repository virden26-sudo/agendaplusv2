import { z } from 'zod';

export const AssignmentSchema = z.object({
  task: z.string().describe('The title or name of the task.'),
  dueDate: z
    .string()
    .optional()
    .nullable()
    .describe('The due date of the assignment in ISO format (YYYY-MM-DD).'),
  course: z.string().optional().nullable().describe('The course the assignment is for.'),
  details: z
    .string()
    .optional()
    .nullable()
    .describe('Any additional details about the assignment.'),
  priority: z
    .enum(['low', 'medium', 'high'])
    .optional()
    .describe('The priority of the assignment.'),
});

export type Assignment = z.infer<typeof AssignmentSchema>;
export type ParsedAssignment = Assignment;
