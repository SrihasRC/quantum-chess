"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Header } from "@/components/layout/Header";
import { Chessboard } from "@/components/board/Chessboard";
import {
  MoveModSelector,
  type MoveMode,
} from "@/components/game/MoveModSelector";
import ImportBoardDialog from "@/components/sandbox/ImportBoardDialog";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/lib/store/gameStore";
import { createInitialBoardState, getPiecesAtSquare } from "@/lib/engine/state";
import type { PieceSymbol, SquareIndex } from "@/lib/types";
// import { indexToAlgebraic } from "@/lib/engine/utils";
import { toast } from "sonner";
import { FlipVertical, Trash2 } from "lucide-react";

const whitePieces: PieceSymbol[] = ["K", "Q", "R", "B", "N", "P"];
const blackPieces: (PieceSymbol | string)[] = ["k", "q", "r", "b", "n", "p"];

export default function SandboxPage() {
  const [selectedPieceForPlacement, setSelectedPieceForPlacement] =
    useState<PieceSymbol | null>(null);
  const [moveMode, setMoveMode] = useState<MoveMode>("classic");
  const [flipped, setFlipped] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const undoMove = useGameStore((state) => state.undoMove);

  // Enable sandbox mode on mount and initialize with empty board
  useEffect(() => {
    // Save the current game state before entering sandbox
    const currentState = useGameStore.getState();
    const savedBoard = currentState.board;
    const savedHistory = currentState.boardStateHistory;
    const savedMoves = currentState.moveHistory;
    const savedIndex = currentState.currentMoveIndex;
    
    // Initialize sandbox with standard starting position
    useGameStore.getState().newGame();
    useGameStore.setState({ sandboxMode: true });
    
    return () => {
      // Restore the saved state when leaving sandbox
      useGameStore.setState({ 
        sandboxMode: false,
        board: savedBoard,
        boardStateHistory: savedHistory,
        moveHistory: savedMoves,
        currentMoveIndex: savedIndex,
      });
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

      const color =
        selectedPieceForPlacement === selectedPieceForPlacement.toUpperCase()
          ? "white"
          : "black";
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

      setSelectedPieceForPlacement(null);
      return;
    }

    // Remove piece only if in delete mode
    if (deleteMode && piecesAtSquare.length > 0) {
      const pieceToRemove = piecesAtSquare[0];
      useGameStore.setState({
        board: {
          ...currentBoard,
          pieces: currentBoard.pieces.filter((p) => p.id !== pieceToRemove.id),
        },
        // Clear selection and legal moves when deleting a piece
        selectedSquare: null,
        legalMoves: [],
      });
      return;
    }

    // Disable delete mode if clicking on empty square
    if (deleteMode && piecesAtSquare.length === 0) {
      setDeleteMode(false);
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

  };

  const handleExportBoard = () => {
    const boardState = useGameStore.getState().board;
    const json = JSON.stringify(boardState, null, 2);
    navigator.clipboard.writeText(json);
    toast.success("Board state copied to clipboard");
  };

  const handleImportBoard = (json: string) => {
    try {
      const boardState = JSON.parse(json);
      // Reset history when importing to prevent undo issues
      useGameStore.setState({
        board: boardState,
        boardStateHistory: [boardState],
        moveHistory: [],
        currentMoveIndex: -1,
      });
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
        className={`cursor-pointer w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center border-2 rounded transition-all
          ${
            selectedPieceForPlacement === piece
              ? "border-primary bg-primary/20 scale-110"
              : "border-border bg-card hover:bg-accent hover:scale-105"
          }`}
        title={`Click to select or drag to place ${piece}`}
      >
        <Image
          src={pieceImages[piece]}
          alt={piece}
          width={32}
          height={32}
          className="select-none pointer-events-none w-8 h-8 sm:w-12 sm:h-12"
          draggable={false}
        />
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />

      {/* Main content */}
      <div className="flex-1 flex flex-col gap-3 p-2 overflow-auto sm:p-4 lg:flex-row lg:gap-4 lg:justify-center lg:items-center lg:overflow-hidden">
        {/* Board with move mode selector */}
        <div className="flex flex-col items-center justify-center order-1 lg:order-1">
          <div className="flex flex-col items-center gap-3 w-full sm:gap-4 md:flex-row md:gap-6">
            <div className="w-full shrink-0 md:w-auto">
              <MoveModSelector mode={moveMode} onModeChange={setMoveMode} />
            </div>
            <div
              className="w-full max-w-xl md:w-[min(90vh,90vw)]"
              onDrop={(e) => {
                e.preventDefault();
                const piece = e.dataTransfer.getData("piece") as PieceSymbol;
                if (!piece) return;

                const target = e.target as HTMLElement;
                const squareEl = target.closest("[data-square]");
                if (squareEl) {
                  const square = parseInt(
                    squareEl.getAttribute("data-square") || "0",
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
                    squareEl.getAttribute("data-square") || "0",
                  );
                  handleSquareClick(square);
                }
              }}
            >
              <Chessboard mode={moveMode} flipped={flipped} />
            </div>
          </div>
        </div>

        {/* Controls and pieces palette - stacked on mobile, side layout on desktop */}
        <div className="flex flex-col gap-3 order-2 sm:gap-4 lg:flex-row lg:order-2 lg:ml-8">
          {/* Pieces palette - horizontal scroll on mobile, columns on desktop */}
          <div className="flex flex-col m-auto gap-3 overflow-x-auto pb-2 sm:gap-4 lg:overflow-visible lg:pb-0 lg:flex-row">
            {/* White pieces */}
            <div className="flex flex-col gap-1.5 shrink-0 sm:gap-2">
              <div className="text-[10px] font-medium text-center sm:text-xs">
                White
              </div>
              <div className="flex flex-row gap-1 lg:flex-col">
                {whitePieces.map((piece) => (
                  <PieceBox key={piece} piece={piece} />
                ))}
              </div>
            </div>

            {/* Black pieces */}
            <div className="flex flex-col gap-1.5 shrink-0 sm:gap-2">
              <div className="text-[10px] font-medium text-center sm:text-xs">
                Black
              </div>
              <div className="flex flex-row gap-1 lg:flex-col">
                {blackPieces.map((piece) => (
                  <PieceBox key={piece} piece={piece as PieceSymbol} />
                ))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-1.5 sm:gap-2 lg:w-64">
            <div className="text-xs font-medium sm:text-sm">Board Controls</div>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-1">
              <Button
                onClick={() => {
                  setDeleteMode(!deleteMode);
                  setSelectedPieceForPlacement(null);
                  toast.info(
                    deleteMode
                      ? "Delete mode disabled"
                      : "Delete mode enabled - click pieces to remove",
                  );
                }}
                variant={deleteMode ? "destructive" : "outline"}
                size="sm"
                className="w-full hover:cursor-pointer hover:text-accent text-xs"
              >
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">
                  {deleteMode ? "Delete Mode: ON" : "Delete Mode"}
                </span>
              </Button>
              <Button
                onClick={() => setFlipped(!flipped)}
                variant="outline"
                size="sm"
                className="w-full hover:cursor-pointer hover:text-accent text-xs"
              >
                <FlipVertical className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Flip Board</span>
              </Button>
              <Button
                onClick={undoMove}
                variant="outline"
                size="sm"
                className="w-full hover:cursor-pointer hover:text-accent text-xs"
              >
                Undo
              </Button>
              <Button
                onClick={handleClearBoard}
                variant="destructive"
                size="sm"
                className="w-full hover:cursor-pointer hover:text-accent text-xs"
              >
                Clear
              </Button>
              <Button
                onClick={() => useGameStore.getState().newGame()}
                variant="outline"
                size="sm"
                className="w-full hover:cursor-pointer hover:text-accent text-xs"
              >
                Reset
              </Button>
              <Button
                onClick={handleExportBoard}
                variant="outline"
                size="sm"
                className="w-full hover:cursor-pointer hover:text-accent text-xs"
              >
                Export
              </Button>
              <Button
                onClick={() => setImportDialogOpen(true)}
                variant="outline"
                size="sm"
                className="w-full hover:cursor-pointer hover:text-accent text-xs"
              >
                Import
              </Button>
            </div>

            <div className="text-[10px] text-muted-foreground p-2 bg-muted rounded sm:text-xs lg:mt-2 lg:w-64">
              <p>
                <strong>Placement:</strong>
              </p>
              <p>• Click piece then click square</p>
              <p>• Or drag piece to square</p>
              <p>
                <strong>Removal:</strong>
              </p>
              <p>• Enable Delete Mode, then click piece</p>
            </div>
          </div>
        </div>
      </div>

      <ImportBoardDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImportBoard}
      />
    </div>
  );
}
