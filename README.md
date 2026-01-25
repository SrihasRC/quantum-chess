# Quantum Chess

A revolutionary chess implementation where quantum mechanics meets the game of kings. Experience superposition, probability, and entanglement in real-time multiplayer chess.

## ✨ Features

### 🎮 Game Modes
- **Multiplayer**: Real-time online matches using Supabase Realtime
- **Local Game**: Play against computer or pass-and-play
- **Sandbox**: Experiment with custom positions and quantum mechanics

### ⚛️ Quantum Mechanics
- **Superposition**: Split pieces to exist in multiple squares simultaneously
- **Probability**: Captures succeed based on quantum uncertainty
- **Measurement**: Collapse superpositions to definite states
- **Entanglement**: Pieces become correlated across the board

### 🎯 Game Features
- Full chess rules with quantum extensions
- Real-time move synchronization
- Sound effects (move and capture)
- Visual feedback (last move, failed captures)
- Probability indicators
- Split and merge move modes
- Keyboard shortcuts

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- A Supabase account (for multiplayer features)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd quantum-chess
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. For multiplayer, follow the [Multiplayer Setup Guide](MULTIPLAYER_SETUP.md)

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## 📖 How to Play

### Basic Controls
- **Click** to select and move pieces
- **Shift + Click** for split moves (create superposition)
- **Ctrl/Cmd + Click** for merge moves (collapse superposition)

### Game Modes
1. **Normal Move**: Standard chess move with quantum probabilities
2. **Split Move**: Create superposition - piece exists in two places
3. **Merge Move**: Collapse superposition back to single state

### Winning
Capture the opponent's king with 100% certainty. Failed captures return the piece to its original position.

## 🏗️ Project Structure

```
quantum-chess/
├── app/
│   ├── page.tsx              # Landing page
│   ├── local/                # Local game mode
│   ├── multiplayer/          # Multiplayer lobby and games
│   └── sandbox/              # Sandbox mode
├── components/
│   ├── board/                # Chess board components
│   ├── game/                 # Game controls
│   ├── layout/               # Layout components
│   └── ui/                   # UI primitives
├── lib/
│   ├── engine/               # Game logic
│   │   ├── board.ts          # Board state
│   │   ├── moves.ts          # Move generation
│   │   ├── quantum.ts        # Quantum mechanics
│   │   └── validation.ts     # Move validation
│   ├── store/                # State management
│   │   ├── gameStore.ts      # Game state
│   │   └── multiplayerStore.ts # Multiplayer state
│   ├── supabase/             # Supabase client
│   ├── types/                # TypeScript types
│   └── utils/                # Utilities
├── supabase/
│   └── schema.sql            # Database schema
└── ref/                      # Reference documents
    ├── RULES.md              # Game rules
    └── LEARNING_GUIDE.md     # Learning resource
```

## 🎓 Learning Resources

- **[Learning Guide](LEARNING_GUIDE.md)**: Comprehensive 8-week curriculum
- **[Game Rules](ref/RULES.md)**: Detailed quantum chess rules
- **[Multiplayer Setup](MULTIPLAYER_SETUP.md)**: How to enable online play

## 🔧 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **State Management**: Zustand
- **Database**: Supabase (PostgreSQL + Realtime)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Audio**: Web Audio API

## 🌐 Multiplayer Architecture

The multiplayer system uses Supabase Realtime for instant synchronization:

1. **Game Creation**: Creates entry in Supabase, generates unique game ID
2. **Real-time Sync**: WebSocket connection via Supabase Realtime
3. **Move Broadcasting**: Moves instantly propagated to all clients
4. **State Management**: Optimistic updates with server reconciliation

See [MULTIPLAYER_SETUP.md](MULTIPLAYER_SETUP.md) for detailed setup instructions.

## 🎮 Keyboard Shortcuts

- `Shift`: Hold for split move mode
- `Ctrl/Cmd`: Hold for merge move mode
- (More shortcuts coming soon!)

## 📝 Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
npm start
```

### Linting
```bash
npm run lint
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Inspired by quantum mechanics principles
- Built with modern web technologies
- Special thanks to the Next.js and Supabase teams

## 📬 Contact

For questions or feedback, please open an issue on GitHub.

---

**Note**: This is a demonstration project combining chess with quantum mechanics concepts. The quantum behavior is simulated and doesn't represent actual quantum computing.
