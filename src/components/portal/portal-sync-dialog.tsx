"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, ClipboardPaste, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
    openStudentPortal,
    parsePortalDataOnDevice,
    readClipboardText,
} from "@/lib/portal-sync-client";
import { countPortalItems } from "@/lib/portal-text-parser";

export type PortalSyncDialogResult = ReturnType<typeof parsePortalDataOnDevice>;

type PortalSyncDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    portalUrl: string;
    onImported: (result: PortalSyncDialogResult) => number;
};

export function PortalSyncDialog({
    open,
    onOpenChange,
    portalUrl,
    onImported,
}: PortalSyncDialogProps) {
    const { toast } = useToast();
    const [portalText, setPortalText] = React.useState("");
    const [isSyncing, setIsSyncing] = React.useState(false);
    const [step, setStep] = React.useState<"login" | "paste">("login");

    const handleDialogOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setPortalText("");
            setStep("login");
            setIsSyncing(false);
        }
        onOpenChange(nextOpen);
    };

    const handleOpenPortal = () => {
        openStudentPortal(portalUrl);
        setStep("paste");
        toast({
            title: "School portal opened",
            description: "Log in, open Assignments or Calendar, copy the list, then come back here.",
        });
    };

    const handlePasteFromClipboard = async () => {
        const clip = await readClipboardText();
        if (!clip) {
            toast({
                variant: "destructive",
                title: "Could not read clipboard",
                description: "Long-press and paste into the box below instead.",
            });
            return;
        }
        setPortalText(clip);
        setStep("paste");
    };

    const handleSync = async () => {
        if (!portalText.trim()) {
            toast({
                variant: "destructive",
                title: "Paste your assignments",
                description: "Copy text from your portal after you log in.",
            });
            return;
        }

        setIsSyncing(true);
        try {
            const result = parsePortalDataOnDevice(portalText);
            const count = onImported(result);

            if (count > 0) {
                toast({
                    title: "You're synced",
                    description: `Imported ${count} item(s) into your agenda.`,
                });
                handleDialogOpenChange(false);
            } else {
                toast({
                    variant: "destructive",
                    title: "Nothing found in that text",
                    description: "Copy the full Assignments or Upcoming Work list from your portal and try again.",
                });
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const previewCount = React.useMemo(
        () => (portalText.trim() ? countPortalItems(parsePortalDataOnDevice(portalText)) : 0),
        [portalText]
    );

    return (
        <Dialog open={open} onOpenChange={handleDialogOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-headline text-gradient">
                        <Sparkles className="text-primary" />
                        Sync your school portal
                    </DialogTitle>
                    <DialogDescription>
                        Log in to your university site, copy your assignment list, and Agenda+ handles the rest on this device.
                    </DialogDescription>
                </DialogHeader>

                {step === "login" ? (
                    <div className="space-y-4 py-2">
                        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                            <li>Open your student portal and sign in</li>
                            <li>Go to Assignments, Calendar, or Course Home</li>
                            <li>Select all text and copy it</li>
                            <li>Return here and paste</li>
                        </ol>
                        <Button className="w-full h-11" onClick={handleOpenPortal}>
                            <ExternalLink className="mr-2 size-4" />
                            Open my school portal
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => setStep("paste")}>
                            I&apos;m already logged in
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3 py-2">
                        <Button variant="outline" size="sm" className="w-full" onClick={handleOpenPortal}>
                            <ExternalLink className="mr-2 size-3" />
                            Open portal again
                        </Button>
                        <Textarea
                            placeholder="Paste everything you copied from Assignments or Calendar…"
                            className="min-h-[200px] font-mono text-sm"
                            value={portalText}
                            onChange={(event) => setPortalText(event.target.value)}
                            disabled={isSyncing}
                        />
                        <Button variant="secondary" size="sm" className="w-full" onClick={() => void handlePasteFromClipboard()}>
                            <ClipboardPaste className="mr-2 size-4" />
                            Paste from clipboard
                        </Button>
                        {previewCount > 0 && (
                            <p className="text-xs text-primary font-medium">
                                Found about {previewCount} item(s) in your paste.
                            </p>
                        )}
                    </div>
                )}

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={() => handleDialogOpenChange(false)} disabled={isSyncing}>
                        Later
                    </Button>
                    {step === "paste" && (
                        <Button onClick={() => void handleSync()} disabled={!portalText.trim() || isSyncing}>
                            {isSyncing ? (
                                <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    Syncing…
                                </>
                            ) : (
                                "Sync to my agenda"
                            )}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
