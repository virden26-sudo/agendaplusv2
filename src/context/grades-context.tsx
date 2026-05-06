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

export function GradesProvider({ children }: { children: ReactNode }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedGrades = localStorage.getItem('agendaGrades');
      if (storedGrades) {
        const parsed = JSON.parse(storedGrades);
        if (Array.isArray(parsed)) {
            setCourses(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to parse grades from localStorage", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
        localStorage.setItem('agendaGrades', JSON.stringify(courses));
    }
  }, [courses, loading]);

  const handleSetCourses = (newCourses: Course[]) => {
    setCourses(newCourses);
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
