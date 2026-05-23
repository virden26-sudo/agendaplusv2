"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { useGrades } from "@/context/grades-context";
import { Button } from "../ui/button";
import { useState } from "react";
import { ImportGradesDialog } from "./import-grades-dialog";
import { CircleOff } from "lucide-react";

const chartConfig = {
  grade: {
    label: "Grade",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export function GradeOverview() {
  const { courses, loading } = useGrades();
  const [importGradesOpen, setImportGradesOpen] = useState(false);

  const chartData = courses.map((course) => ({
    course: course.name,
    grade: course.grade,
  }));

  const gpa = courses.length > 0 ? (
    courses.reduce((acc, course) => acc + course.grade, 0) /
    (courses.length * 25)
  ).toFixed(2) : "0.00";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-gradient">Grade Overview</CardTitle>
          <CardDescription>
            {loading ? 'Loading grades...' : `Your current estimated GPA is ${gpa}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[250px]">
          {!loading && courses.length > 0 ? (
             <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart accessibilityLayer data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="course"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.substring(0, 3)}
                  />
                  <YAxis domain={[50, 100]} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Bar dataKey="grade" fill="var(--color-grade)" radius={5} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
             <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
                <CircleOff className="size-10 mb-4" />
                <p className="font-semibold">No grades found</p>
                <p className="text-sm">Sync your grades to get started.</p>
            </div>
          )}
        </CardContent>
        <CardFooter>
            <Button className="w-full" variant="secondary" onClick={() => setImportGradesOpen(true)}>Sync Grades</Button>
        </CardFooter>
      </Card>
      <ImportGradesDialog open={importGradesOpen} onOpenChange={setImportGradesOpen} />
    </>
  );
}
