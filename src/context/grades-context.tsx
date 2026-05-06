"use client";

import React, {createContext, ReactNode, useContext, useEffect, useState} from 'react';
import type {Course} from '@/ai/schemas/course';

interface GradesContextType {
    courses: Course[];
    setCourses: (courses: Course[]) => void;
    loading: boolean;
}

const GradesContext = createContext<GradesContextType | undefined>(undefined);

export function GradesProvider({children}: { children: ReactNode }) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            try {
                const storedGrades = localStorage.getItem('agendaGrades');
                if (!storedGrades) {
                    setCourses([]);
                    return;
                }

                const parsed = JSON.parse(storedGrades) as Course[];
                setCourses(Array.isArray(parsed) ? parsed : []);
            } catch (error) {
                console.error("Failed to parse grades from localStorage", error);
                setCourses([]);
            } finally {
                setLoading(false);
            }
        }, 0);

        return () => window.clearTimeout(timeoutId);
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
        <GradesContext.Provider value={{courses, setCourses: handleSetCourses, loading}}>
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
