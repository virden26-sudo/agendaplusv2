
"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Upload, Check, Loader2, FileText, Calendar } from "lucide-react";
import { useAssignments } from "@/context/assignments-context";
import { usePortal } from "@/context/portal-context";
import { v4 as uuidv4 } from 'uuid';
import { parseICS } from "@/lib/ics-parser";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type BuddieSyncDialogProps = {
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
};

export function BuddieSyncDialog({ open, onOpenChangeAction }: BuddieSyncDialogProps) {
  const { toast } = useToast();
  const { addMultipleAssignments } = useAssignments();
  const { addAnnouncements } = usePortal();
  const [isSyncing, setIsSyncing] = useState(false);
  const [portalText, setPortalText] = useState("");
  const [icalUrl, setIcalUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextSync = async () => {
    if (!portalText.trim()) return;

    setIsSyncing(true);
    try {
      const response = await fetch('/api/parse-portal/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portalText: portalText }),
      });

      if (!response.ok) throw new Error(`Failed to parse portal: ${response.status}`);

      const result = await response.json() as { assignments?: any[], announcements?: any[] };
      processSyncResult(result);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Extraction Failed",
        description: "GenesisAi couldn't parse the data. Ensure you've copied the full portal content.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleIcalSync = async () => {
    if (!icalUrl.trim()) return;
    setIsSyncing(true);
    try {
      const response = await fetch(icalUrl);
      if (!response.ok) throw new Error("Could not fetch calendar feed.");

      const data = await response.text();
      const events = parseICS(data);

      if (events.length === 0) {
        throw new Error("No events found in the calendar feed.");
      }

      const assignments = events.map(event => ({
        task: event.title,
        dueDate: event.start.toISOString().split('T')[0],
        course: event.course || "Imported",
        details: event.description || "",
      }));

      addMultipleAssignments(assignments);

      toast({
        title: "Calendar Sync Complete",
        description: `Successfully imported ${assignments.length} assignments.`,
      });
      onOpenChangeAction(false);
      setIcalUrl("");
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Calendar Sync Failed",
        description: error.message || "Ensure the URL is correct and public.",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const processSyncResult = (result: { assignments?: any[], announcements?: any[] }) => {
    let count = 0;
    if (result.assignments && result.assignments.length > 0) {
      addMultipleAssignments(result.assignments.map((a: { course?: string | null }) => ({
          ...a,
          course: a.course || undefined
      })));
      count += result.assignments.length;
    }

    if (result.announcements && result.announcements.length > 0) {
      addAnnouncements(result.announcements.map((a: { title: string, content?: string | null, date?: string | null, course?: string | null, important?: boolean | null }) => ({
          id: uuidv4(),
          ...a,
          course: a.course || "General",
          content: a.content || "",
          important: Boolean(a.important),
          date: a.date ? new Date(a.date) : new Date()
      })));
      count += result.announcements.length;
    }

    toast({
      title: "GenesisAi Extraction Complete",
      description: `Successfully processed ${count} items.`,
    });
    onOpenChangeAction(false);
    setPortalText("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = event.target?.result as string;
        setIsSyncing(true);
        try {
          const response = await fetch('/api/parse-portal/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                portalText: file.type.startsWith('text/') ? content : undefined,
                portalFile: !file.type.startsWith('text/') ? content : undefined
            }),
          });
          const result = await response.json();
          processSyncResult(result);
        } catch (err) {
            toast({ variant: "destructive", title: "File Sync Failed" });
        } finally {
            setIsSyncing(false);
        }
      };

      if (file.type.startsWith('text/') || file.name.endsWith('.html')) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isSyncing) onOpenChangeAction(isOpen);
    }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            GenesisAi Sync
          </DialogTitle>
          <DialogDescription>
            Extract assignments, announcements, and more using GenesisAi-Standalone.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="text" className="py-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text" className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Raw Text / Portal
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" /> iCal Feed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4 pt-4">
            <Textarea
                placeholder="Paste your course content, weekly modules, or portal text here..."
                className="min-h-[200px] font-mono text-xs focus-visible:ring-primary"
                value={portalText}
                onChange={(e) => setPortalText(e.target.value)}
                disabled={isSyncing}
            />
            <div className="flex gap-2">
                <Button
                    className="flex-1 bg-primary hover:bg-primary/90"
                    onClick={handleTextSync}
                    disabled={isSyncing || !portalText.trim()}
                >
                    {isSyncing ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                    Extract with GenesisAi
                </Button>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileChange}
                />
                <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSyncing}
                >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                </Button>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4 pt-4">
            <div className="space-y-2">
                <Input
                    placeholder="https://canvas.instructure.com/feeds/..."
                    value={icalUrl}
                    onChange={(e) => setIcalUrl(e.target.value)}
                    disabled={isSyncing}
                />
                <p className="text-[11px] text-muted-foreground">
                    Connect your external calendar feed (Canvas, Blackboard, Brightspace).
                </p>
            </div>
            <Button
              className="w-full bg-primary"
              onClick={handleIcalSync}
              disabled={isSyncing || !icalUrl.trim()}
            >
              {isSyncing ? <Loader2 className="mr-2 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Sync Calendar
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t pt-4">
            <p className="text-[10px] text-muted-foreground text-center w-full italic">
                Powered by GenesisAi-Standalone local LLM extraction.
            </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
