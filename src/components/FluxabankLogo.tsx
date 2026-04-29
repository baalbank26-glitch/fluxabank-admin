import React from 'react';
import FluxabankLogoAsset from '../assets/fluxabank-logo.png';

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
    <div className={`relative group inline-block ${className}`}>
      {/* Gloss layer */}
      <div className="absolute inset-x-0 -inset-y-2 bg-orange-500/10 blur-xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
      <img
        src={FluxabankLogoAsset}
        alt="Fluxabank"
        className={`${sizeMap[size]} object-contain relative z-10 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)] transition-transform duration-500 group-hover:scale-110`}
      />
    </div>
  );
};

