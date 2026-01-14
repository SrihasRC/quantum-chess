'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PieceSymbol } from '@/lib/types';
import Image from 'next/image';

interface PromotionModalProps {
  isOpen: boolean;
  playerColor: 'white' | 'black';
  onSelect: (piece: PieceSymbol) => void;
}

const PROMOTION_PIECES: PieceSymbol[] = ['Q', 'R', 'B', 'N'];

export function PromotionModal({ isOpen, playerColor, onSelect }: PromotionModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Promote Pawn</DialogTitle>
          <DialogDescription>
            Choose a piece to promote your pawn to
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-4 gap-4 py-4">
          {PROMOTION_PIECES.map((piece) => (
            <button
              key={piece}
              onClick={() => onSelect(piece)}
              className="flex flex-col items-center justify-center p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-accent transition-colors"
            >
              <Image
                src={`/${playerColor}${piece.toLowerCase()}.png`}
                alt={piece}
                width={64}
                height={64}
                className="mb-2"
              />
              <span className="text-xs font-medium uppercase">{piece}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
