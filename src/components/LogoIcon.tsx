import React from 'react';

export const LogoIcon = ({ size = 24, className = '', color = 'currentColor' }: { size?: number, className?: string, color?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <path d="M7 9l2 5l2-3.5L13 14l2-5" />
  </svg>
);
