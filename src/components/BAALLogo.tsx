import React from 'react';
import baalLogoAsset from '../assets/baal-logo.png';

interface BAALLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const BAALLogo: React.FC<BAALLogoProps> = ({ className = '', size = 'md' }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-32 h-32',
  };

  return (
    <div className={`relative group inline-block ${className}`}>
      {/* Gloss layer */}
      <div className="absolute inset-x-0 -inset-y-2 bg-red-600/10 blur-xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
      <img
        src={baalLogoAsset}
        alt="BAAL"
        className={`${sizeMap[size]} object-contain relative z-10 drop-shadow-[0_0_8px_rgba(220,38,38,0.4)] transition-transform duration-500 group-hover:scale-110`}
      />
    </div>
  );
};
