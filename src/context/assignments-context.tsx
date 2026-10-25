
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Assignment } from '@/lib/types';
import type { ParsedAssignment } from '@/ai/schemas/assignment';
import { v4 as uuidv4 } from 'uuid';
import { differenceInDays } from 'date-fns';
import { isJunkCourseName, isObviousJunkTitle, sanitizeCourseName } from '@/lib/assignment-quality';


interface AssignmentsContextType {
  assignments: Assignment[];
  addAssignment: (assignment: Omit<Assignment, 'id' | 'completed' | 'priority' | 'dueDate'> & {dueDate: string | Date}) => void;
  addMultipleAssignments: (newAssignments: ParsedAssignment[], options?: { replace?: boolean }) => void;
  toggleAssignment: (id: string) => void;
  updateAssignment: (id: string, updatedFields: Partial<Omit<Assignment, 'id'>>) => void;
  loading: boolean;
}

const AssignmentsContext = createContext<AssignmentsContextType | undefined>(undefined);

const getPriority = (dueDate: Date): 'low' | 'medium' | 'high' => {
    const daysUntilDue = differenceInDays(dueDate, new Date());
    if (daysUntilDue < 3) return 'high';
    if (daysUntilDue < 7) return 'medium';
    return 'low';
};

function loadStoredAssignments(): Assignment[] {
  if (typeof window === "undefined") return [];

  try {
    const storedAssignments = localStorage.getItem('agendaAssignments');
    if (!storedAssignments) return [];
    const parsed = JSON.parse(storedAssignments);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((a: Assignment) => !isObviousJunkTitle(a.title))
      .map((a: Assignment & { dueDate: string }) => ({
        ...a,
        course: sanitizeCourseName(a.course),
        dueDate: a.dueDate ? new Date(a.dueDate) : undefined,
      }))
      .filter((a: Assignment) => !isJunkCourseName(a.course) && !isObviousJunkTitle(a.course));
  } catch (error) {
    console.error("Failed to parse assignments from localStorage", error);
    return [];
  }
}

export function AssignmentsProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setAssignments(loadStoredAssignments());
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('agendaAssignments', JSON.stringify(assignments));
    }
  }, [assignments, isInitialized]);

  const addAssignment = (assignment: Omit<Assignment, 'id' | 'completed' | 'priority' | 'dueDate'> & {dueDate: string | Date}) => {
    const dueDate = new Date(assignment.dueDate);
    const newAssignment: Assignment = {
      id: uuidv4(),
      ...assignment,
      dueDate,
      completed: false,
      priority: getPriority(dueDate),
    };
    setAssignments(prev => [...prev, newAssignment]);
  };

  const buildAssignmentsFromParsed = (newAssignments: ParsedAssignment[]): Assignment[] => {
        const built: Assignment[] = [];

        for (const a of newAssignments) {
            const task = (a.task || "").trim();
            if (!task || /^untitled(\s+assignment|\s+quiz)?$/i.test(task)) {
                continue;
            }

            if (isObviousJunkTitle(task)) {
                continue;
            }

            const courseName = sanitizeCourseName(a.course || "Course");
            if (isJunkCourseName(courseName)) {
                continue;
            }

            const dueDate = a.dueDate ? new Date(a.dueDate + (a.dueDate.length === 10 ? 'T12:00:00' : '')) : undefined;
            if (dueDate && Number.isNaN(dueDate.getTime())) continue;
            built.push({
                id: uuidv4(),
                title: task,
                course: courseName,
                details: a.details || undefined,
                dueDate,
                completed: false,
                priority: dueDate ? getPriority(dueDate) : 'medium',
            });
        }

        return built;
  };

  const addMultipleAssignments = (newAssignments: ParsedAssignment[], options?: { replace?: boolean }) => {
    const parsed = buildAssignmentsFromParsed(newAssignments);

    setAssignments((prev) => {
        if (options?.replace) {
            return parsed;
        }

        if (parsed.length === 0) return prev;

        const existingMap = new Map(prev.map(a => [`${a.title.toLowerCase()}|${a.course.toLowerCase()}`,a]));
        for (const item of parsed) {
          const key = `${item.title.toLowerCase()}|${item.course.toLowerCase()}`;
          const previous = existingMap.get(key);
          existingMap.set(key, previous ? {...item, id:previous.id, completed:previous.completed, dueDate:item.dueDate || previous.dueDate, details:item.details || previous.details} : item);
        }
        return [...existingMap.values()];
    });
  };


  const toggleAssignment = (id: string) => {
    setAssignments(prev =>
      prev.map(a => (a.id === id ? { ...a, completed: !a.completed } : a))
    );
  };

  const updateAssignment = (id: string, updatedFields: Partial<Omit<Assignment, 'id'>>) => {
    setAssignments(prev =>
      prev.map(a => {
        if (a.id === id) {
          const merged = { ...a, ...updatedFields };
          if (updatedFields.dueDate) {
            merged.dueDate = new Date(updatedFields.dueDate);
            merged.priority = getPriority(merged.dueDate);
          }
          return merged;
        }
        return a;
      })
    );
  };

  return (
    <AssignmentsContext.Provider value={{ assignments, addAssignment, addMultipleAssignments, toggleAssignment, updateAssignment, loading: !isInitialized }}>
      {children}
    </AssignmentsContext.Provider>
  );
}

export function useAssignments() {
  const context = useContext(AssignmentsContext);
  if (context === undefined) {
    throw new Error('useAssignments must be used within an AssignmentsProvider');
  }
  return context;
}
