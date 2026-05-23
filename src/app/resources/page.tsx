'use client';

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {GradientIcon} from "@/components/ui/gradient-icon";

const resources = [
    {
        name: "Khan Academy",
        description: "A non-profit with the mission to provide a free, world-class education for anyone, anywhere.",
        url: "https://www.khanacademy.org/",
    },
    {
        name: "ALEKS",
        description: "An adaptive online learning system for math, chemistry, and business.",
        url: "https://www.aleks.com/",
    }
];

export default function ResourcesPage() {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-gradient flex items-center gap-2">
                        <GradientIcon name="Library"/>
                        Study Resources
                    </CardTitle>
                    <CardDescription>
                        External links to helpful study websites.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    {resources.map(resource => (
                        <Card key={resource.name}>
                            <CardHeader>
                                <CardTitle>{resource.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{resource.description}</p>
                            </CardContent>
                            <CardContent>
                                <Button asChild variant="outline">
                                    <a href={resource.url} target="_blank" rel="noopener noreferrer">
                                        <GradientIcon name="ExternalLink" className="mr-2 h-4 w-4"/>
                                        Visit Site
                                    </a>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
