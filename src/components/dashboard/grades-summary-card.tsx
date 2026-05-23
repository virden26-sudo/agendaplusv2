"use client";

import {Card, CardContent, CardDescription, CardHeader, CardTitle,} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {ScrollArea} from "../ui/scroll-area";
import {useGrades} from "@/context/grades-context";
import {Skeleton} from "../ui/skeleton";
import {GradientIcon} from "@/components/ui/gradient-icon";
import Link from "next/link";
import {CircularProgress} from "@/components/ui/circular-progress";
import {calculateGPA} from "@/lib/data-utils";

export function GradesSummaryCard() {
    const {courses, loading} = useGrades();

    const coursesWithGrades = courses.filter(c => c.grade > 0);
    const gpa = calculateGPA(coursesWithGrades);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-gradient">
                            <GradientIcon name="GraduationCap" className="h-6 w-6"/>
                            Grades Overview
                        </CardTitle>
                        <CardDescription>Overall GPA: <span className="font-bold text-primary">{gpa.toFixed(2)}</span></CardDescription>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                        <Link href="/grades">
                            View Details
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <ScrollArea className="h-72">
                    <div className="pr-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {loading ? (
                            <>
                                <Skeleton className="h-24 w-full"/>
                                <Skeleton className="h-24 w-full"/>
                                <Skeleton className="h-24 w-full"/>
                            </>
                        ) : coursesWithGrades.length > 0 ? (
                            coursesWithGrades.map((course) => (
                                <div key={course.id} className="flex flex-col items-center gap-2 text-center">
                                    <div className="w-20 h-20">
                                        <CircularProgress progress={course.grade}/>
                                    </div>
                                    <p className="font-semibold text-sm leading-tight">{course.name}</p>
                                </div>
                            ))
                        ) : (
                            <div
                                className="col-span-full flex flex-col items-center justify-center h-full text-center p-8">
                                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                                    <GradientIcon name="GraduationCap" className="h-8 w-8 text-muted-foreground"/>
                                </div>
                                <h3 className="font-semibold text-lg mb-1">No Grades Yet</h3>
                                <p className="text-muted-foreground text-sm mb-4">Sync a graded item to see your
                                    progress.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
