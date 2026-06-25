"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { parseAssignmentText } from "@/lib/local-api";
import { type Assignment as ParsedAssignment } from '@/ai/schemas/assignment';
import { Bot, Loader2, Sparkles } from "lucide-react";
import { useAssignments } from "@/context/assignments-context";

const formSchema = z.object({
  naturalInput: z.string().min(1, "Please describe your assignment."),
});

type AddAssignmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddAssignmentDialog({ open, onOpenChange }: AddAssignmentDialogProps) {
  const { toast } = useToast();
  const { addAssignment } = useAssignments();
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedAssignment | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { naturalInput: "" },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsParsing(true);
    setParsedData(null);
    try {
      const parsed = await parseAssignmentText(values.naturalInput);
      setParsedData(parsed);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Could not parse",
        description: "Try describing the assignment with a due date, e.g. \"Bio essay due Friday\".",
      });
    } finally {
      setIsParsing(false);
    }
  }
  
  const handleSave = () => {
    if (!parsedData) return;
    
    if (!parsedData.dueDate) {
      toast({
        variant: "destructive",
        title: "Due date required",
        description: "BUDD-IE couldn't figure out the exact due date. Please select one before saving.",
      });
      return;
    }
    
    addAssignment({
        title: parsedData.task,
        course: parsedData.course || 'Uncategorized',
        dueDate: parsedData.dueDate,
        details: parsedData.details || undefined,
    });

    toast({
        title: "Assignment Added!",
        description: `"${parsedData?.task}" has been added to your schedule.`,
    });
    handleClose(false);
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      setParsedData(null);
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => {
        if(isParsing) e.preventDefault();
      }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" />
            Add Assignment with AI
          </DialogTitle>
          <DialogDescription>
            Just type out your assignment details and let AI handle the rest.
          </DialogDescription>
        </DialogHeader>
        {!parsedData ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="naturalInput"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignment Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., 'Essay on the Roman Empire due next Friday'"
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isParsing}>
                  {isParsing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Bot className="mr-2 h-4 w-4" />
                  )}
                  Parse with AI
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
                <Label htmlFor="task">Task</Label>
                <Input id="task" value={parsedData.task} onChange={(e) => setParsedData({...parsedData, task: e.target.value})} placeholder="Task" />
            </div>
             <div className="space-y-2">
                <Label htmlFor="course">Course</Label>
                <Input id="course" value={parsedData.course || ""} onChange={(e) => setParsedData({...parsedData, course: e.target.value})} placeholder="Course" />
            </div>
             <div className="space-y-2">
                <Label htmlFor="dueDate" className={!parsedData.dueDate ? "text-destructive font-semibold" : ""}>
                    Due Date {!parsedData.dueDate && " * (Required)"}
                </Label>
                <Input 
                    id="dueDate" 
                    type="date" 
                    value={parsedData.dueDate || ""} 
                    onChange={(e) => setParsedData({...parsedData, dueDate: e.target.value})} 
                    className={!parsedData.dueDate ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {!parsedData.dueDate && (
                  <p className="text-xs text-destructive">
                    ⚠️ BUDD-IE could not determine the exact due date. Please enter a valid date.
                  </p>
                )}
            </div>
             <div className="space-y-2">
                <Label htmlFor="details">Details</Label>
                <Textarea id="details" value={parsedData.details || ""} onChange={(e) => setParsedData({...parsedData, details: e.target.value})} placeholder="Details" />
            </div>
             <DialogFooter>
                <Button variant="ghost" onClick={() => { setParsedData(null); setIsParsing(false); }}>Back</Button>
                <Button onClick={handleSave}>Save Assignment</Button>
              </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
