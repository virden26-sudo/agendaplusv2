
"use client";

import { useState } from "react";
import { 
  Check,
  Loader2, 
  BrainCircuit,
  Database,
  Calendar,
  Trash2,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAssignments } from "@/context/assignments-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

export default function PortalPage() {
  const { toast } = useToast();
  const { addMultipleAssignments } = useAssignments();

  const [portalText, setPortalText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any[] | null>(null);

  const handleExtract = async () => {
    if (!portalText.trim()) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch('/api/parse-portal/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalText: portalText }),
      });
      
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "GenesisAi failed to process data.");
      }

      setExtractedData(result.assignments || []);

      toast({
        title: "GenesisAi: Extraction Complete",
        description: `Identified ${result.assignments?.length || 0} potential assignments.`,
      });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Could not extract data from the provided text.";
      toast({
        variant: "destructive",
        title: "GenesisAi Error",
        description: message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmAndSync = () => {
    if (extractedData && extractedData.length > 0) {
      addMultipleAssignments(extractedData);
      toast({
        title: "GenesisAi: Data Synchronized",
        description: `Success! Imported ${extractedData.length} assignments to your agenda.`,
      });
      setPortalText("");
      setExtractedData(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-20">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-headline text-purple-600 flex items-center gap-2">
          <BrainCircuit className="size-8" />
          GenesisAi Portal Sync
        </h1>
        <p className="text-muted-foreground">
          Powered by GenesisAi-Standalone. High-precision local extraction for your academic portal.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {!extractedData ? (
            <Card className="border-purple-200 shadow-xl overflow-hidden">
              <CardHeader className="bg-purple-50 border-b">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-xl text-purple-800">Direct Data Ingestion</CardTitle>
                        <CardDescription>Paste your dashboard text to begin local analysis.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.open("https://navigate.nu.edu/d2l/home", "_blank")}>
                        <ExternalLink className="mr-2 size-3" />
                        Open Portal
                    </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <Textarea 
                    placeholder="Paste the 'Course Schedule' or 'Upcoming Assignments' text from your portal here..."
                    className="min-h-[400px] font-mono text-sm border-purple-100 focus-visible:ring-purple-500"
                    value={portalText}
                    onChange={(e) => setPortalText(e.target.value)}
                    disabled={isProcessing}
                />
                
                <Button
                    className="w-full h-14 text-lg font-bold bg-purple-600 hover:bg-purple-700 shadow-lg"
                    onClick={handleExtract}
                    disabled={!portalText.trim() || isProcessing}
                >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 animate-spin" />
                        GenesisAi Analyzing...
                      </>
                    ) : (
                      <>
                        <BrainCircuit className="mr-2" />
                        Run GenesisAi Extraction
                      </>
                    )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-200 shadow-xl flex flex-col h-[700px]">
                <CardHeader className="bg-green-50 border-b flex-row justify-between items-center space-y-0 p-6">
                    <div>
                        <CardTitle className="text-2xl font-headline flex items-center gap-2 text-green-800">
                            <Check className="size-6 text-green-600" />
                            Extracted Findings
                        </CardTitle>
                        <CardDescription>GenesisAi has mapped the following tasks from your data.</CardDescription>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => setExtractedData(null)}>
                            <Trash2 className="size-4 mr-2" />
                            Discard
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700 h-11 px-8 text-white font-bold" onClick={confirmAndSync}>
                            Confirm & Sync to Agenda
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                    <ScrollArea className="h-full p-8">
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-purple-700 flex items-center gap-2">
                                <Calendar className="size-5" />
                                Assignments ({extractedData.length})
                            </h3>
                            <div className="grid gap-3">
                                {extractedData.length === 0 ? (
                                    <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
                                        <p className="text-muted-foreground">No assignments identified. Please try copying a larger section of the portal.</p>
                                    </div>
                                ) : (
                                    extractedData.map((a, i) => (
                                        <div key={i} className="p-4 rounded-xl border bg-white shadow-sm flex justify-between items-center group hover:border-purple-300 transition-colors">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-slate-800">{a.task}</span>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[10px]">{a.course}</Badge>
                                                    <span className="text-xs text-muted-foreground">Due: {a.dueDate}</span>
                                                </div>
                                            </div>
                                            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none">Ready</Badge>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6">
            <Card className="border-purple-100 bg-purple-50/30">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-purple-800">
                        <Database className="size-4" />
                        Genesis Protocol
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        GenesisAi-Standalone operates entirely offline. Your data never leaves this device.
                    </p>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-purple-700 font-bold uppercase">
                            <Check className="size-3" />
                            Local LLM Inference
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-purple-700 font-bold uppercase">
                            <Check className="size-3" />
                            Zero Latency Parsing
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="p-6 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl text-white shadow-lg flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <BrainCircuit className="size-6" />
                    <span className="font-bold">GenesisAi Core</span>
                </div>
                <p className="text-xs opacity-90 leading-relaxed font-medium">
                    This module uses the GenesisAi-Standalone model to scan for tasks across your entire course cycle.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
