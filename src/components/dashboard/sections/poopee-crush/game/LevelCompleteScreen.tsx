
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LevelCompleteScreenProps {
  level: number;
  score: number;
  stars: number;
  onContinue: () => void;
  onRestart: () => void;
  onQuit: () => void;
}

export const LevelCompleteScreen = ({ 
  level, 
  score, 
  stars, 
  onContinue, 
  onRestart, 
  onQuit 
}: LevelCompleteScreenProps) => {
  const renderStars = () => {
    return Array.from({ length: 3 }, (_, i) => (
      <span 
        key={i} 
        className={`text-3xl ${i < stars ? 'text-yellow-400' : 'text-gray-600'}`}
      >
        ⭐
      </span>
    ));
  };

  const getScoreMessage = () => {
    if (stars === 3) return "Perfect! Outstanding performance!";
    if (stars === 2) return "Great job! Well done!";
    if (stars === 1) return "Good work! You completed the level!";
    return "Level completed!";
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <Card className="bg-gray-900 border-gray-600 max-w-md w-full mx-4">
        <CardContent className="p-8 text-center space-y-6">
          {/* Celebration Header */}
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-yellow-400">
              🎉 Level Complete! 🎉
            </h2>
            <p className="text-xl text-white">Level {level}</p>
          </div>

          {/* Star Rating */}
          <div className="space-y-2">
            <div className="flex justify-center space-x-1">
              {renderStars()}
            </div>
            <p className="text-green-400 font-semibold">{getScoreMessage()}</p>
          </div>

          {/* Score Display */}
          <div className="bg-gray-800 rounded-lg p-4 space-y-2">
            <div className="text-2xl font-bold text-white">
              {score.toLocaleString()} points
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={onContinue} 
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
              size="lg"
            >
              Continue to Level {level + 1} 🚀
            </Button>
            
            <div className="flex space-x-2">
              <Button 
                onClick={onRestart} 
                variant="outline" 
                className="flex-1"
              >
                Replay Level
              </Button>
              <Button 
                onClick={onQuit} 
                variant="destructive" 
                className="flex-1"
              >
                Quit Game
              </Button>
            </div>
          </div>

          {/* Bonus Message */}
          {stars === 3 && (
            <div className="text-yellow-400 text-sm animate-pulse">
              🏆 Perfect score bonus applied! 🏆
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
