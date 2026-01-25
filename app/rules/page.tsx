import Link from "next/link";
import {
  Lightbulb,
  Target,
  Link2,
  Scale,
  Dices,
} from "lucide-react";
import { Header } from "@/components/layout/Header";

export default function RulesPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <Header />
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
        <div className="container mx-auto max-w-7xl">
          <div className="flex gap-4 md:gap-6 lg:gap-8">
            {/* Sidebar TOC - Hidden on mobile, fixed on desktop */}
            <aside className="hidden lg:block w-56 shrink-0 xl:w-64">
              <nav className="sticky top-24 space-y-1">
                <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                  On This Page
                </h2>
                <div className="space-y-1 text-sm border-l-2 border-border">
                  <a
                    href="#basic-rules"
                    className="block py-1.5 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-l-2 border-transparent hover:border-primary -ml-px"
                  >
                    Basic Rules
                  </a>
                  <a
                    href="#movement-types"
                    className="block py-1.5 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-l-2 border-transparent hover:border-primary -ml-px"
                  >
                    Movement Types
                  </a>
                  <a
                    href="#quantum-mechanics"
                    className="block py-1.5 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-l-2 border-transparent hover:border-primary -ml-px"
                  >
                    Quantum Mechanics
                  </a>
                  <a
                    href="#special-rules"
                    className="block py-1.5 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-l-2 border-transparent hover:border-primary -ml-px"
                  >
                    Special Rules
                  </a>
                  <a
                    href="#strategy-tips"
                    className="block py-1.5 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-l-2 border-transparent hover:border-primary -ml-px"
                  >
                    Strategy Tips
                  </a>
                  <a
                    href="#examples"
                    className="block py-1.5 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-l-2 border-transparent hover:border-primary -ml-px"
                  >
                    Quick Examples
                  </a>
                </div>
              </nav>
            </aside>
            {/* Main Content Area */}
            <div className="flex-1 min-w-0 max-w-3xl">
              <div className="space-y-8 sm:space-y-12">
                {/* Title */}
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tight">
                    Game Rules
                  </h1>
                  <p className="text-muted-foreground text-lg">
                    Learn how to play Quantum Chess with superposition and
                    entanglement
                  </p>
                </div>

              {/* Basic Rules */}
              <section id="basic-rules" className="space-y-4 scroll-mt-20">
                <h2 className="text-2xl font-semibold border-b pb-2">
                  Basic Rules
                </h2>
                <div className="space-y-3 text-sm leading-relaxed">
                  <p>
                    Quantum Chess follows standard chess rules with quantum
                    mechanics added. Pieces can exist in{" "}
                    <strong>superposition</strong> (multiple squares
                    simultaneously) and become <strong>entangled</strong> with
                    other pieces.
                  </p>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="font-medium">Win Condition</p>
                    <p className="text-muted-foreground">
                      Capture the opponent&apos;s king (reduce their king&apos;s
                      probability to 0%)
                    </p>
                  </div>
                </div>
              </section>

              {/* Movement Types */}
              <section id="movement-types" className="space-y-4 scroll-mt-20">
                <h2 className="text-2xl font-semibold border-b pb-2">
                  Movement Types
                </h2>

                {/* Normal Move */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                    Normal Move
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Standard chess movement. If piece is in superposition, it
                    will be <strong>measured</strong> at the source square
                    first.
                  </p>
                  <div className="bg-muted/30 rounded px-3 py-2 text-xs font-mono">
                    Example: 50% at e4, 50% at d4 → Click e4 → Measure (50%
                    success)
                  </div>
                </div>

                {/* Split Move */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-purple-500 rounded-full"></span>
                    Split Move (Quantum)
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Create superposition by splitting piece into two squares
                    simultaneously.
                  </p>
                  <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                    <li>
                      Select piece → Click Split button → Choose two target
                      squares
                    </li>
                    <li>Default: 50-50 split, or choose custom probability</li>
                    <li>
                      If blocker in path: Creates <strong>entanglement</strong>
                    </li>
                  </ul>
                </div>

                {/* Merge Move */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
                    Merge Move (Quantum)
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Combine two superposed copies of the same piece into one
                    square.
                  </p>
                  <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                    <li>Only works on pieces in superposition</li>
                    <li>
                      Select piece → Click Merge → Choose both source squares →
                      Choose target
                    </li>
                    <li>Must be valid move from both sources to target</li>
                  </ul>
                </div>

                {/* Capture */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                    Capture
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Capture opponent pieces. Special quantum rules apply:
                  </p>
                  <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                    <li>
                      <strong>Capture through superposition:</strong> If path
                      has blocker, <strong>measure blocker</strong> (not
                      entangle)
                    </li>
                    <li>
                      <strong>Pawn capture:</strong> Measure both attacker and
                      target before capture
                    </li>
                    <li>
                      <strong>Unitary capture:</strong> Removes target amplitude
                      without measuring it
                    </li>
                  </ul>
                </div>

                {/* Castling */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full"></span>
                    Castling
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    King and rook move simultaneously. Classical move only (no
                    splits).
                  </p>
                  <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                    <li>
                      King and rook must not have moved (even in superposition)
                    </li>
                    <li>
                      If pieces in path: <strong>measures</strong> to check if
                      clear
                    </li>
                    <li>
                      No &quot;check&quot; concept - can castle through attacked
                      squares
                    </li>
                    <li>Notation: O-O (kingside) or O-O-O (queenside)</li>
                  </ul>
                </div>

                {/* En Passant */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-orange-500 rounded-full"></span>
                    En Passant
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Special pawn capture. Works even with superposed pawns.
                  </p>
                  <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                    <li>Available after opponent pawn moves two squares</li>
                    <li>Captures as if pawn only moved one square</li>
                    <li>Superposed attacking pawn: Measures before capture</li>
                    <li>One-turn window (must use immediately)</li>
                  </ul>
                </div>

                {/* Promotion */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-cyan-500 rounded-full"></span>
                    Pawn Promotion
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    When pawn reaches opposite end, choose Queen, Rook, Bishop,
                    or Knight.
                  </p>
                  <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                    <li>Superposed pawn: Measures at source first</li>
                    <li>With capture: Measures both attacker and target</li>
                    <li>Can only promote to Q, R, B, or N</li>
                  </ul>
                </div>
              </section>

              {/* Quantum Mechanics */}
              <section
                id="quantum-mechanics"
                className="space-y-4 scroll-mt-20"
              >
                <h2 className="text-2xl font-semibold border-b pb-2">
                  Quantum Mechanics
                </h2>

                {/* Superposition */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Superposition</h3>
                  <p className="text-sm text-muted-foreground">
                    A piece exists at multiple squares with different
                    probabilities. All probabilities sum to 100%.
                  </p>
                  <div className="bg-muted/30 rounded px-3 py-2 text-xs space-y-1">
                    <p className="font-mono">Queen: 25% e4, 75% a4</p>
                    <p className="text-muted-foreground">
                      Total: 25% + 75% = 100% ✓
                    </p>
                  </div>
                </div>

                {/* Measurement */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Measurement</h3>
                  <p className="text-sm text-muted-foreground">
                    When a superposed piece is measured, it collapses to one
                    location based on probabilities.
                  </p>
                  <ul className="text-sm space-y-1 ml-4 list-disc text-muted-foreground">
                    <li>Triggered by: Normal moves, captures, promotions</li>
                    <li>Random outcome weighted by probabilities</li>
                    <li>
                      If measurement fails: Turn lost, piece renormalizes to
                      other positions
                    </li>
                    <li>If entangled: All entangled pieces update</li>
                  </ul>
                </div>

                {/* Entanglement */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Entanglement</h3>
                  <p className="text-sm text-muted-foreground">
                    When pieces&apos; states become correlated. Measuring one
                    affects the other.
                  </p>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">Created by:</p>
                    <ul className="space-y-1 ml-4 list-disc text-muted-foreground">
                      <li>
                        <strong>Split through blocker:</strong> Queen splits but
                        path blocked → Entangle with blocker
                      </li>
                      <li>
                        <strong>Move through superposition:</strong> Move
                        through square where piece might be
                      </li>
                    </ul>
                    <p className="font-medium mt-3">Effects:</p>
                    <ul className="space-y-1 ml-4 list-disc text-muted-foreground">
                      <li>Pieces share joint probability distribution</li>
                      <li>Measuring one piece updates all entangled pieces</li>
                      <li>Probabilities become conditional on each other</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Special Rules */}
              <section id="special-rules" className="space-y-4 scroll-mt-20">
                <h2 className="text-2xl font-semibold border-b pb-2">
                  Special Rules
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 bg-muted/30 rounded-lg p-4">
                    <h3 className="font-medium text-sm">
                      Pawn Diagonal Movement
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Pawns can ONLY move diagonally when capturing. No diagonal
                      moves to empty squares.
                    </p>
                  </div>

                  <div className="space-y-2 bg-muted/30 rounded-lg p-4">
                    <h3 className="font-medium text-sm">No Check Concept</h3>
                    <p className="text-xs text-muted-foreground">
                      No &quot;check&quot; or &quot;checkmate&quot;. Kings can
                      move into attacked squares. Win by capturing
                      opponent&apos;s king.
                    </p>
                  </div>

                  <div className="space-y-2 bg-muted/30 rounded-lg p-4">
                    <h3 className="font-medium text-sm">
                      Probability Conservation
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Each piece&apos;s probabilities always sum to 100%. This
                      is maintained through all operations.
                    </p>
                  </div>

                  <div className="space-y-2 bg-muted/30 rounded-lg p-4">
                    <h3 className="font-medium text-sm">Castling Rights</h3>
                    <p className="text-xs text-muted-foreground">
                      ANY move involving king or rook invalidates castling, even
                      if the piece doesn&apos;t actually move.
                    </p>
                  </div>
                </div>
              </section>

              {/* Strategy Tips */}
              <section id="strategy-tips" className="space-y-4 scroll-mt-20">
                <h2 className="text-2xl font-semibold border-b pb-2">
                  Strategy Tips
                </h2>

                <div className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                      <Lightbulb className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium">
                        Use Split to Create Uncertainty
                      </p>
                      <p className="text-muted-foreground">
                        Split your pieces to make it harder for opponent to
                        capture them
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                      <Target className="h-4 w-4 text-red-500" />
                    </div>
                    <div>
                      <p className="font-medium">Force Measurements</p>
                      <p className="text-muted-foreground">
                        Attack superposed pieces to force opponent to measure
                        and potentially lose their turn
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                      <Link2 className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium">Control Entanglements</p>
                      <p className="text-muted-foreground">
                        Entangled pieces move together. Use this to coordinate
                        attacks or defenses
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                      <Scale className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium">Balance Risk vs Reward</p>
                      <p className="text-muted-foreground">
                        Lower probability positions are riskier but can surprise
                        opponents
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                      <Dices className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium">Track Probabilities</p>
                      <p className="text-muted-foreground">
                        Always know where your pieces are most likely to be. The
                        UI shows percentages.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Examples */}
              <section id="examples" className="space-y-4 scroll-mt-20">
                <h2 className="text-2xl font-semibold border-b pb-2">
                  Quick Examples
                </h2>

                <div className="space-y-4">
                  <div className="border rounded-lg p-4 space-y-2">
                    <h3 className="font-medium text-sm">
                      Example 1: Basic Split
                    </h3>
                    <div className="text-xs space-y-1 font-mono bg-muted/30 p-3 rounded">
                      <p>1. Queen at e2 (100%)</p>
                      <p>2. Split → e4 (50%) + e6 (50%)</p>
                      <p>3. Result: Queen at 50% e4, 50% e6</p>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 space-y-2">
                    <h3 className="font-medium text-sm">
                      Example 2: Entanglement
                    </h3>
                    <div className="text-xs space-y-1 font-mono bg-muted/30 p-3 rounded">
                      <p>1. Queen: 50% c2, 50% d2</p>
                      <p>2. Pawn: 50% d3, 50% d4</p>
                      <p>3. Split queen c2 → e4 + a4 (d3 blocks e4)</p>
                      <p>4. Queen and pawn become entangled!</p>
                      <p>5. Measure queen → Updates pawn probabilities</p>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 space-y-2">
                    <h3 className="font-medium text-sm">
                      Example 3: Measurement
                    </h3>
                    <div className="text-xs space-y-1 font-mono bg-muted/30 p-3 rounded">
                      <p>1. Rook: 30% a1, 70% h1</p>
                      <p>2. Attempt move from a1 → a3</p>
                      <p>3. Measure at a1: 30% success</p>
                      <p>4a. Success → Rook moves to a3 (100%)</p>
                      <p>4b. Fail → Rook stays at h1 (100%), turn lost</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Footer */}
              <div className="border-t pt-6 pb-12">
                <div className="text-center space-y-2">
                  <Link
                    href="/"
                    className="inline-block text-sm text-primary hover:underline"
                  >
                    Start Playing →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
