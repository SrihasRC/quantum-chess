'use client';

interface PromotionDialogProps {
  color: 'white' | 'black';
  onSelect: (piece: 'Q' | 'R' | 'B' | 'N') => void;
  onCancel: () => void;
}

const pieceOptions: Array<{ piece: 'Q' | 'R' | 'B' | 'N'; name: string; symbol: string }> = [
  { piece: 'Q', name: 'Queen', symbol: '♕' },
  { piece: 'R', name: 'Rook', symbol: '♖' },
  { piece: 'B', name: 'Bishop', symbol: '♗' },
  { piece: 'N', name: 'Knight', symbol: '♘' },
];

export default function PromotionDialog({ color, onSelect, onCancel }: PromotionDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          Promote Pawn
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Choose which piece to promote your pawn to:
        </p>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          {pieceOptions.map(({ piece, name, symbol }) => (
            <button
              key={piece}
              onClick={() => onSelect(piece)}
              className="flex flex-col items-center justify-center p-6 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
            >
              <span className={`text-6xl mb-2 ${color === 'white' ? 'text-gray-200' : 'text-gray-900'}`}>
                {color === 'white' ? symbol : symbol.toLowerCase() === symbol ? symbol : String.fromCharCode(symbol.charCodeAt(0) + 6)}
              </span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {name}
              </span>
            </button>
          ))}
        </div>
        
        <button
          onClick={onCancel}
          className="w-full py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
