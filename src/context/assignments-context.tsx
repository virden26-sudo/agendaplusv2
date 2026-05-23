
"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Assignment } from '@/lib/types';
import type { ParsedAssignment } from '@/ai/schemas/assignment';
import { v4 as uuidv4 } from 'uuid';
import { differenceInDays } from 'date-fns';

interface AssignmentsContextType {
  assignments: Assignment[];
  addAssignment: (assignment: Omit<Assignment, 'id' | 'completed' | 'priority' | 'dueDate'> & {dueDate: string | Date}) => void;
  addMultipleAssignments: (newAssignments: ParsedAssignment[]) => void;
  toggleAssignment: (id: string) => void;
  loading: boolean;
}

const AssignmentsContext = createContext<AssignmentsContextType | undefined>(undefined);

const getPriority = (dueDate: Date): 'low' | 'medium' | 'high' => {
    const daysUntilDue = differenceInDays(dueDate, new Date());
    if (daysUntilDue < 3) return 'high';
    if (daysUntilDue < 7) return 'medium';
    return 'low';
};

export function AssignmentsProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const storedAssignments = localStorage.getItem('agendaAssignments');
        if (storedAssignments) {
          const parsed = JSON.parse(storedAssignments);
          if (Array.isArray(parsed)) {
            return parsed.map((a: any) => ({
              ...a,
              dueDate: new Date(a.dueDate),
            }));
          }
        }
      } catch (error) {
        console.error("Failed to parse assignments from localStorage", error);
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) {
        localStorage.setItem('agendaAssignments', JSON.stringify(assignments));
    }
  }, [assignments, loading]);

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

  const addMultipleAssignments = (newAssignments: ParsedAssignment[]) => {
    const assignmentsToAdd: Assignment[] = newAssignments.map(a => {
        const dueDate = new Date(a.dueDate || new Date());
        return {
            id: uuidv4(),
            title: a.task,
            course: a.course || 'Uncategorized',
            details: a.details || undefined,
            dueDate: dueDate,
            completed: false,
            priority: getPriority(dueDate),
        }
    });
    setAssignments(prev => [...prev, ...assignmentsToAdd]);
  };


  const toggleAssignment = (id: string) => {
    setAssignments(prev =>
      prev.map(a => (a.id === id ? { ...a, completed: !a.completed } : a))
    );
  };

  return (
    <AssignmentsContext.Provider value={{ assignments, addAssignment, addMultipleAssignments, toggleAssignment, loading }}>
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
