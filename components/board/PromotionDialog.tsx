'use client';

import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PromotionDialogProps {
  color: 'white' | 'black';
  onSelect: (piece: 'Q' | 'R' | 'B' | 'N') => void;
  onCancel: () => void;
}

const pieceOptions: Array<{ piece: 'Q' | 'R' | 'B' | 'N'; name: string }> = [
  { piece: 'Q', name: 'Queen' },
  { piece: 'R', name: 'Rook' },
  { piece: 'B', name: 'Bishop' },
  { piece: 'N', name: 'Knight' },
];

export default function PromotionDialog({ color, onSelect, onCancel }: PromotionDialogProps) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Promote Pawn</DialogTitle>
          <DialogDescription>
            Choose which piece to promote your pawn to
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-4 gap-3 py-4">
          {pieceOptions.map(({ piece, name }) => (
            <button
              key={piece}
              onClick={() => onSelect(piece)}
              className="flex flex-col items-center gap-2 p-3 rounded-lg border-2 border-muted hover:border-primary hover:bg-accent transition-all"
              title={name}
            >
              <div className="w-12 h-12 relative">
                <Image
                  src={`/${color === 'white' ? 'w' : 'b'}${piece.toLowerCase()}.png`}
                  alt={`${color} ${name}`}
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-xs font-medium">{name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
