export type Assignment = {
    id: string;
    title: string;
    course: string;
    dueDate: Date;
    completed: boolean;
    priority: 'low' | 'medium' | 'high';
    details?: string;
};

export type Course = {
    id: string;
    name: string;
    grade: number;
};

export type ScheduleEvent = {
    id: string;
    title: string;
    startTime: Date;
    endTime: Date;
    type: 'class' | 'work' | 'study' | 'personal';
};

export type Discussion = {
    id: string;
    title: string;
    course: string;
    dueDate?: Date;
    postedDate: Date;
    content?: string;
    author?: string;
};

export type Announcement = {
    id: string;
    title: string;
    course: string;
    date: Date;
    content: string;
    important: boolean;
};

export type User = {
    name: string;
    avatarUrl: string;
    portalUsername?: string;
    portalPassword?: string;
};

export type ParsedAssignment = {
    task: string;
    dueDate?: string | null;
    course?: string | null;
    details?: string | null;
};
