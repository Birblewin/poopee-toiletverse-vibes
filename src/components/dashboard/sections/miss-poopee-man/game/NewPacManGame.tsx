
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSpendCredits, useEarnCredits } from '@/hooks/useCreditOperations';
import { useCreateGameSession } from '@/hooks/useGameSessions';
import { UnifiedUser } from '@/hooks/useUnifiedAuth';
import { useToast } from '@/hooks/use-toast';
import { GameEngine, GameState, DIRECTIONS, MAZE_WIDTH, MAZE_HEIGHT, CELL_SIZE } from './GameEngine';
import { GameRenderer } from './GameRenderer';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface NewPacManGameProps {
  user: UnifiedUser;
  onGameEnd: (score: number, duration: number) => void;
}

export const NewPacManGame = ({ user, onGameEnd }: NewPacManGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const gameRendererRef = useRef<GameRenderer | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isGameActive, setIsGameActive] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  
  const spendCredits = useSpendCredits();
  const earnCredits = useEarnCredits();
  const createGameSession = useCreateGameSession();
  const { toast } = useToast();

  // Initialize canvas and renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      console.log('🎮 Initializing canvas and renderer...');
      
      // Initialize game engine and renderer
      gameEngineRef.current = new GameEngine();
      gameRendererRef.current = new GameRenderer(canvas);
      
      // Get initial game state
      const initialState = gameEngineRef.current.getGameState();
      setGameState(initialState);
      setEngineReady(true);
      
      // Initial render
      gameRendererRef.current.render(initialState);
      
      console.log('✅ Game initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize game:', error);
      setEngineReady(false);
      toast({
        title: "Game Error",
        description: "Failed to initialize the game. Please try again.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (!gameEngineRef.current || !gameRendererRef.current || !isGameActive) return;
    
    const engine = gameEngineRef.current;
    const renderer = gameRendererRef.current;
    
    engine.update();
    const currentState = engine.getGameState();
    setGameState(currentState);
    
    renderer.render(currentState);
    
    // Check for game end conditions
    if (currentState.gameStatus === 'gameOver' || currentState.gameStatus === 'levelComplete') {
      handleGameEnd(currentState, engine.getGameDuration());
      return;
    }
    
    if (currentState.gameStatus === 'playing') {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  }, [isGameActive]);

  // Start new game
  const startGame = useCallback(async () => {
    if (!engineReady || !gameEngineRef.current || !gameRendererRef.current) {
      toast({
        title: "Game Not Ready",
        description: "Please wait for the game to initialize",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('🎮 Starting Miss POOPEE-Man game...');
      
      // Spend credits first
      await spendCredits.mutateAsync({
        userId: user.id,
        amount: 1,
        description: "Miss POOPEE-Man game entry fee"
      });

      // Reset and start game
      gameEngineRef.current.reset();
      gameEngineRef.current.startGame();
      
      const initialState = gameEngineRef.current.getGameState();
      setGameState(initialState);
      setIsGameActive(true);
      setGameStarted(true);
      startTimeRef.current = Date.now();
      
      // Start game loop
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      
      toast({
        title: "Game Started!",
        description: "Use arrow keys or WASD to control Miss POOPEE-Man"
      });
    } catch (error: any) {
      console.error('❌ Failed to start game:', error);
      toast({
        title: "Cannot Start Game",
        description: error.message || "Failed to start game",
        variant: "destructive"
      });
    }
  }, [user.id, spendCredits, gameLoop, engineReady, toast]);

  // Handle game end
  const handleGameEnd = useCallback(async (finalState: GameState, duration: number) => {
    if (!gameEngineRef.current) return;
    
    setIsGameActive(false);
    setGameStarted(false);
    
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    
    const durationSeconds = Math.floor(duration / 1000);
    const creditsEarned = Math.floor(finalState.score / 100);
    
    try {
      // Record game session
      await createGameSession.mutateAsync({
        user_id: user.id,
        score: finalState.score,
        duration_seconds: durationSeconds,
        credits_spent: 1,
        credits_earned: creditsEarned,
        pipes_passed: 0,
        metadata: {
          game_type: 'miss_poopee_man',
          lives_remaining: finalState.lives,
          level: finalState.level,
          pellets_collected: finalState.pellets.collected,
          level_completed: finalState.gameStatus === 'levelComplete'
        }
      });

      // Award credits
      if (creditsEarned > 0) {
        await earnCredits.mutateAsync({
          userId: user.id,
          amount: creditsEarned,
          description: `Miss POOPEE-Man completed - Level ${finalState.level}, Score ${finalState.score}`,
        });
      }

      const gameResult = finalState.gameStatus === 'levelComplete' ? 'Level Complete!' : 'Game Over!';
      toast({
        title: gameResult,
        description: `Score: ${finalState.score}${creditsEarned > 0 ? ` | Earned ${creditsEarned} credits` : ''}`
      });

      onGameEnd(finalState.score, durationSeconds);
    } catch (error) {
      console.error('❌ Error recording game session:', error);
      toast({
        title: "Error",
        description: "Failed to save game results",
        variant: "destructive"
      });
    }
  }, [user.id, createGameSession, earnCredits, onGameEnd, toast]);

  // Pause/Resume game
  const togglePause = useCallback(() => {
    if (!gameEngineRef.current) return;
    
    if (gameState?.gameStatus === 'playing') {
      gameEngineRef.current.pauseGame();
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    } else if (gameState?.gameStatus === 'paused') {
      gameEngineRef.current.resumeGame();
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  }, [gameState, gameLoop]);

  // End game manually
  const endGame = useCallback(() => {
    if (!gameEngineRef.current || !gameState) return;
    
    const duration = gameEngineRef.current.getGameDuration();
    handleGameEnd({ ...gameState, gameStatus: 'gameOver' }, duration);
  }, [gameState, handleGameEnd]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isGameActive || !gameEngineRef.current) return;

      const engine = gameEngineRef.current;
      
      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          event.preventDefault();
          engine.setPlayerDirection(DIRECTIONS.UP);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          event.preventDefault();
          engine.setPlayerDirection(DIRECTIONS.DOWN);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          event.preventDefault();
          engine.setPlayerDirection(DIRECTIONS.LEFT);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          event.preventDefault();
          engine.setPlayerDirection(DIRECTIONS.RIGHT);
          break;
        case ' ':
          event.preventDefault();
          togglePause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isGameActive, togglePause]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (gameRendererRef.current) {
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.width = MAZE_WIDTH * CELL_SIZE;
          canvas.height = MAZE_HEIGHT * CELL_SIZE;
          
          // Re-render current state
          if (gameState) {
            gameRendererRef.current.render(gameState);
          }
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [gameState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  if (!gameStarted) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Card className="bg-gray-800/90 border-gray-700 w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-center gap-2">
              <span className="text-2xl">👾</span>
              Miss POOPEE-Man
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-6xl mb-4">🎮</div>
              <h3 className="text-xl font-bold text-white mb-2">Ready to Play?</h3>
              <p className="text-gray-400 mb-4">
                Navigate the maze, collect pellets, and avoid the ghosts!
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Use arrow keys or WASD to move • Spacebar to pause
              </p>
              <Button 
                onClick={startGame}
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={!engineReady || spendCredits.isPending}
              >
                {spendCredits.isPending ? 'Starting...' : 
                 !engineReady ? 'Loading...' : 'Start Game (1 Credit)'}
              </Button>
            </div>
            
            <div className="text-xs text-gray-500 space-y-1">
              <p>• Collect all pellets to complete the level</p>
              <p>• Eat 💩 power pellets to turn ghosts blue</p>
              <p>• Earn 1 credit per 100 points scored</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <Card className="bg-gray-800/90 border-gray-700 w-full max-w-fit">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-2xl">👾</span>
              Miss POOPEE-Man
            </span>
            <div className="flex gap-2">
              <Button
                onClick={togglePause}
                variant="outline"
                size="sm"
                className="text-white border-gray-600 hover:bg-gray-700"
              >
                {gameState?.gameStatus === 'paused' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
              <Button
                onClick={endGame}
                variant="outline"
                size="sm"
                className="text-white border-gray-600 hover:bg-gray-700"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex justify-center items-center bg-black rounded-lg p-4 relative">
            <canvas
              ref={canvasRef}
              className="border border-gray-600 rounded"
              style={{ 
                imageRendering: 'pixelated',
                width: `${MAZE_WIDTH * CELL_SIZE}px`,
                height: `${MAZE_HEIGHT * CELL_SIZE}px`
              }}
            />
            
            {gameState?.gameStatus === 'paused' && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <div className="text-white text-2xl font-bold">PAUSED</div>
              </div>
            )}
          </div>
          
          <div className="mt-4 text-center text-sm text-gray-400">
            <p>Use arrow keys or WASD to move • Spacebar to pause</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
