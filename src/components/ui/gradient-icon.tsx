"use client";

import * as React from "react";
import * as icons from "lucide-react";

import {cn} from "@/lib/utils";

type GradientIconProps = {
    name: keyof typeof icons;
} & React.ComponentProps<"svg">;

export function GradientIcon({name, className, ...props}: GradientIconProps) {
    const LucideIcon = icons[name] as React.FC<React.SVGProps<SVGSVGElement>>;

    // A unique ID for the gradient is necessary to avoid conflicts when multiple icons are on the page.
    const iconId = `grad-${name}-${React.useId()}`;

    if (!LucideIcon) {
        // If an icon name is invalid, log a warning and render a fallback icon.
        // This prevents the entire app from crashing.
        console.warn(`Icon "${name}" not found in lucide-react`);
        const FallbackIcon = icons["HelpCircle"];
        return <FallbackIcon className={cn("text-muted-foreground", className)} {...props} />;
    }

    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={`url(#${iconId})`}
            xmlns="http://www.w3.org/2000/svg"
            className={cn("h-4 w-4", className)}
            {...props}
        >
            <defs>
                <linearGradient id={iconId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--primary))"/>
                    <stop offset="100%" stopColor="hsl(var(--accent))"/>
                </linearGradient>
            </defs>
            {/* Render the actual icon with its path, but use the gradient fill */}
            <LucideIcon fill={`url(#${iconId})`} color={`url(#${iconId})`}/>
        </svg>
    );
}
