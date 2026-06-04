"use client";

import React, {createContext, ReactNode, useCallback, useContext, useEffect, useState} from 'react';
import type {Task} from '@/lib/types';

// Define the context type
interface TasksContextType {
    tasks: Task[];
    addTask: (task: Omit<Task, 'id' | 'completed' | 'priority'> & { priority?: 'low' | 'medium' | 'high' }) => void;
    toggleTask: (id: string) => void;
    loadData: (data: Task[]) => void;
    loading: boolean;
}

// Create the context
const TasksContext = createContext<TasksContextType | undefined>(undefined);

// Custom hook to use the tasks context
export const useTasks = () => {
    const context = useContext(TasksContext);
    if (!context) {
        throw new Error('useTasks must be used within a TasksProvider');
    }
    return context;
};

// Create the provider component
function loadStoredTasks(): Task[] {
    try {
        const storedTasks = localStorage.getItem("agendaTasks");
        if (!storedTasks) return [];
        const parsed = JSON.parse(storedTasks);
        if (!Array.isArray(parsed)) return [];
        return parsed.map((t: Task & { dueDate?: string }) => ({
            ...t,
            dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
        }));
    } catch (error) {
        console.error("Failed to load tasks from localStorage", error);
        return [];
    }
}

export const TasksProvider = ({children}: { children: ReactNode }) => {
    const [tasks, setTasks] = useState<Task[]>(() =>
        typeof window === "undefined" ? [] : loadStoredTasks()
    );
    const [isInitialized] = useState(() => typeof window !== "undefined");
    const [loading, _setLoading] = useState(false);

    // Save tasks to localStorage whenever they change
    useEffect(() => {
        if (isInitialized) {
            try {
                localStorage.setItem('agendaTasks', JSON.stringify(tasks));
            } catch (error) {
                console.error("Failed to save tasks to local storage", error);
            }
        }
    }, [tasks, isInitialized]);

    const addTask = useCallback((task: Omit<Task, 'id' | 'completed' | 'priority'> & { priority?: 'low' | 'medium' | 'high' }) => {
        const newTask: Task = {
            ...task,
            id: Date.now().toString(),
            completed: false,
            priority: task.priority || 'medium',
        };
        setTasks(prev => [...prev, newTask]);
    }, []);

    const toggleTask = useCallback((id: string) => {
        setTasks(prev =>
            prev.map(t => (t.id === id ? {...t, completed: !t.completed} : t))
        );
    }, []);

    const loadData = (data: Task[]) => {
        setTasks(data);
    }

    const value = {
        tasks,
        addTask,
        toggleTask,
        loadData,
        loading,
    };

    return (
        <TasksContext.Provider value={value}>
            {children}
        </TasksContext.Provider>
    );
};
