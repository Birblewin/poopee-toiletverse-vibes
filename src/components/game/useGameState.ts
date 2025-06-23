
import { useState, useCallback, useEffect } from 'react';

export type GameState = 'menu' | 'starting' | 'playing' | 'gameOver';
export type GameSpeed = 'beginner' | 'moderate' | 'advanced';

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [score, setScore] = useState(0);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [purchasedShields, setPurchasedShields] = useState(0);
  const [gameSpeed, setGameSpeed] = useState<GameSpeed>('moderate');
  const [countdown, setCountdown] = useState(0);

  // Always start with 3 base shields + any purchased shields
  const totalShields = 3 + purchasedShields;

  console.log("🛡️ useGameState: totalShields calculated as:", totalShields, "(base: 3 + purchased:", purchasedShields, ")");

  const startGame = useCallback(() => {
    console.log("🎮 Starting game with shields:", totalShields, "and speed:", gameSpeed);
    setGameState('starting');
    setScore(0);
    setCountdown(3);
    
    // Countdown timer
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setGameState('playing');
          setGameStartTime(Date.now());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [totalShields, gameSpeed]);

  const endGame = useCallback(() => {
    console.log("🏁 Game ended");
    setGameState('gameOver');
  }, []);

  const resetGame = useCallback(() => {
    console.log("🔄 Resetting game to fresh state");
    setGameState('menu');
    setScore(0);
    setCountdown(0);
    // CRITICAL: Reset purchased shields to 0 when resetting game
    console.log("🔄 Clearing purchased shields from", purchasedShields, "to 0");
    setPurchasedShields(0);
    // Keep speed setting when resetting
    console.log("🔄 Game reset complete - shields back to 3, speed remains:", gameSpeed);
  }, [gameSpeed, purchasedShields]);

  const buyShields = useCallback(() => {
    const newPurchasedShields = purchasedShields + 3;
    console.log("💰 useGameState: Shields purchased - updating from", totalShields, "to", 3 + newPurchasedShields);
    setPurchasedShields(newPurchasedShields);
  }, [purchasedShields, totalShields]);

  const changeSpeed = useCallback((newSpeed: GameSpeed) => {
    console.log("🏃 Speed changed from", gameSpeed, "to", newSpeed);
    setGameSpeed(newSpeed);
  }, [gameSpeed]);

  return {
    gameState,
    score,
    setScore,
    gameStartTime,
    purchasedShields,
    totalShields,
    gameSpeed,
    countdown,
    startGame,
    endGame,
    resetGame,
    buyShields,
    changeSpeed
  };
};
