'use client';

import * as React from 'react';

export function AppLogo() {
    return (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="hsl(var(--background))"/>
            <text
                x="50%"
                y="50%"
                dominantBaseline="central"
                textAnchor="middle"
                fontSize="34"
                fontFamily="'Segoe Script', cursive"
                fontWeight="bold"
                fontStyle="italic"
                fill="url(#grad1)"
                dy=".1em"
            >
                A+
            </text>
            <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--primary))"/>
                    <stop offset="100%" stopColor="hsl(var(--accent))"/>
                </linearGradient>
            </defs>
        </svg>
    );
}
