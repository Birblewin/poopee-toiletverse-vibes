
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UnifiedUser } from "@/hooks/useUnifiedAuth";
import { useState } from "react";
import { MissPacManGame } from "./game/MissPacManGame";

interface MissPoopeeManGameAreaProps {
  user: UnifiedUser;
  currentCredits: number;
  onGameEnd: (score: number, duration: number) => void;
  onGameStart: () => void;
}

export const MissPoopeeManGameArea = ({ 
  user, 
  currentCredits, 
  onGameEnd, 
  onGameStart 
}: MissPoopeeManGameAreaProps) => {
  const [gameStarted, setGameStarted] = useState(false);
  const canPlay = currentCredits >= 1;

  const handleStartGame = () => {
    if (!canPlay) return;
    onGameStart();
    setGameStarted(true);
  };

  const handleGameEnd = (score: number, duration: number) => {
    console.log('Game ended with score:', score, 'duration:', duration);
    setGameStarted(false);
    onGameEnd(score, duration);
  };

  return (
    <Card className="bg-gray-900/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <span className="text-2xl">👾</span>
          Miss POOPEE-Man Game
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="w-full h-[600px] bg-black rounded-b-lg flex items-center justify-center overflow-hidden">
          {!gameStarted ? (
            <div className="text-center space-y-4 p-8">
              <div className="text-6xl mb-4">👾</div>
              <h3 className="text-2xl font-bold text-white">Miss POOPEE-Man</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Navigate the maze as Miss POOPEE-Man! Collect 💩 pellets, avoid ghosts, 
                and use power-ups to turn the tables on your enemies.
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">Game Features:</p>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Classic maze gameplay with a POOPEE twist</li>
                  <li>• Collect 💩 pellets for points</li>
                  <li>• Power-ups make ghosts vulnerable</li>
                  <li>• Mobile-friendly touch controls</li>
                  <li>• Earn credits based on performance</li>
                </ul>
              </div>
              <Button 
                onClick={handleStartGame}
                disabled={!canPlay}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {canPlay ? "Start Game (1 Credit)" : `Need ${(1 - currentCredits).toFixed(2)} More Credits`}
              </Button>
              {!canPlay && (
                <p className="text-sm text-red-400">
                  You need at least 1 credit to play!
                </p>
              )}
            </div>
          ) : (
            <div className="w-full h-full">
              <MissPacManGame
                user={user}
                onGameEnd={handleGameEnd}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
