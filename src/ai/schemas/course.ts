import { z } from 'zod';

export const CourseSchema = z.object({
  name: z.string().describe('The name of the course.'),
  grade: z.number().describe('The numerical grade for the course.'),
});

export type Course = z.infer<typeof CourseSchema>;
