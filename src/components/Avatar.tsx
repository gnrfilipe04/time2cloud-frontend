import { useState } from 'react';

interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

export const Avatar = ({ name, imageUrl, size = 'md', className = '' }: AvatarProps) => {
  const [imageError, setImageError] = useState(false);

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Gera uma cor baseada no nome para consistência
  const colors = [
    'bg-primary-500',
    'bg-success-500',
    'bg-warning-500',
    'bg-error-500',
    'bg-secondary-500',
  ];
  const colorIndex = name.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];

  const showImage = imageUrl && !imageError;

  return (
    <div
      className={`${sizeClasses[size]} ${className} rounded-full flex items-center justify-center font-semibold text-white overflow-hidden ${
        showImage ? '' : bgColor
      }`}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

