import { GameContainer } from '@/components/layout/GameContainer';
import { Chessboard } from '@/components/board/Chessboard';

export default function Home() {
  return (
    <GameContainer>
      <Chessboard />
    </GameContainer>
  );
}
