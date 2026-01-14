'use client';

import { useGameStore } from '@/lib/store/gameStore';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';

const PIECE_VALUES: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
  P: 1,
  N: 3,
  B: 3,
  R: 5,
  Q: 9,
  K: 0,
};

export function CapturedPieces() {
  const capturedPieces = useGameStore((state) => state.capturedPieces);

  const whiteCaptured = capturedPieces.filter((p) => p.color === 'white');
  const blackCaptured = capturedPieces.filter((p) => p.color === 'black');

  const whiteMaterial = whiteCaptured.reduce(
    (sum, p) => sum + PIECE_VALUES[p.type],
    0
  );
  const blackMaterial = blackCaptured.reduce(
    (sum, p) => sum + PIECE_VALUES[p.type],
    0
  );

  const advantage = blackMaterial - whiteMaterial;

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3">Captured Pieces</h3>

      {/* White's Captures (black pieces) */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground">White captured:</span>
          {advantage < 0 && (
            <span className="text-xs font-medium">+{Math.abs(advantage)}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1 min-h-8">
          {blackCaptured.map((piece, idx) => (
            <Image
              key={`${piece.type}-${idx}`}
              src={`/b${piece.type}.png`}
              alt={piece.type}
              width={24}
              height={24}
              className="opacity-60"
            />
          ))}
        </div>
      </div>

      <Separator />

      {/* Black's Captures (white pieces) */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground">Black captured:</span>
          {advantage > 0 && (
            <span className="text-xs font-medium">+{advantage}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1 min-h-8">
          {whiteCaptured.map((piece, idx) => (
            <Image
              key={`${piece.type}-${idx}`}
              src={`/w${piece.type}.png`}
              alt={piece.type}
              width={24}
              height={24}
              className="opacity-60"
            />
          ))}
        </div>
      </div>
    </Card>
  );
}
