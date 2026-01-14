'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { PieceSymbol, Color, QuantumPiece } from '@/lib/types';
import { QuantumIndicator } from '@/components/quantum/QuantumIndicator';
import { ProbabilityOverlay } from '@/components/quantum/ProbabilityOverlay';

interface PieceProps {
  type: PieceSymbol;
  color: Color;
  probability?: number; // For quantum visualization
  isDragging?: boolean;
  className?: string;
  quantumPiece?: QuantumPiece; // Full quantum piece data for overlay
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
  quantumPiece,
}: PieceProps) {
  const imagePath = getPieceImagePath(type, color);

  return (
    <div
      className={cn(
        'relative flex h-full w-full items-center justify-center transition-opacity',
        isDragging && 'cursor-grabbing opacity-50',
        className
      )}
      style={{ opacity: probability }}
    >
      {quantumPiece && <ProbabilityOverlay piece={quantumPiece} />}
      
      <Image
        src={imagePath}
        alt={`${color} ${type}`}
        width={60}
        height={60}
        className="pointer-events-none select-none"
        draggable={false}
      />
      
      <QuantumIndicator probability={probability} />
    </div>
  );
}
