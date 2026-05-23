"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Badge} from "@/components/ui/badge";
import {useQuizzes} from "@/context/quizzes-context";
import {format, isToday} from 'date-fns';
import {Skeleton} from "@/components/ui/skeleton";
import {GradientIcon} from "@/components/ui/gradient-icon";
import {NaturalLanguageAdd} from "@/components/assignments/natural-language-add";

export default function QuizzesPage() {
    const {quizzes, loading, addQuiz} = useQuizzes();

    const upcomingQuizzes = quizzes.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    const isOverdue = (date: Date) => new Date(date) < new Date() && !isToday(date);

    return (
        <div className="space-y-6">
            <NaturalLanguageAdd 
                onAdd={(result) => addQuiz({
                    title: result.task,
                    course: result.course || 'General',
                    dueDate: new Date(result.dueDate || new Date()),
                })}
                placeholder="e.g., 'Final Exam for MATH101 on May 20th'"
                label="Add Quiz with AI"
            />
            <Card>
                <CardHeader>
                    <CardTitle className="text-gradient flex items-center gap-2">
                        <GradientIcon name="FileQuestion"/>
                        Manage Quizzes & Exams
                    </CardTitle>
                    <CardDescription>
                        Here's a list of all your upcoming quizzes, tests, and exams.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Course</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({length: 5}).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={4}>
                                            <Skeleton className="h-8 w-full"/>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : upcomingQuizzes.length > 0 ? (
                                upcomingQuizzes.map(quiz => (
                                    <TableRow key={quiz.id}>
                                        <TableCell className="font-medium">{quiz.title}</TableCell>
                                        <TableCell>{quiz.course}</TableCell>
                                        <TableCell>{format(new Date(quiz.dueDate), 'PPP')}</TableCell>
                                        <TableCell className="text-right">
                                            {isOverdue(quiz.dueDate) ? (
                                                <Badge variant="destructive">Overdue</Badge>
                                            ) : isToday(quiz.dueDate) ? (
                                                <Badge variant="default">Due Today</Badge>
                                            ) : (
                                                <Badge variant="outline">Upcoming</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No quizzes found. Sync your syllabus to add some.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

    