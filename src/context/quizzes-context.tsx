"use client";

import React, {createContext, ReactNode, useCallback, useContext, useEffect, useState} from 'react';

// Define the shape of a quiz
export interface Quiz {
    id: string;
    title: string;
    course: string;
    dueDate: Date;
    questionCount?: number;
}

// Define the context type
interface QuizzesContextType {
    quizzes: Quiz[];
    addQuiz: (quiz: Omit<Quiz, 'id'>) => void;
    loadData: (data: Quiz[]) => void;
    loading: boolean;
}

// Create the context
const QuizzesContext = createContext<QuizzesContextType | undefined>(undefined);

// Custom hook to use the quizzes context
export const useQuizzes = () => {
    const context = useContext(QuizzesContext);
    if (!context) {
        throw new Error('useQuizzes must be used within a QuizzesProvider');
    }
    return context;
};

// Create the provider component
function loadStoredQuizzes(): Quiz[] {
    if (typeof window === "undefined") return [];

    try {
        const storedQuizzes = localStorage.getItem("agendaQuizzes");
        if (!storedQuizzes) return [];
        const parsed = JSON.parse(storedQuizzes);
        if (!Array.isArray(parsed)) return [];
        return parsed.map((q: Quiz & { dueDate: string }) => ({
            ...q,
            dueDate: new Date(q.dueDate),
        }));
    } catch (error) {
        console.error("Failed to load quizzes from localStorage", error);
        return [];
    }
}

export const QuizzesProvider = ({children}: { children: ReactNode }) => {
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        setQuizzes(loadStoredQuizzes());
        setIsInitialized(true);
    }, []);

    // Save quizzes to localStorage whenever they change
    useEffect(() => {
        if (isInitialized) {
            try {
                localStorage.setItem('agendaQuizzes', JSON.stringify(quizzes));
            } catch (error) {
                console.error("Failed to save quizzes to local storage", error);
            }
        }
    }, [quizzes, isInitialized]);

    const addQuiz = useCallback((quiz: Omit<Quiz, 'id'>) => {
        const newQuiz: Quiz = {
            ...quiz,
            id: Date.now().toString(),
        };
        setQuizzes(prev => [...prev, newQuiz]);
    }, []);

    const loadData = (data: Quiz[]) => {
        const parsedData = data.map(q => ({...q, dueDate: new Date(q.dueDate)}));
        setQuizzes(parsedData);
    };

    return (
        <QuizzesContext.Provider value={{ quizzes, addQuiz, loadData, loading: !isInitialized }}>
            {children}
        </QuizzesContext.Provider>
    );
};
