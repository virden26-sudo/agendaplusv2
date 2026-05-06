"use client";

import {useRef, useState} from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {useToast} from "@/hooks/use-toast";
import {
    AlertCircle,
    ArrowLeft,
    Calendar as CalendarIcon,
    Check,
    ExternalLink,
    FileText,
    Loader2,
    Sparkles,
    Trash2,
    Upload
} from "lucide-react";
import {useAssignments} from "@/context/assignments-context";
import type {ParsedAssignment} from "@/lib/types";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from "@/components/ui/table";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {ScrollArea} from "@/components/ui/scroll-area";

type ImportSyllabusDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

type Step = 'input' | 'parsing' | 'review';

export function ImportSyllabusDialog({open, onOpenChange}: ImportSyllabusDialogProps) {
    const {toast} = useToast();
    const {addMultipleAssignments} = useAssignments();

    const [step, setStep] = useState<Step>('input');
    const [isParsing, setIsParsing] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [pastedText, setPastedText] = useState("");
    const [reviewData, setReviewData] = useState<ParsedAssignment[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAssignmentsParsed = (assignments: ParsedAssignment[]) => {
        if (assignments && assignments.length > 0) {
            setReviewData(assignments);
            setStep('review');
        } else {
            toast({
                variant: "default",
                title: "No assignments found",
                description: "GenesisAi couldn't find any assignments. You can try another file or paste the text directly.",
            });
            setStep('input');
        }
        setIsParsing(false);
    }

    const fileToDataUri = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    async function handleFileParse(file: File) {
        setIsParsing(true);
        setStep('parsing');
        setFileName(file.name);
        try {
            const dataUri = await fileToDataUri(file);
            const response = await fetch('/api/parse-syllabus', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    syllabusFile: dataUri,
                    currentDate: new Date().toISOString().split('T')[0]
                }),
            });

            if (!response.ok) throw new Error(`Failed to parse syllabus: ${response.status}`);

            const result = await response.json();
            handleAssignmentsParsed(result.assignments);
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not parse syllabus file. Please try again.",
            });
            setStep('input');
            setIsParsing(false);
        }
    }

    const handleTextParse = async () => {
        if (!pastedText.trim()) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Please paste your syllabus text.",
            });
            return;
        }
        setIsParsing(true);
        setStep('parsing');
        setFileName("pasted text");
        try {
            const response = await fetch('/api/parse-syllabus-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    syllabusText: pastedText,
                    currentDate: new Date().toISOString().split('T')[0]
                }),
            });

            if (!response.ok) throw new Error(`Failed to parse syllabus text: ${response.status}`);

            const result = await response.json();
            handleAssignmentsParsed(result.assignments);
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not parse syllabus text. Please try again.",
            });
            setStep('input');
            setIsParsing(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleFileParse(file);
        }
    };

    const handleUpdateReviewItem = (index: number, field: keyof ParsedAssignment, value: string) => {
        const newData = [...reviewData];
        newData[index] = {...newData[index], [field]: value};
        setReviewData(newData);
    };

    const handleRemoveReviewItem = (index: number) => {
        setReviewData(reviewData.filter((_, i) => i !== index));
    };

    const handleConfirmImport = () => {
        if (reviewData.length > 0) {
            addMultipleAssignments(reviewData);
            toast({
                title: "Success!",
                description: `${reviewData.length} assignments have been added to your schedule.`,
            });
            handleClose(false);
        }
    };

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) {
            setStep('input');
            setIsParsing(false);
            setFileName(null);
            setPastedText("");
            setReviewData([]);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
        onOpenChange(isOpen);
    }

    const handlePortalClick = () => {
        window.open("https://navigate.nu.edu/d2l/home", "_blank");
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className={step === 'review' ? "sm:max-w-4xl" : "sm:max-w-lg"} onInteractOutside={(e) => {
                if (isParsing) e.preventDefault();
            }}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-headline">
                        <Sparkles className="text-primary"/>
                        {step === 'review' ? 'Review Extracted Assignments' : 'Hybrid Syllabus Import'}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'review'
                            ? "Verify and edit the assignments GenesisAi found before adding them to your schedule."
                            : "Upload a syllabus file or paste text. GenesisAi will extract the tasks for your review."}
                    </DialogDescription>
                </DialogHeader>

                {step === 'parsing' ? (
                    <div className="flex flex-col items-center justify-center h-80 space-y-4">
                        <div className="relative">
                            <Loader2 className="h-16 w-16 animate-spin text-primary opacity-20"/>
                            <Sparkles
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary animate-pulse"/>
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-lg">GenesisAi is analyzing &quot;{fileName}&quot;</p>
                            <p className="text-sm text-muted-foreground">Mapping your semester mission... almost
                                there!</p>
                        </div>
                    </div>
                ) : step === 'input' ? (
                    <Tabs defaultValue="paste" className="pt-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="paste">
                                <FileText className="mr-2 h-4 w-4"/> Paste Text
                            </TabsTrigger>
                            <TabsTrigger value="upload">
                                <Upload className="mr-2 h-4 w-4"/> Upload File
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="paste" className="mt-4 space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium">Syllabus Text</label>
                                    <Button variant="link" className="h-auto p-0 text-xs text-primary"
                                            onClick={handlePortalClick}>
                                        <ExternalLink className="mr-1 size-3"/>
                                        Browse Portal for Syllabus
                                    </Button>
                                </div>
                                <Textarea
                                    placeholder="Paste the 'Course Schedule' or 'Assignments' section from your syllabus here..."
                                    className="h-60 resize-none border-primary/20 focus-visible:ring-primary"
                                    value={pastedText}
                                    onChange={(e) => setPastedText(e.target.value)}
                                />
                                <Button className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                                        onClick={handleTextParse} disabled={!pastedText.trim()}>
                                    <Sparkles className="mr-2 h-4 w-4"/> Extract Assignments
                                </Button>
                            </div>
                        </TabsContent>
                        <TabsContent value="upload" className="mt-4">
                            <div
                                className="flex flex-col items-center justify-center w-full h-60 border-2 border-dashed border-primary/20 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors group"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <div
                                        className="p-4 rounded-full bg-primary/10 mb-4 group-hover:scale-110 transition-transform">
                                        <Upload className="w-8 h-8 text-primary"/>
                                    </div>
                                    <p className="mb-2 text-sm">
                                        <span className="font-semibold text-primary">Click to upload syllabus</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">PDF, DOCX, or TXT (Max 10MB)</p>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    id="file-upload"
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileChange}
                                    accept=".pdf,.doc,.docx,.txt"
                                />
                            </div>
                        </TabsContent>
                    </Tabs>
                ) : (
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between px-1">
                            <Badge variant="secondary" className="px-3 py-1">
                                {reviewData.length} Tasks Found
                            </Badge>
                            <p className="text-xs text-muted-foreground flex items-center">
                                <AlertCircle className="mr-1 h-3 w-3"/>
                                Tip: Double-check dates before confirming
                            </p>
                        </div>

                        <ScrollArea className="h-[400px] rounded-md border border-primary/10">
                            <Table>
                                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead className="w-[300px]">Task Name</TableHead>
                                        <TableHead className="w-[150px]">Due Date</TableHead>
                                        <TableHead>Course</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {reviewData.length > 0 ? reviewData.map((item, index) => (
                                        <TableRow key={index} className="hover:bg-primary/5 transition-colors">
                                            <TableCell className="p-2">
                                                <Input
                                                    value={item.task}
                                                    onChange={(e) => handleUpdateReviewItem(index, 'task', e.target.value)}
                                                    className="h-8 border-transparent focus:border-primary/30 bg-transparent"
                                                />
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <div className="relative">
                                                    <Input
                                                        type="date"
                                                        value={item.dueDate || ""}
                                                        onChange={(e) => handleUpdateReviewItem(index, 'dueDate', e.target.value)}
                                                        className="h-8 pl-8 border-transparent focus:border-primary/30 bg-transparent"
                                                    />
                                                    <CalendarIcon
                                                        className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none"/>
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <Input
                                                    value={item.course || ''}
                                                    onChange={(e) => handleUpdateReviewItem(index, 'course', e.target.value)}
                                                    placeholder="Add course..."
                                                    className="h-8 border-transparent focus:border-primary/30 bg-transparent"
                                                />
                                            </TableCell>
                                            <TableCell className="p-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleRemoveReviewItem(index)}
                                                >
                                                    <Trash2 className="h-4 w-4"/>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                No tasks to review. Try re-parsing or adding manually.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>

                        <DialogFooter className="flex sm:justify-between items-center gap-2">
                            <Button variant="ghost" onClick={() => setStep('input')}>
                                <ArrowLeft className="mr-2 h-4 w-4"/> Start Over
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
                                <Button
                                    onClick={handleConfirmImport}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                    disabled={reviewData.length === 0}
                                >
                                    <Check className="mr-2 h-4 w-4"/> Confirm & Add All
                                </Button>
                            </div>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
