'use client';

import {useState} from 'react';
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {useToast} from '@/hooks/use-toast';
import {GradientIcon} from '@/components/ui/gradient-icon';

export default function LiveSessionPage() {
    const [meetingUrl, setMeetingUrl] = useState('');
    const {toast} = useToast();

    const handleJoinMeeting = () => {
        if (meetingUrl.trim()) {
            let url = meetingUrl.trim();
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            try {
                new URL(url); // Validate URL
                window.open(url, '_blank', 'noopener,noreferrer');
            } catch (e) {
                toast({
                    variant: 'destructive',
                    title: 'Invalid URL',
                    description: 'Please enter a valid meeting URL.',
                });
            }
        } else {
            toast({
                variant: 'destructive',
                title: 'No URL Entered',
                description: 'Please enter a meeting URL to join.',
            });
        }
    };

    return (
        <div className="flex justify-center items-start pt-10">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-gradient flex items-center gap-2">
                        <GradientIcon name="Video" className="h-6 w-6"/>
                        Join Live Session
                    </CardTitle>
                    <CardDescription>
                        Enter the URL for your online class, study group, or meeting to join instantly.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="meeting-url">Meeting URL</Label>
                        <Input
                            id="meeting-url"
                            type="url"
                            placeholder="e.g., zoom.us/j/1234567890"
                            value={meetingUrl}
                            onChange={(e) => setMeetingUrl(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleJoinMeeting();
                                }
                            }}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={handleJoinMeeting}>
                        Join Meeting
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
