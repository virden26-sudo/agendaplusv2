
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Video } from "lucide-react";

export function LiveSessionCard() {
    const [zoomLink, setZoomLink] = useState("");

    useEffect(() => {
        const savedZoomLink = localStorage.getItem("zoomLink");
        if (savedZoomLink) {
            setZoomLink(savedZoomLink);
        }
    }, []);
    
    const handleZoomLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setZoomLink(e.target.value);
    };

    const handleJoinZoom = () => {
        localStorage.setItem("zoomLink", zoomLink);
        window.open(zoomLink, "_blank");
    };

    return (
        <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gradient">
                <Video />
                Live Session
              </CardTitle>
              <CardDescription>Join your remote class or study group.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="zoom-link">Zoom Meeting Link</Label>
                <Input
                  id="zoom-link"
                  value={zoomLink}
                  onChange={handleZoomLinkChange}
                  placeholder="https://zoom.us/j/..."
                />
              </div>
              <Button className="w-full" onClick={handleJoinZoom} disabled={!zoomLink}>
                Join Session
              </Button>
            </CardContent>
        </Card>
    );
}
