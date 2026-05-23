"use client";

import {useState} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Card, CardContent} from "@/components/ui/card";
import {BrainCircuit, Loader2, Sparkles} from "lucide-react";
import {useToast} from "@/hooks/use-toast";

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

    const handleAdd = async () => {
        if (!text.trim()) return;

        setIsProcessing(true);
        try {
            const response = await fetch('/api/parse-assignment', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    assignmentText: text,
                    currentDate: new Date().toLocaleDateString()
                }),
            });

            if (!response.ok) throw new Error("Failed to parse input");

            const result = await response.json();
            
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
        </Card>
    );
}
