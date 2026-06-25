"use client";

import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Card, CardContent} from "@/components/ui/card";
import {BrainCircuit, Loader2, Sparkles, AlertCircle} from "lucide-react";
import {useToast} from "@/hooks/use-toast";
import { parseAssignmentText } from "@/lib/local-api";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter} from "@/components/ui/dialog";
import {Label} from "@/components/ui/label";

interface NaturalLanguageAddProps {
    onAdd: (result: any) => void;
    placeholder?: string;
    label?: string;
}

export function NaturalLanguageAdd({ 
    onAdd, 
    placeholder = "e.g., 'Finish History essay due next Friday for HIS101'",
    label = "Add with AI"
}: NaturalLanguageAddProps) {
    const [text, setText] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const {toast} = useToast();

    // Clarification state when due date is missing
    const [pendingAssignment, setPendingAssignment] = useState<any | null>(null);
    const [clarifyDate, setClarifyDate] = useState("");
    const [clarifyTitle, setClarifyTitle] = useState("");
    const [clarifyCourse, setClarifyCourse] = useState("");

    const handleAdd = async () => {
        if (!text.trim()) return;

        setIsProcessing(true);
        try {
            const result = await parseAssignmentText(text);
            if (!result.dueDate) {
                setPendingAssignment(result);
                setClarifyDate("");
                setClarifyTitle(result.task || "");
                setClarifyCourse(result.course || "");
                setIsProcessing(false);
                return;
            }
            onAdd(result);

            toast({
                title: "Added Successfully",
                description: `Budd-ie identified: ${result.task}`,
            });
            setText("");
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Parsing Error",
                description: "Could not understand that. Try being more specific.",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClarifySave = () => {
        if (!clarifyDate) {
            toast({
                variant: "destructive",
                title: "Date Required",
                description: "Please choose a due date.",
            });
            return;
        }
        onAdd({
            ...pendingAssignment,
            task: clarifyTitle.trim() || "Untitled Task",
            course: clarifyCourse.trim() || "General",
            dueDate: clarifyDate
        });
        toast({
            title: "Added Successfully",
            description: `Budd-ie identified: ${clarifyTitle}`,
        });
        setPendingAssignment(null);
        setText("");
    };

    return (
        <Card className="border-primary/20 shadow-sm bg-primary/5">
            <CardContent className="pt-6">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Input
                            placeholder={placeholder}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            disabled={isProcessing}
                            className="pr-10 border-primary/20 focus-visible:ring-primary"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary/40">
                            <BrainCircuit className="h-4 w-4"/>
                        </div>
                    </div>
                    <Button 
                        onClick={handleAdd} 
                        disabled={!text.trim() || isProcessing}
                        className="bg-primary hover:bg-primary/90 shadow-md"
                    >
                        {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin"/>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4 mr-2"/>
                                {label}
                            </>
                        )}
                    </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary"/>
                    Budd-ie AI will automatically identify the title, due date, and course.
                </p>
            </CardContent>

            <Dialog open={pendingAssignment !== null} onOpenChange={(open) => { if (!open) setPendingAssignment(null); }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="text-destructive animate-pulse" />
                            Clarify Due Date
                        </DialogTitle>
                        <DialogDescription>
                            BUDD-IE couldn&apos;t determine the exact due date. Please enter details and select a due date to proceed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="clarify-title">Task Title</Label>
                            <Input 
                                id="clarify-title" 
                                value={clarifyTitle} 
                                onChange={(e) => setClarifyTitle(e.target.value)} 
                                placeholder="Task Title"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="clarify-course">Course</Label>
                            <Input 
                                id="clarify-course" 
                                value={clarifyCourse} 
                                onChange={(e) => setClarifyCourse(e.target.value)} 
                                placeholder="Course"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="clarify-date" className="text-destructive font-semibold">
                                Due Date *
                            </Label>
                            <Input 
                                id="clarify-date" 
                                type="date" 
                                value={clarifyDate} 
                                onChange={(e) => setClarifyDate(e.target.value)} 
                                className="border-destructive focus-visible:ring-destructive"
                            />
                        </div>
                    </div>
                    <DialogFooter className="pt-4">
                        <Button variant="ghost" onClick={() => setPendingAssignment(null)}>Cancel</Button>
                        <Button onClick={handleClarifySave} disabled={!clarifyDate}>Add Assignment</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
