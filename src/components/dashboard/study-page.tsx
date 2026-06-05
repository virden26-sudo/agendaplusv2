
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as React from "react";
import { useState } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Bot, GraduationCap, Calculator, Library, ExternalLink, BrainCircuit } from "lucide-react";
import { IntelligentSchedulerDialog } from "./intelligent-scheduler-dialog";
import { LiveSessionCard } from "./live-session-card";
import { useUser } from "@/context/user-context";
import { readLocalStorage } from "@/lib/storage";

export function StudyPage() {
  const { portalUrl: savedPortalUrl, setPortalUrl: savePortalUrl } = useUser();
  const [portalUrl, setPortalUrl] = useState("https://navigate.nu.edu/d2l/home");
  const [schedulerOpen, setSchedulerOpen] = useState(false);

  React.useEffect(() => {
    const resolved =
      savedPortalUrl || readLocalStorage("studentPortalUrl") || "https://navigate.nu.edu/d2l/home";
    setPortalUrl(resolved);
  }, [savedPortalUrl]);

  const handlePortalUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPortalUrl(e.target.value);
  }

  const handleSavePortalUrl = () => {
    savePortalUrl(portalUrl);
    window.open(portalUrl, "_blank");
  }

  const handleAleksClick = () => {
    window.open("https://www.aleks.com/", "_blank");
  };
  
  const handleLearningCenterClick = () => {
    window.open("https://www.nu.edu/students/academic-success-center/", "_blank");
  };

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gradient">
                <GraduationCap />
                Student Portal
              </CardTitle>
              <CardDescription>Access your university&apos;s resources.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="portal-url">Portal URL</Label>
                <Input 
                  id="portal-url" 
                  value={portalUrl}
                  onChange={handlePortalUrlChange}
                  placeholder="https://my.school.edu"
                />
              </div>
              <Button className="w-full" onClick={handleSavePortalUrl}>
                <ExternalLink className="mr-2"/>
                Go to Portal
              </Button>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gradient">
                    <BrainCircuit />
                    Intelligent Scheduler
                </CardTitle>
                <CardDescription>Let AI build you a custom study plan.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">The AI scheduler analyzes your upcoming assignments to suggest an optimal study schedule.</p>
                <Button className="w-full" onClick={() => setSchedulerOpen(true)}>
                    <Bot className="mr-2 h-4 w-4" />
                    Generate Study Plan
                </Button>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gradient">
                    <Calculator />
                    Connect to ALEKS
                </CardTitle>
                <CardDescription>Access your math and chemistry assignments.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Go to the ALEKS website to complete your interactive assignments.</p>
                <Button className="w-full" onClick={handleAleksClick}>
                    <ExternalLink className="mr-2"/>
                    Go to ALEKS
                </Button>
            </CardContent>
        </Card>
        <LiveSessionCard />
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gradient">
                    <Library />
                    Academic Support
                </CardTitle>
                <CardDescription>Get help when you need it.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Connect with your university&apos;s resources for academic support and tutoring.</p>
                <Button className="w-full" variant="secondary" onClick={handleLearningCenterClick}>Visit Learning Center</Button>
            </CardContent>
        </Card>
    </div>
    <IntelligentSchedulerDialog open={schedulerOpen} onOpenChange={setSchedulerOpen} />
    </>
  );
}
