
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/icons";
import { Sparkles } from "lucide-react";

interface LoginPageProps {
  onLogin: (name: string, portalUrl: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [name, setName] = React.useState("");
  const [portalUrl, setPortalUrl] = React.useState("https://navigate.nu.edu/d2l/home");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onLogin(name.trim(), portalUrl.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-xl">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="p-3 rounded-2xl bg-primary/10 mb-2">
            <Logo className="h-12 w-12" />
          </div>
          <CardTitle className="text-4xl font-header text-gradient py-2">Agenda+</CardTitle>
          <CardDescription className="text-center text-base">
            Your Academic Sidekick. Get started by setting up your profile.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Alex Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portal-url">University Portal URL</Label>
              <Input
                id="portal-url"
                placeholder="https://my.school.edu"
                value={portalUrl}
                onChange={(e) => setPortalUrl(e.target.value)}
                required
                className="h-12"
              />
              <p className="text-xs text-muted-foreground italic">
                We&apos;ll use this to sync your assignments and grades.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full h-12 text-lg font-semibold" disabled={!name.trim()}>
              <Sparkles className="mr-2 h-5 w-5" />
              Enter Dashboard
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
