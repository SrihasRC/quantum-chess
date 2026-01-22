'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { PieceSymbol, Color } from '@/lib/types';

interface PieceProps {
  type: PieceSymbol;
  color: Color;
  probability?: number; // For quantum visualization
  isDragging?: boolean;
  className?: string;
}

/** Map piece type and color to image filename */
function getPieceImagePath(type: PieceSymbol, color: Color): string {
  const colorPrefix = color === 'white' ? 'w' : 'b';
  const pieceChar = type.toLowerCase();
  return `/${colorPrefix}${pieceChar}.png`;
}

export function Piece({
  type,
  color,
  probability = 1.0,
  isDragging = false,
  className,
}: PieceProps) {
  const imagePath = getPieceImagePath(type, color);
  const isSuperposed = probability < 1.0;

  return (
    <div
      className={cn(
        'relative flex h-full w-full items-center justify-center transition-opacity',
        isDragging && 'cursor-grabbing opacity-50',
        className
      )}
      style={{ opacity: probability }}
    >
      <Image
        src={imagePath}
        alt={`${color} ${type}`}
        width={60}
        height={60}
        className="pointer-events-none select-none"
        draggable={false}
      />
      
      {isSuperposed && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full bg-black/40 backdrop-blur-sm px-2 py-0.5 text-xs font-bold text-white shadow-lg">
          {Math.round(probability * 100)}%
        </div>
      )}
    </div>
  );
}
