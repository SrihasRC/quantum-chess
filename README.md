# Quantum Chess ⚛️♟️

A revolutionary chess implementation where quantum mechanics meets the game of kings. Experience chess with superposition, probability, and entanglement in real-time multiplayer battles.

## 🎮 About the Game

Quantum Chess reimagines traditional chess by introducing quantum mechanical principles to gameplay. Pieces can exist in multiple positions simultaneously through superposition, captures succeed based on quantum probability, and pieces can become entangled across the board. The game maintains strategic depth while adding new dimensions of uncertainty and tactical possibilities.

## ⚛️ Quantum Mechanics

### Superposition
Split your pieces to exist in multiple squares simultaneously. Create tactical ambiguity and control more of the board with quantum superposition states.

### Probability-Based Captures
Captures are no longer deterministic. Success depends on quantum uncertainty - a piece in superposition has reduced capture probability. Failed captures return the attacking piece to its original position.

### Measurement & Collapse
When superpositions are measured (through captures or merge moves), they collapse to definite states based on probability distributions. This creates dynamic, unpredictable gameplay.

### Entanglement
Pieces can become quantum-mechanically correlated, where the state of one piece affects the other across the board, opening unique strategic opportunities.

## ✨ Features

**Game Modes**
- **Multiplayer**: Real-time online matches with live synchronization
- **Local Game**: Play against computer or pass-and-play with a friend
- **Sandbox**: Experiment with custom positions and quantum mechanics

**Core Features**
- Full chess rules with quantum extensions
- Real-time move synchronization via WebSockets
- Sound effects for moves and captures
- Visual feedback for last move and failed captures
- Probability indicators showing capture success chance
- Three move modes: Classic, Split (superposition), and Merge (collapse)
- Navigation guard to prevent accidental game abandonment
- Turn-based validation and game state management

## 🔧 Tech Stack

**Frontend Framework**
- Next.js 16
- TypeScript for type safety
- Tailwind CSS for styling
- shadcn/ui for UI components

**State Management**
- Zustand for global state management
- React hooks for component-level state

**Backend & Database**
- Supabase (PostgreSQL) for game data persistence
- Supabase Realtime for WebSocket-based live synchronization
- Row Level Security (RLS) policies for data access control

**Audio & Assets**
- Web Audio API for sound effects
- Custom SVG pieces and animations

**Architecture**
- Optimistic updates with server reconciliation
- Real-time event broadcasting
- Client-side game engine with server validation
- Persistent game state across browser sessions

---

**Note**: This is a creative demonstration project that simulates quantum mechanics concepts in a chess environment. The quantum behavior is algorithmically simulated and doesn't represent actual quantum computing or quantum physics calculations.
