
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, User, Sparkles, Loader2 } from "lucide-react";

interface PortalLoginProps {
  portalUrl: string;
  isSyncing?: boolean;
  onComplete: (username?: string, password?: string) => void;
}

export function PortalLogin({ portalUrl, isSyncing, onComplete }: PortalLoginProps) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [countdown, setCountdown] = React.useState(10);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const resetTimer = React.useCallback(() => {
    if (isSyncing) return;
    setCountdown(10);
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Defer the onComplete call to avoid state update during render
          setTimeout(() => onComplete(username, password), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [username, password, onComplete, isSyncing]);

  React.useEffect(() => {
    resetTimer();
    
    const handleActivity = () => resetTimer();
    
    if (!isSyncing) {
        window.addEventListener("mousemove", handleActivity);
        window.addEventListener("keydown", handleActivity);
        window.addEventListener("click", handleActivity);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
    };
  }, [resetTimer, isSyncing]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent rounded-full blur-[120px] animate-pulse" />
      </div>

      <Card className="w-full max-w-md border-primary/20 shadow-2xl relative bg-background/80 backdrop-blur-sm">
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
            <div className="p-4 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md shadow-lg">
                {isSyncing ? (
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                ) : (
                    <Shield className="h-8 w-8 text-primary" />
                )}
            </div>
        </div>

        <CardHeader className="space-y-1 pt-10 text-center">
          <CardTitle className="text-2xl font-header text-gradient">
            {isSyncing ? "GenesisAi is Syncing..." : "Student Portal Login"}
          </CardTitle>
          <CardDescription>
            {isSyncing 
                ? "Connecting to your university to build your dashboard." 
                : `Secure connection to ${new URL(portalUrl || "https://navigate.nu.edu").hostname}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!isSyncing ? (
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Portal Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="Student ID or Email"
                    className="pl-10 h-11"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Portal Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
                    <span className="text-muted-foreground font-bold flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-primary" /> GenesisAi: Waiting for Inactivity
                    </span>
                    <span className="font-bold text-primary tabular-nums">{countdown}s</span>
                </div>
                <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-primary transition-all duration-1000 ease-linear" 
                        style={{ width: `${(countdown / 10) * 100}%` }}
                    />
                </div>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="relative">
                    <Sparkles className="h-12 w-12 text-primary animate-pulse" />
                </div>
                <p className="text-sm text-center text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-1000">
                    Extracting courses, assignments, and announcements...
                </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button 
            className="w-full h-11 font-semibold bg-gradient-to-r from-primary to-accent"
            onClick={() => onComplete(username, password)}
            disabled={isSyncing}
          >
            {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSyncing ? "Processing Data..." : "Connect & Sync Now"}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground italic px-4">
          GenesisAi uses your credentials only for this session&apos;s autonomous sync. They are never stored on any server.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
