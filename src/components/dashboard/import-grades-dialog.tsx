"use client";

import {useState} from "react";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {useToast} from "@/hooks/use-toast";
import {ExternalLink, Loader2, Sparkles} from "lucide-react";
import {useGrades} from "@/context/grades-context";
import {getApiUrl} from "@/lib/api-config";
import type {Course} from "@/ai/schemas/course";

type ImportGradesDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function ImportGradesDialog({open, onOpenChange}: ImportGradesDialogProps) {
    const {toast} = useToast();
    const {setCourses} = useGrades();
    const [isParsing, setIsParsing] = useState(false);
    const [pastedText, setPastedText] = useState("");

    const handleGradesParsed = (courses: Course[]) => {
        if (courses && courses.length > 0) {
            setCourses(courses);
            toast({
                title: "Grades Imported!",
                description: `${courses.length} courses have been updated with your latest grades.`,
            });
        } else {
            toast({
                variant: "default",
                title: "No grades found",
                description: "The AI couldn't find any grades. You can try pasting the text again.",
            });
        }
        handleClose(false);
    }

    const handleTextParse = async () => {
        if (!pastedText.trim()) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Please paste your grades text.",
            });
            return;
        }
        setIsParsing(true);
        try {
            const response = await fetch(getApiUrl('/api/parse-grades'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({gradesText: pastedText}),
            });

            if (!response.ok) throw new Error("Failed to parse grades");

            const result = await response.json();
            handleGradesParsed(result.courses);
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not parse grades. Please try again.",
            });
        } finally {
            setIsParsing(false);
        }
    };

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) {
            setIsParsing(false);
            setPastedText("");
        }
        onOpenChange(isOpen);
    }

    const handlePortalClick = () => {
        window.open("https://navigate.nu.edu/d2l/lms/grades/my_grades/main.d2l?ou=23776", "_blank");
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => {
                if (isParsing) e.preventDefault();
            }}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary"/>
                        Import Grades with AI
                    </DialogTitle>
                    <DialogDescription>
                        Copy and paste the content from your university&apos;s grade portal to sync your grades.
                    </DialogDescription>
                </DialogHeader>

                {isParsing ? (
                    <div className="flex flex-col items-center justify-center h-60">
                        <Loader2 className="mr-2 h-8 w-8 animate-spin"/>
                        <p className="mt-2 text-muted-foreground">AI is parsing your grades...</p>
                    </div>
                ) : (
                    <div className="pt-4 space-y-2">
                        <div className="flex justify-end">
                            <Button variant="link" className="h-auto p-0 text-xs" onClick={handlePortalClick}>
                                <ExternalLink className="mr-1 size-3"/>
                                Go to Grades Portal
                            </Button>
                        </div>
                        <Textarea
                            placeholder="Paste your grades content here..."
                            className="h-48 resize-none"
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                        />
                        <Button className="w-full" onClick={handleTextParse} disabled={isParsing}>
                            {isParsing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                            ) : (
                                <Sparkles className="mr-2"/>
                            )}
                            Parse Grades
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
