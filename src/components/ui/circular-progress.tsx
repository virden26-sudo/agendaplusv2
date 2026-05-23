"use client";

import * as React from "react";

type CircularProgressProps = React.SVGProps<SVGSVGElement> & {
    progress: number;
    strokeWidth?: number;
};

export function CircularProgress({
                                     progress,
                                     strokeWidth = 10,
                                     className,
                                     ...props
                                 }: CircularProgressProps) {
    const radius = 50 - strokeWidth / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            className={className}
            {...props}
        >
            <circle
                className="text-muted"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                fill="transparent"
                r={radius}
                cx="50"
                cy="50"
            />
            <circle
                className="text-primary transition-all duration-500"
                stroke="hsl(var(--primary))"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="transparent"
                r={radius}
                cx="50"
                cy="50"
                style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: offset,
                    transform: "rotate(-90deg)",
                    transformOrigin: "50% 50%",
                }}
            />
            <text
                x="50"
                y="50"
                textAnchor="middle"
                dy=".3em"
                className="text-2xl font-bold fill-foreground"
            >
                {`${Math.round(progress)}%`}
            </text>
        </svg>
    );
}
