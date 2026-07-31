import React from 'react';

interface LogoADProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const LogoAD: React.FC<LogoADProps> = ({ className, ...props }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 360 200" 
      className={className} 
      {...props}
    >
      <defs>
        <linearGradient id="grad-a" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0B4F6C" />
          <stop offset="100%" stopColor="#2CB5A0" />
        </linearGradient>
        
        <linearGradient id="grad-d" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1DA1F2" />
          <stop offset="100%" stopColor="#0047AB" />
        </linearGradient>

        <linearGradient id="grad-arrow" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2CB5A0" />
          <stop offset="100%" stopColor="#5CE1E6" />
        </linearGradient>
        
        <linearGradient id="bar1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5CE1E6" />
          <stop offset="100%" stopColor="#0B4F6C" />
        </linearGradient>
        <linearGradient id="bar2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2CB5A0" />
          <stop offset="100%" stopColor="#0B4F6C" />
        </linearGradient>
        <linearGradient id="bar3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1DA1F2" />
          <stop offset="100%" stopColor="#0047AB" />
        </linearGradient>
      </defs>

      {/* The Letter A (Left leg and top) */}
      <path 
        d="M 60 160 L 110 50 C 120 30 140 30 150 50 L 170 95" 
        fill="none" 
        stroke="url(#grad-a)" 
        strokeWidth="28" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />

      {/* The Letter D */}
      <path 
        d="M 230 40 L 230 160 C 320 160 320 40 230 40 Z" 
        fill="none" 
        stroke="url(#grad-d)" 
        strokeWidth="28"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bars inside D */}
      <rect x="245" y="110" width="14" height="40" rx="4" fill="url(#bar1)" />
      <rect x="267" y="80" width="14" height="70" rx="4" fill="url(#bar2)" />
      <rect x="289" y="50" width="14" height="100" rx="4" fill="url(#bar3)" />

      {/* The Trendline Arrow */}
      {/* Outer stroke for separation on the 'A' */}
      <path 
        d="M 30 130 L 70 120 L 95 155 L 140 85 L 165 110 L 210 55" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="12" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="text-white dark:text-slate-900"
      />
      {/* Inner colored stroke */}
      <path 
        d="M 30 130 L 70 120 L 95 155 L 140 85 L 165 110 L 210 55" 
        fill="none" 
        stroke="url(#grad-arrow)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Arrowhead */}
      <path 
        d="M 215 45 L 195 50 L 205 75 Z" 
        fill="url(#grad-arrow)" 
      />
    </svg>
  );
};
