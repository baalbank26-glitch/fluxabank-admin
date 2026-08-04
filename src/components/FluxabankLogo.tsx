import React from 'react';

interface FluxabankLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const FluxabankLogo: React.FC<FluxabankLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-32 h-32',
  };

  return (
    <div className={`relative group inline-flex items-center justify-center ${sizeMap[size]} ${className}`}>
      {/* Glow layer */}
      <div className="absolute inset-0 bg-emerald-500/10 blur-xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
      <svg
        viewBox="0 0 40 40"
        className="relative z-10 w-full h-full drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-transform duration-500 group-hover:scale-110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M8 30 L20 10 L32 30 L26 30 L20 18 L14 30 Z" fill="#10b981"/>
      </svg>
    </div>
  );
};

