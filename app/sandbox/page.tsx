"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Chessboard } from "@/components/board/Chessboard";
import { MoveModSelector, type MoveMode } from "@/components/game/MoveModSelector";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/store/gameStore";
import { createInitialBoardState, getPiecesAtSquare } from "@/lib/engine/state";
import type { PieceSymbol, SquareIndex } from "@/lib/types";
import { indexToAlgebraic } from "@/lib/engine/utils";
import { toast } from "sonner";
import { FlipVertical, Trash2 } from "lucide-react";

const whitePieces: PieceSymbol[] = ["K", "Q", "R", "B", "N", "P"];
const blackPieces: (PieceSymbol | string)[] = ["k", "q", "r", "b", "n", "p"];

export default function SandboxPage() {
  const [selectedPieceForPlacement, setSelectedPieceForPlacement] = useState<PieceSymbol | null>(null);
  const [moveMode, setMoveMode] = useState<MoveMode>('classic');
  const [flipped, setFlipped] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const undoMove = useGameStore((state) => state.undoMove);

  // Enable sandbox mode on mount
  useEffect(() => {
    useGameStore.setState({ sandboxMode: true });
    return () => {
      // Disable sandbox mode when leaving
      useGameStore.setState({ sandboxMode: false });
    };
  }, []);

  const handleClearBoard = () => {
    useGameStore.setState({
      board: {
        ...createInitialBoardState(),
        pieces: [],
      },
    });
    toast.success("Board cleared");
  };


  const handlePieceClick = (piece: PieceSymbol) => {
    setDeleteMode(false);
    setSelectedPieceForPlacement(piece);
    toast.info(`Click on a square to place ${piece}`);
  };

  const handleSquareClick = (square: SquareIndex) => {
    const currentBoard = useGameStore.getState().board;
    const piecesAtSquare = getPiecesAtSquare(currentBoard, square);

    // If we have a piece selected for placement
    if (selectedPieceForPlacement) {
      if (piecesAtSquare.length > 0) {
        toast.error("Square occupied. Click piece to remove first.");
        return;
      }

      const color = selectedPieceForPlacement === selectedPieceForPlacement.toUpperCase() ? "white" : "black";
      const pieceType = selectedPieceForPlacement.toUpperCase() as PieceSymbol;
      const newPieceId = `${color[0]}${pieceType}-sandbox-${Date.now()}`;

      useGameStore.setState({
        board: {
          ...currentBoard,
          pieces: [
            ...currentBoard.pieces,
            {
              id: newPieceId,
              type: pieceType,
              color,
              superposition: { [square]: 1.0 },
              isSuperposed: false,
            },
          ],
        },
      });

      toast.success(`Placed ${selectedPieceForPlacement} at ${indexToAlgebraic(square)}`);
      setSelectedPieceForPlacement(null);
      return;
    }

    // Remove piece only if in delete mode
    if (deleteMode && piecesAtSquare.length > 0) {
      const pieceToRemove = piecesAtSquare[0];
      useGameStore.setState({
        board: {
          ...currentBoard,
          pieces: currentBoard.pieces.filter(
            (p) => p.id !== pieceToRemove.id
          ),
        },
      });
      toast.success(`Removed ${pieceToRemove.type}`);
      return;
    }

    // Disable delete mode if clicking on empty square
    if (deleteMode && piecesAtSquare.length === 0) {
      setDeleteMode(false);
      toast.info("Delete mode disabled");
    }
  };

  const handleSquareDrop = (square: SquareIndex, piece: PieceSymbol) => {
    const currentBoard = useGameStore.getState().board;
    const piecesAtSquare = getPiecesAtSquare(currentBoard, square);

    if (piecesAtSquare.length > 0) {
      toast.error("Square already occupied");
      return;
    }

    const color = piece === piece.toUpperCase() ? "white" : "black";
    const pieceType = piece.toUpperCase() as PieceSymbol;
    const newPieceId = `${color[0]}${pieceType}-sandbox-${Date.now()}`;

    useGameStore.setState({
      board: {
        ...currentBoard,
        pieces: [
          ...currentBoard.pieces,
          {
            id: newPieceId,
            type: pieceType,
            color,
            superposition: { [square]: 1.0 },
            isSuperposed: false,
          },
        ],
      },
    });

    toast.success(`Placed ${piece} at ${indexToAlgebraic(square)}`);
  };

  const handleExportBoard = () => {
    const boardState = useGameStore.getState().board;
    const json = JSON.stringify(boardState, null, 2);
    navigator.clipboard.writeText(json);
    toast.success("Board state copied to clipboard");
  };

  const handleImportBoard = () => {
    const json = prompt("Paste board state JSON:");
    if (!json) return;

    try {
      const boardState = JSON.parse(json);
      useGameStore.setState({ board: boardState });
      toast.success("Board state imported");
    } catch {
      toast.error("Invalid JSON");
    }
  };

  const PieceBox = ({ piece }: { piece: PieceSymbol }) => {
    const pieceImages: Record<string, string> = {
      K: "/wk.png",
      Q: "/wq.png",
      R: "/wr.png",
      B: "/wb.png",
      N: "/wn.png",
      P: "/wp.png",
      k: "/bk.png",
      q: "/bq.png",
      r: "/br.png",
      b: "/bb.png",
      n: "/bn.png",
      p: "/bp.png",
    };

    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("piece", piece);
          e.dataTransfer.effectAllowed = "copy";
        }}
        onClick={() => handlePieceClick(piece)}
        className={`cursor-pointer w-14 h-14 flex items-center justify-center border-2 rounded transition-all
          ${selectedPieceForPlacement === piece 
            ? 'border-primary bg-primary/20 scale-110' 
            : 'border-border bg-card hover:bg-accent hover:scale-105'
          }`}
        title={`Click to select or drag to place ${piece}`}
      >
        <Image 
          src={pieceImages[piece]} 
          alt={piece}
          width={48}
          height={48}
          className="select-none pointer-events-none"
          draggable={false}
        />
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />
      
      {/* Main content */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        

        {/* Board with move mode selector */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0">
          <div className="flex items-center gap-6 w-full max-w-[90vh]">
            <div className="shrink-0">
              <MoveModSelector mode={moveMode} onModeChange={setMoveMode} />
            </div>
            <div
              className="flex-1"
              onDrop={(e) => {
                e.preventDefault();
                const piece = e.dataTransfer.getData("piece") as PieceSymbol;
                if (!piece) return;

                const target = e.target as HTMLElement;
                const squareEl = target.closest("[data-square]");
                if (squareEl) {
                  const square = parseInt(
                    squareEl.getAttribute("data-square") || "0"
                  );
                  handleSquareDrop(square, piece);
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                const squareEl = target.closest("[data-square]");
                if (squareEl) {
                  const square = parseInt(
                    squareEl.getAttribute("data-square") || "0"
                  );
                  handleSquareClick(square);
                }
              }}
            >
              <Chessboard mode={moveMode} flipped={flipped} />
            </div>
          </div>
        </div>

        {/* Left sidebar - Pieces palette and controls */}
        <div className="flex flex-col gap-4 w-64">
          {/* Pieces palette */}
          <div className="flex gap-4">
            {/* White pieces */}
            <div className="flex flex-col gap-2">
              <div className="text-xs font-medium text-center">White</div>
              <div className="flex flex-col gap-1">
                {whitePieces.map((piece) => (
                  <PieceBox key={piece} piece={piece} />
                ))}
              </div>
            </div>

            {/* Black pieces */}
            <div className="flex flex-col gap-2">
              <div className="text-xs font-medium text-center">Black</div>
              <div className="flex flex-col gap-1">
                {blackPieces.map((piece) => (
                  <PieceBox key={piece} piece={piece as PieceSymbol} />
                ))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-2">
            <div className="text-xs font-medium">Board Controls</div>
            <Button 
              onClick={() => {
                setDeleteMode(!deleteMode);
                setSelectedPieceForPlacement(null);
                toast.info(deleteMode ? "Delete mode disabled" : "Delete mode enabled - click pieces to remove");
              }} 
              variant={deleteMode ? "destructive" : "outline"}
              size="sm" 
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteMode ? "Delete Mode: ON" : "Delete Mode"}
            </Button>
            <Button 
              onClick={() => setFlipped(!flipped)} 
              variant="outline" 
              size="sm" 
              className="w-full"
            >
              <FlipVertical className="h-4 w-4 mr-2" />
              Flip Board
            </Button>
            <Button 
              onClick={undoMove} 
              variant="outline" 
              size="sm" 
              className="w-full"
            >
              Undo Move
            </Button>
            <Button onClick={handleClearBoard} variant="destructive" size="sm" className="w-full">
              Clear Board
            </Button>
            <Button
              onClick={() => useGameStore.getState().newGame()}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Reset to Initial
            </Button>
            <Button onClick={handleExportBoard} variant="outline" size="sm" className="w-full">
              Export JSON
            </Button>
            <Button onClick={handleImportBoard} variant="outline" size="sm" className="w-full">
              Import JSON
            </Button>
            <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
              <p><strong>Placement:</strong></p>
              <p>• Click piece then click square</p>
              <p>• Or drag piece to square</p>
              <p><strong>Removal:</strong></p>
              <p>• Enable Delete Mode, then click piece</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
