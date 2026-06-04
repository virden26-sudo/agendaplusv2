
"use client";

import { useState } from "react";
import { 
  Check,
  Loader2, 
  BrainCircuit,
  Database,
  Calendar,
  Trash2,
  ExternalLink,
  Smartphone,
  ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { parsePortalDataOnDevice } from "@/lib/portal-sync-client";
import { countPortalItems } from "@/lib/portal-text-parser";
import { useAssignments } from "@/context/assignments-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IosSafariBrowser } from "@/components/portal/ios-safari-browser";
import { useUser } from "@/context/user-context";

export default function PortalPage() {
  const { toast } = useToast();
  const { addMultipleAssignments } = useAssignments();
  const { portalUrl } = useUser();

  const [portalText, setPortalText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any[] | null>(null);

  const handleExtract = async () => {
    if (!portalText.trim()) return;
    
    setIsProcessing(true);
    try {
      const result = parsePortalDataOnDevice(portalText);
      setExtractedData(result.assignments || []);

      toast({
        title: "Extraction complete",
        description: `Found ${countPortalItems(result)} items on this device.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Could not read that text",
        description: "Copy your assignments list from the portal and try again.",
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

      <Tabs defaultValue="browser" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 bg-purple-100/50 p-1 h-12">
            <TabsTrigger value="manual" className="flex items-center gap-2 text-base font-semibold data-[state=active]:bg-white data-[state=active]:text-purple-700">
                <ClipboardList className="size-4" />
                Manual Extraction
            </TabsTrigger>
            <TabsTrigger value="browser" className="flex items-center gap-2 text-base font-semibold data-[state=active]:bg-white data-[state=active]:text-purple-700">
                <Smartphone className="size-4" />
                iOS Safari View
            </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="mt-0 border-none p-0 focus-visible:ring-0">
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
                            <Button variant="outline" size="sm" onClick={() => window.open(portalUrl || "https://navigate.nu.edu/d2l/home", "_blank")}>
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
        </TabsContent>

        <TabsContent value="browser" className="mt-0 border-none p-0 focus-visible:ring-0">
            <div className="flex flex-col lg:flex-row gap-8 items-start justify-center py-4">
                <div className="w-full lg:w-[450px] shrink-0">
                    <IosSafariBrowser initialUrl={portalUrl || "https://navigate.nu.edu/d2l/home"} />
                </div>
                <div className="flex-1 space-y-6 max-w-md">
                    <Card className="border-purple-200">
                        <CardHeader>
                            <CardTitle className="text-purple-800 flex items-center gap-2">
                                <Smartphone className="size-5" />
                                Mobile Portal Preview
                            </CardTitle>
                            <CardDescription>
                                Interacting with your portal in a mobile view can help verify that data is visible and accessible.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 text-sm text-purple-900 leading-relaxed">
                                <p className="font-bold mb-2">How to use:</p>
                                <ul className="list-disc list-inside space-y-2">
                                    <li>Log in to your student portal within the iPhone simulator.</li>
                                    <li>Navigate to your course home or upcoming assignments.</li>
                                    <li>If automatic sync fails, you can copy the text from here and paste it in the "Manual Extraction" tab.</li>
                                </ul>
                            </div>
                            <Button 
                                variant="outline" 
                                className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
                                onClick={() => window.open(portalUrl || "https://navigate.nu.edu/d2l/home", "_blank")}
                            >
                                <ExternalLink className="mr-2 size-4" />
                                Open in New Tab
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="p-6 rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-900 text-white shadow-xl">
                        <h4 className="font-bold flex items-center gap-2 mb-2">
                            <Sparkles className="size-4 text-yellow-400" />
                            Pro Tip
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            GenesisAI works best when you are on the "Course Dashboard" or "Calendar" view of your portal. If you don&apos;t see data, try navigating to those sections first!
                        </p>
                    </div>
                </div>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { Sparkles } from "lucide-react";
