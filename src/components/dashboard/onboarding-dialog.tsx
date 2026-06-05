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
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Globe, Sparkles, User} from "lucide-react";
import {useUser} from "@/context/user-context";

interface OnboardingDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function OnboardingDialog({open, onOpenChange}: OnboardingDialogProps) {
    const {setUser, setPortalUrl} = useUser();
    const [name, setName] = React.useState("");
    const [url, setUrl] = React.useState("https://navigate.nu.edu/d2l/home");

    const handleSave = () => {
        if (!name.trim() || !url.trim()) return;

        setUser({
            name: name.trim(),
            avatarUrl: `https://picsum.photos/seed/agendaplus-${name.trim()}/100/100`,
        });
        setPortalUrl(url.trim());
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-2xl font-headline text-gradient">
                        <Sparkles className="text-primary"/>
                        Welcome to Agenda+
                    </DialogTitle>
                    <DialogDescription>
                        Let&apos;s get you set up. GenesisAI needs your portal details to start monitoring your academic
                        universe.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="flex items-center gap-2">
                            <User className="size-4 text-primary"/>
                            Your Name
                        </Label>
                        <Input
                            id="name"
                            placeholder="e.g. John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="border-primary/20 focus-visible:ring-primary"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="url" className="flex items-center gap-2">
                            <Globe className="size-4 text-primary"/>
                            Student Portal URL
                        </Label>
                        <Input
                            id="url"
                            placeholder="https://..."
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="border-primary/20 focus-visible:ring-primary"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Tip: This is usually the login page for your school&apos;s D2L, Canvas, or Blackboard.
                        </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                        After setup, GenesisAI opens your school portal in a monitored browser and imports assignments automatically — no copying required.
                    </p>
                </div>
                <DialogFooter>
                    <Button
                        onClick={handleSave}
                        disabled={!name.trim() || !url.trim()}
                        className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
                    >
                        Launch GenesisAI
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
