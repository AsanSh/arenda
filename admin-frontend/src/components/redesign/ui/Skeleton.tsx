import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'card' | 'table' | 'chart' | 'circle';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  className = '',
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-slate-200 rounded';
  
  const variantClasses = {
    text: 'h-4',
    card: 'h-32',
    table: 'h-12',
    chart: 'h-40',
    circle: 'rounded-full',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="text" width="80%" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} variant="table" width="100%" />
      ))}
    </div>
  );
}
