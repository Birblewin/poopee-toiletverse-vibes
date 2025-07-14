
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UnifiedUser } from "@/hooks/useUnifiedAuth";
import { useState } from "react";

interface MissPoopeeManGameAreaProps {
  user: UnifiedUser;
  currentCredits: number;
}

export const MissPoopeeManGameArea = ({ user, currentCredits }: MissPoopeeManGameAreaProps) => {
  const [gameStarted, setGameStarted] = useState(false);
  const canPlay = currentCredits >= 1;

  const handleStartGame = () => {
    if (!canPlay) return;
    setGameStarted(true);
    // Game logic will be implemented in future phases
  };

  return (
    <Card className="bg-gray-900/50 border-gray-700 h-full">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <span className="text-2xl">👾</span>
          Miss POOPEE-Man Game
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="min-h-[400px] bg-black border border-gray-600 rounded-lg flex items-center justify-center">
          {!gameStarted ? (
            <div className="text-center space-y-4">
              <div className="text-6xl mb-4">👾</div>
              <h3 className="text-2xl font-bold text-white">Coming Soon!</h3>
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
            <div className="text-center">
              <div className="text-4xl mb-4">🚧</div>
              <p className="text-white">Game engine loading...</p>
              <p className="text-gray-400 text-sm mt-2">Game implementation coming in next phase</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
