"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Course } from '@/ai/schemas/course';
import { v4 as uuidv4 } from 'uuid';

interface GradesContextType {
  courses: Course[];
  setCourses: (courses: Course[]) => void;
  loading: boolean;
}

const GradesContext = createContext<GradesContextType | undefined>(undefined);

function loadStoredCourses(): Course[] {
  try {
    const storedGrades = localStorage.getItem('agendaGrades');
    if (!storedGrades) return [];
    const parsed = JSON.parse(storedGrades);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c: Course & { id?: string }) => ({
      ...c,
      id: c.id || uuidv4(),
    }));
  } catch (error) {
    console.error("Failed to parse grades from localStorage", error);
    return [];
  }
}

export function GradesProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>(() =>
    typeof window === "undefined" ? [] : loadStoredCourses()
  );
  const [loading] = useState(false);
  const [isInitialized] = useState(() => typeof window !== "undefined");

  useEffect(() => {
    if (isInitialized) {
        localStorage.setItem('agendaGrades', JSON.stringify(courses));
    }
  }, [courses, isInitialized]);

  const handleSetCourses = (newCourses: Course[]) => {
    const coursesWithIds = newCourses.map(c => ({
        ...c,
        id: c.id || uuidv4(),
    }));
    setCourses(coursesWithIds);
  };

  return (
    <GradesContext.Provider value={{ courses, setCourses: handleSetCourses, loading }}>
      {children}
    </GradesContext.Provider>
  );
}

export function useGrades() {
  const context = useContext(GradesContext);
  if (context === undefined) {
    throw new Error('useGrades must be used within a GradesProvider');
  }
  return context;
}
