import { differenceInDays, formatDistanceToNowStrict } from 'date-fns';

export const getPriorityBadgeVariant = (priority: 'low' | 'medium' | 'high') => {
    switch(priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
}

export const getDueDateInfo = (dueDate: Date) => {
    const days = differenceInDays(dueDate, new Date());
    if (days < 0) return { text: "Overdue", className: "text-destructive font-semibold" };
    if (days < 1) return { text: "Due today", className: "text-accent-foreground font-semibold" };
    if (days < 2) return { text: "Due tomorrow", className: "text-foreground font-semibold" };
    return { text: `Due in ${formatDistanceToNowStrict(dueDate)}`, className: "text-muted-foreground" };
}

export const getAssignmentIcon = (title: string) => {
    const lowerCaseTitle = title.toLowerCase();
    // This can be expanded as needed
    if (lowerCaseTitle.includes("essay") || lowerCaseTitle.includes("report")) return "file-text";
    if (lowerCaseTitle.includes("prep") || lowerCaseTitle.includes("set") || lowerCaseTitle.includes("quiz")) return "clipboard-check";
    if (lowerCaseTitle.includes("presentation")) return "presentation";
    return "file-text";
};
