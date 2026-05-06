import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      {/* Script A+ Inspired Shape */}
      <path
        d="M4 18C4 18 6 12 10 4C11 2 13 2 14 4C18 12 20 18 20 18"
        stroke="url(#logo-gradient)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M7 14C9 14 15 14 17 14"
        stroke="url(#logo-gradient)"
        strokeWidth="2"
      />
      <path
        d="M18 6L22 6M20 4L20 8"
        stroke="url(#logo-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
