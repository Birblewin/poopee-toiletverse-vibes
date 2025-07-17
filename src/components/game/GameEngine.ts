import { GamePhysics, HippoState } from './engine/GamePhysics';
import { GameRenderer } from './engine/GameRenderer';
import { CollisionDetector, Pipe, Missile } from './engine/CollisionDetector';
import { GameObjectManager } from './engine/GameObjectManager';
import type { GameSpeed } from './useGameState';

// Miss POOPEE-Man game types
export interface PacManState {
  x: number;
  y: number;
  width: number;
  height: number;
  direction: 'up' | 'down' | 'left' | 'right';
  nextDirection: 'up' | 'down' | 'left' | 'right' | null;
  gridX: number;
  gridY: number;
}

export interface Ghost {
  x: number;
  y: number;
  width: number;
  height: number;
  gridX: number;
  gridY: number;
  direction: 'up' | 'down' | 'left' | 'right';
  color: string;
  isVulnerable: boolean;
  isBlinking: boolean;
  ai: 'chase' | 'scatter' | 'flee';
  isInBox?: boolean;
  releaseTimer?: number;
  homeX?: number;
  homeY?: number;
  mode: 'chase' | 'scatter' | 'frightened' | 'eaten';
  modeTimer: number;
  targetX?: number;
  targetY?: number;
}

export interface Pellet {
  x: number;
  y: number;
  gridX: number;
  gridY: number;
  isPowerPellet: boolean;
  collected: boolean;
}

export type GameMode = 'flappy_hippos' | 'miss_poopee_man';

export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private physics: GamePhysics;
  private renderer: GameRenderer;
  private collisionDetector: CollisionDetector;
  private objectManager: GameObjectManager;
  private gameMode: GameMode;

  // Flappy Hippos game state
  private hippo: HippoState;
  private pipes: Pipe[] = [];
  private missiles: Missile[] = [];
  
  // Miss POOPEE-Man game state
  private pacman: PacManState;
  private ghosts: Ghost[] = [];
  private pellets: Pellet[] = [];
  private maze: number[][] = [];
  private vulnerabilityTimer = 0;
  private blinkTimer = 0;
  private cellSize = 20;
  private keys: { [key: string]: boolean } = {};
  
  // Movement timing for Miss POOPEE-Man
  private moveTimer = 0;
  private framesBetweenMoves = 8;
  private ghostMoveTimer = 0;
  private framesBetweenGhostMoves = 10;
  
  // Game mode switching timer for ghosts
  private globalModeTimer = 0;
  private currentGlobalMode: 'chase' | 'scatter' = 'scatter';
  
  // Miss POOPEE-Man specific game state
  private lives = 3;
  private level = 1;
  private invulnerabilityTimer = 0;
  
  private gameRunning = false;
  private animationId: number | null = null;
  private score = 0;
  private pipesPassedCount = 0;
  private eventListeners: (() => void)[] = [];
  
  private pipeHitsRemaining = 3;
  private maxShields = 3;
  private invincibilityTime = 0;
  private hitEffectTime = 0;
  private gameStartTime = 0;
  private lastMissileTime = 0;
  private missileWarningTime = 0;
  private gameSpeed: GameSpeed = 'moderate';
  
  private onGameEnd: (score: number, pipesPassedCount: number, duration: number) => void;
  private onScoreUpdate: (score: number) => void;

  constructor(
    context: CanvasRenderingContext2D, 
    canvasElement: HTMLCanvasElement,
    onGameEnd: (score: number, pipesPassedCount: number, duration: number) => void,
    onScoreUpdate: (score: number) => void,
    gameMode: GameMode = 'flappy_hippos'
  ) {
    this.ctx = context;
    this.canvas = canvasElement;
    this.onGameEnd = onGameEnd;
    this.onScoreUpdate = onScoreUpdate;
    this.gameMode = gameMode;
    
    // Initialize modules
    this.physics = new GamePhysics();
    this.renderer = new GameRenderer(context, canvasElement, gameMode);
    this.collisionDetector = new CollisionDetector();
    this.objectManager = new GameObjectManager(canvasElement);
    
    this.reset();
    this.bindEvents();
    this.render();
    console.log("🎮 Game engine initialized successfully for mode:", gameMode);
  }

  private getSpeedMultiplier(): number {
    switch (this.gameSpeed) {
      case 'beginner': return 0.75; // 3px per frame (slower than original)
      case 'moderate': return 1.5; // 6px per frame (original fast pace)
      case 'advanced': return 2.25; // 9px per frame (very fast)
      default: return 1.5;
    }
  }

  setGameSpeed(speed: GameSpeed) {
    console.log("🏃 Game engine: Speed changed to", speed, "multiplier:", this.getSpeedMultiplier());
    this.gameSpeed = speed;
  }

  bindEvents() {
    if (this.gameMode === 'flappy_hippos') {
      const handleKeyPress = (e: KeyboardEvent) => {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          this.flap();
        }
      };

      const handleClick = (e: MouseEvent) => {
        e.preventDefault();
        this.flap();
      };

      document.addEventListener('keydown', handleKeyPress);
      this.canvas.addEventListener('click', handleClick);

      this.eventListeners.push(() => {
        document.removeEventListener('keydown', handleKeyPress);
        this.canvas.removeEventListener('click', handleClick);
      });
    } else {
      // Miss POOPEE-Man controls
      const handleKeyDown = (e: KeyboardEvent) => {
        this.keys[e.key] = true;
        
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          e.preventDefault();
          this.handlePacManMovement(e.key);
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        this.keys[e.key] = false;
      };

      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);

      this.eventListeners.push(() => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
      });
    }
  }

  flap() {
    if (this.gameRunning && this.gameMode === 'flappy_hippos') {
      this.hippo = this.physics.flap(this.hippo);
    }
  }

  private handlePacManMovement(key: string) {
    if (!this.gameRunning || this.gameMode !== 'miss_poopee_man') return;

    let newDirection: 'up' | 'down' | 'left' | 'right';
    switch (key) {
      case 'ArrowUp': newDirection = 'up'; break;
      case 'ArrowDown': newDirection = 'down'; break;
      case 'ArrowLeft': newDirection = 'left'; break;
      case 'ArrowRight': newDirection = 'right'; break;
      default: return;
    }

    this.pacman.nextDirection = newDirection;
  }

  cleanup() {
    console.log("🧹 Cleaning up game engine...");
    this.gameRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.eventListeners.forEach(removeListener => removeListener());
    this.eventListeners = [];
  }

  updateShields(newShields: number) {
    console.log("🛡️ Game engine: Updating shields from", this.pipeHitsRemaining, "to", newShields);
    this.pipeHitsRemaining = newShields;
    this.maxShields = newShields;
    console.log("🛡️ Game engine: Post-update - pipeHitsRemaining:", this.pipeHitsRemaining, "maxShields:", this.maxShields);
  }

  reset(startingShields = 3) {
    console.log("🔄 Game engine reset with shields:", startingShields, "for mode:", this.gameMode);
    
    if (this.gameMode === 'flappy_hippos') {
      this.hippo = {
        x: 100,
        y: 285,
        width: 60,
        height: 40,
        velocity: 0,
        rotation: 0
      };
      this.pipes = [];
      this.missiles = [];
      this.pipes.push(this.objectManager.createPipe());
      
      // CRITICAL: Always reset to the provided starting shields
      this.pipeHitsRemaining = startingShields;
      this.maxShields = startingShields;
      console.log("🔄 Reset complete - shields set to:", this.pipeHitsRemaining, "/", this.maxShields);
      
      this.invincibilityTime = 0;
      this.hitEffectTime = 0;
      this.lastMissileTime = 0;
      this.missileWarningTime = 0;
    } else {
      // Miss POOPEE-Man reset
      this.initializeMissPoopeeMan();
    }
    
    this.gameRunning = false;
    this.score = 0;
    this.pipesPassedCount = 0;
    this.gameStartTime = 0;
    
    if (!this.gameRunning) {
      this.render();
    }
  }

  start() {
    console.log("🎯 Game engine starting:");
    console.log("  - Shields:", this.pipeHitsRemaining, "/", this.maxShields);
    console.log("  - Speed:", this.gameSpeed, "multiplier:", this.getSpeedMultiplier());
    
    // CRITICAL: Ensure shields are in sync at start
    console.log("🛡️ Pre-start shield sync - pipeHitsRemaining:", this.pipeHitsRemaining, "maxShields:", this.maxShields);
    this.pipeHitsRemaining = this.maxShields;
    console.log("🛡️ Post-start shield sync - pipeHitsRemaining:", this.pipeHitsRemaining);
    
    this.gameRunning = true;
    this.gameStartTime = Date.now();
    this.lastMissileTime = 0;
    this.gameLoop();
  }

  gameLoop() {
    if (!this.gameRunning) {
      console.log("⏸️ Game loop stopped - gameRunning is false");
      return;
    }

    try {
      this.update();
      this.render();
      this.animationId = requestAnimationFrame(() => this.gameLoop());
    } catch (error) {
      console.error("❌ Error in game loop:", error);
      this.gameOver();
    }
  }

  update() {
    const currentTime = Date.now();
    const gameTimeElapsed = currentTime - this.gameStartTime;

    if (this.gameMode === 'flappy_hippos') {
      this.renderer.updateParallax();

      // Update timers
      if (this.invincibilityTime > 0) this.invincibilityTime--;
      if (this.hitEffectTime > 0) this.hitEffectTime--;
      if (this.missileWarningTime > 0) this.missileWarningTime--;

      // Missile system - 15 seconds
      this.handleMissileSystem(gameTimeElapsed);

      // Update hippo physics
      this.hippo = this.physics.updateHippo(this.hippo, this.canvas.height);
      this.hippo = this.physics.handleCeilingBounce(this.hippo);

      // Update game objects
      this.updateGameObjects();
      this.checkCollisions();
    } else {
      // Miss POOPEE-Man update
      this.updateMissPoopeeMan();
    }
  }

  private handleMissileSystem(gameTimeElapsed: number) {
    // Spawn missiles every 15 seconds
    if (gameTimeElapsed >= 15000 && this.lastMissileTime === 0) {
      this.missiles.push(this.objectManager.createMissile());
      this.lastMissileTime = gameTimeElapsed;
      console.log("🚀 First missile spawned at 15 seconds, gameTime:", gameTimeElapsed / 1000, "s");
    } else if (this.lastMissileTime > 0 && gameTimeElapsed - this.lastMissileTime >= 15000) {
      this.missiles.push(this.objectManager.createMissile());
      this.lastMissileTime = gameTimeElapsed;
      console.log("🚀 Missile spawned at", gameTimeElapsed / 1000, "seconds, total missiles:", this.missiles.length);
    }

    // Missile warning - 2 seconds before missile
    const timeSinceLastMissile = gameTimeElapsed - this.lastMissileTime;
    const timeToNextMissile = 15000 - timeSinceLastMissile;
    if (timeToNextMissile <= 2000 && timeToNextMissile > 0 && this.missileWarningTime <= 0) {
      this.missileWarningTime = 120; // 2 seconds at 60fps
      console.log("⚠️ Missile warning activated - next missile in", timeToNextMissile / 1000, "seconds");
    }
  }

  private updateGameObjects() {
    const speedMultiplier = this.getSpeedMultiplier();
    console.log("🏃 Updating objects with speed multiplier:", speedMultiplier, "for speed:", this.gameSpeed);
    
    // Update pipes with speed-adjusted movement (base speed 4px)
    this.pipes.forEach(pipe => {
      pipe.x -= 4 * speedMultiplier;
      
      if (this.collisionDetector.checkPipeScored(this.hippo, pipe) && !pipe.hit) {
        this.score += 1;
        this.pipesPassedCount += 1;
        this.onScoreUpdate(this.score);
        pipe.hit = true; // Mark as scored to prevent double counting
        console.log("📈 Score increased:", this.score);
      }
    });

    this.pipes = this.objectManager.updatePipes(this.pipes, speedMultiplier);
    this.missiles = this.objectManager.updateMissiles(this.missiles, speedMultiplier);
    
    if (this.objectManager.shouldAddPipe(this.pipes)) {
      this.pipes.push(this.objectManager.createPipe());
    }
  }

  checkCollisions() {
    // Ground collision - instant death
    if (this.physics.isGroundCollision(this.hippo, this.canvas.height)) {
      console.log("💥 Ground collision detected");
      this.gameOver();
      return;
    }

    // Missile collision - instant death regardless of shields
    for (let missile of this.missiles) {
      if (this.collisionDetector.checkMissileCollision(this.hippo, missile)) {
        console.log("💥 Missile collision - instant death!");
        this.gameOver();
        return;
      }
    }

    // Pipe collision - only if not invincible
    if (this.invincibilityTime <= 0) {
      for (let pipe of this.pipes) {
        if (this.collisionDetector.checkPipeCollision(this.hippo, pipe) && !pipe.hit) {
          if (this.pipeHitsRemaining > 0) {
            console.log("🛡️ Pipe hit! Shields remaining:", this.pipeHitsRemaining - 1);
            this.pipeHitsRemaining--;
            pipe.hit = true;
            
            this.hippo.velocity = -8;
            this.hippo.x = Math.max(50, this.hippo.x - 20);
            
            this.invincibilityTime = 60;
            this.hitEffectTime = 30;
          } else {
            console.log("💀 Final pipe collision - Game Over!");
            this.gameOver();
          }
          break;
        }
      }
    }
  }

  gameOver() {
    console.log("💀 Game over triggered");
    this.gameRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    const duration = Math.floor((Date.now() - this.gameStartTime) / 1000);
    console.log("📊 Game over - Score:", this.score, "Duration:", duration);
    this.onGameEnd(this.score, this.pipesPassedCount, duration);
  }

  private initializeMissPoopeeMan() {
    console.log("🎮 Initializing Miss POOPEE-Man game");
    this.cellSize = 20;
    this.vulnerabilityTimer = 0;
    this.blinkTimer = 0;
    this.globalModeTimer = 0;
    this.currentGlobalMode = 'scatter';
    
    // Reset movement timers
    this.moveTimer = 0;
    this.ghostMoveTimer = 0;
    
    // Create classic Pac-Man maze layout
    this.maze = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
      [1,2,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,2,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,0,1],
      [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1],
      [1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1],
      [1,1,1,1,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,1,1,1,1],
      [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1],
      [0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0],
      [1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,1,1,1],
      [1,1,1,1,1,1,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,1,1,1,1,1,1],
      [1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
      [1,2,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,2,1],
      [1,1,1,0,1,1,0,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,0,1,1,0,1,1,1],
      [1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1],
      [1,0,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,0,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
    
    // Initialize Pac-Man
    this.pacman = {
      x: 19 * this.cellSize,
      y: 21 * this.cellSize,
      width: this.cellSize,
      height: this.cellSize,
      direction: 'right',
      nextDirection: null,
      gridX: 19,
      gridY: 21
    };
    
    // Initialize ghosts with proper sequential release timers
    this.ghosts = [
      {
        x: 19 * this.cellSize, y: 11 * this.cellSize, width: this.cellSize, height: this.cellSize,
        gridX: 19, gridY: 11, direction: 'up', color: '#FF0000', 
        isVulnerable: false, isBlinking: false, ai: 'chase', 
        isInBox: false, releaseTimer: 0, // Blinky starts immediately
        homeX: 38, homeY: 1, // Top-right corner for scatter
        mode: 'scatter', modeTimer: 420 // 7 seconds scatter mode
      },
      {
        x: 20 * this.cellSize, y: 11 * this.cellSize, width: this.cellSize, height: this.cellSize,
        gridX: 20, gridY: 11, direction: 'up', color: '#FFB6C1', 
        isVulnerable: false, isBlinking: false, ai: 'chase', 
        isInBox: true, releaseTimer: 300, // Pinky leaves after 5 seconds
        homeX: 1, homeY: 1, // Top-left corner for scatter
        mode: 'scatter', modeTimer: 420
      },
      {
        x: 19 * this.cellSize, y: 12 * this.cellSize, width: this.cellSize, height: this.cellSize,
        gridX: 19, gridY: 12, direction: 'up', color: '#00FFFF', 
        isVulnerable: false, isBlinking: false, ai: 'chase', 
        isInBox: true, releaseTimer: 600, // Inky leaves after 10 seconds
        homeX: 38, homeY: 21, // Bottom-right corner for scatter
        mode: 'scatter', modeTimer: 420
      },
      {
        x: 20 * this.cellSize, y: 12 * this.cellSize, width: this.cellSize, height: this.cellSize,
        gridX: 20, gridY: 12, direction: 'up', color: '#FFA500', 
        isVulnerable: false, isBlinking: false, ai: 'chase', 
        isInBox: true, releaseTimer: 900, // Clyde leaves after 15 seconds
        homeX: 1, homeY: 21, // Bottom-left corner for scatter
        mode: 'scatter', modeTimer: 420
      }
    ];
    
    console.log("👻 Ghosts initialized with release timers:", this.ghosts.map(g => g.releaseTimer));
    
    // Initialize pellets
    this.pellets = [];
    for (let y = 0; y < this.maze.length; y++) {
      for (let x = 0; x < this.maze[y].length; x++) {
        if (this.maze[y][x] === 0) {
          this.pellets.push({
            x: x * this.cellSize + this.cellSize / 2,
            y: y * this.cellSize + this.cellSize / 2,
            gridX: x,
            gridY: y,
            isPowerPellet: false,
            collected: false
          });
        } else if (this.maze[y][x] === 2) {
          this.pellets.push({
            x: x * this.cellSize + this.cellSize / 2,
            y: y * this.cellSize + this.cellSize / 2,
            gridX: x,
            gridY: y,
            isPowerPellet: true,
            collected: false
          });
        }
      }
    }
  }

  private updateMissPoopeeMan() {
    this.updatePacMan();
    this.updateGhosts();
    this.checkMissPoopeeManCollisions();
    
    // Update global mode timer for scatter/chase phases
    this.globalModeTimer++;
    if (this.globalModeTimer >= 600) { // 10 seconds
      this.currentGlobalMode = this.currentGlobalMode === 'scatter' ? 'chase' : 'scatter';
      this.globalModeTimer = 0;
      console.log(`🔄 Global mode switched to: ${this.currentGlobalMode}`);
      
      // Update all non-frightened ghosts
      this.ghosts.forEach(ghost => {
        if (ghost.mode !== 'frightened' && ghost.mode !== 'eaten' && !ghost.isInBox) {
          ghost.mode = this.currentGlobalMode;
          ghost.modeTimer = 600; // Reset timer
        }
      });
    }
    
    // Update power pellet timers
    if (this.vulnerabilityTimer > 0) {
      this.vulnerabilityTimer--;
      if (this.vulnerabilityTimer <= 180) { // Last 3 seconds
        this.blinkTimer++;
        if (this.blinkTimer > 30) { // Blink every 0.5 seconds
          this.blinkTimer = 0;
          this.ghosts.forEach(ghost => {
            if (ghost.isVulnerable) {
              ghost.isBlinking = !ghost.isBlinking;
            }
          });
        }
      }
      
      if (this.vulnerabilityTimer <= 0) {
        console.log("⏰ Vulnerability timer expired - ghosts returning to normal");
        this.ghosts.forEach(ghost => {
          ghost.isVulnerable = false;
          ghost.isBlinking = false;
          ghost.mode = this.currentGlobalMode;
          ghost.modeTimer = 600;
        });
      }
    }
  }

  private updatePacMan() {
    // Increment movement timer
    this.moveTimer++;
    
    // Check if we can change direction
    if (this.pacman.nextDirection) {
      const newGridX = this.pacman.gridX + (this.pacman.nextDirection === 'right' ? 1 : this.pacman.nextDirection === 'left' ? -1 : 0);
      const newGridY = this.pacman.gridY + (this.pacman.nextDirection === 'down' ? 1 : this.pacman.nextDirection === 'up' ? -1 : 0);
      
      if (this.isValidMove(newGridX, newGridY)) {
        this.pacman.direction = this.pacman.nextDirection;
        this.pacman.nextDirection = null;
      }
    }
    
    // Only move if enough time has passed
    if (this.moveTimer >= this.framesBetweenMoves) {
      this.moveTimer = 0; // Reset timer
      
      // Move in current direction
      let newGridX = this.pacman.gridX;
      let newGridY = this.pacman.gridY;
      
      switch (this.pacman.direction) {
        case 'right': newGridX++; break;
        case 'left': newGridX--; break;
        case 'down': newGridY++; break;
        case 'up': newGridY--; break;
      }
      
      // Handle tunnel wraparound
      if (newGridX < 0) newGridX = this.maze[0].length - 1;
      if (newGridX >= this.maze[0].length) newGridX = 0;
      
      if (this.isValidMove(newGridX, newGridY)) {
        this.pacman.gridX = newGridX;
        this.pacman.gridY = newGridY;
        this.pacman.x = newGridX * this.cellSize;
        this.pacman.y = newGridY * this.cellSize;
      }
    }
  }

  private updateGhosts() {
    // Increment ghost movement timer
    this.ghostMoveTimer++;
    
    // Only move ghosts if enough time has passed
    if (this.ghostMoveTimer >= this.framesBetweenGhostMoves) {
      this.ghostMoveTimer = 0; // Reset timer
      
      this.ghosts.forEach((ghost, index) => {
        // Handle ghost release from box
        if (ghost.isInBox) {
          if (ghost.releaseTimer > 0) {
            ghost.releaseTimer--;
            console.log(`👻 Ghost ${index} release timer: ${ghost.releaseTimer}`);
            
            // Ghost bobs up and down while waiting
            if (ghost.releaseTimer % 20 < 10) {
              if (ghost.gridY > 11) {
                ghost.gridY--;
                ghost.y = ghost.gridY * this.cellSize;
              }
            } else {
              if (ghost.gridY < 12) {
                ghost.gridY++;
                ghost.y = ghost.gridY * this.cellSize;
              }
            }
            return; // Skip normal movement while in box
          } else {
            // Release the ghost - move to exit position
            console.log(`👻 Ghost ${index} being released from box`);
            ghost.isInBox = false;
            ghost.gridY = 9; // Move to exit position above the box
            ghost.y = ghost.gridY * this.cellSize;
            ghost.direction = 'up';
            ghost.mode = this.currentGlobalMode;
            ghost.modeTimer = 600;
            console.log(`👻 Ghost ${index} released! Mode: ${ghost.mode}`);
          }
        }
        
        // Update mode timer
        if (ghost.modeTimer > 0) {
          ghost.modeTimer--;
        }
        
        // Determine target based on current mode
        let targetX = ghost.homeX || 19;
        let targetY = ghost.homeY || 11;
        
        switch (ghost.mode) {
          case 'chase':
            // Each ghost has unique chase behavior
            const chaseTarget = this.getGhostChaseTarget(ghost, index);
            targetX = chaseTarget.x;
            targetY = chaseTarget.y;
            break;
            
          case 'scatter':
            // Go to home corner
            targetX = ghost.homeX || 19;
            targetY = ghost.homeY || 11;
            break;
            
          case 'frightened':
            // Move randomly away from Pac-Man
            const fleeTarget = this.getFleeTarget(ghost);
            targetX = fleeTarget.x;
            targetY = fleeTarget.y;
            break;
            
          case 'eaten':
            // Return to ghost house
            targetX = 19;
            targetY = 11;
            if (ghost.gridX === 19 && ghost.gridY === 11) {
              ghost.mode = this.currentGlobalMode;
              ghost.modeTimer = 600;
              ghost.isVulnerable = false;
              console.log(`👻 Ghost ${index} returned to house, mode: ${ghost.mode}`);
            }
            break;
        }
        
        // Get best move toward target
        const bestMove = this.getBestMoveToTarget(ghost, targetX, targetY);
        if (bestMove) {
          this.moveGhost(ghost, bestMove);
        }
      });
    }
  }
  
  private getGhostChaseTarget(ghost: Ghost, ghostIndex: number): {x: number, y: number} {
    switch (ghostIndex) {
      case 0: // Blinky (Red) - Direct chase
        return { x: this.pacman.gridX, y: this.pacman.gridY };
        
      case 1: // Pinky (Pink) - Target 4 tiles ahead of Pac-Man
        let targetX = this.pacman.gridX;
        let targetY = this.pacman.gridY;
        
        switch (this.pacman.direction) {
          case 'up': 
            targetY -= 4; 
            targetX -= 4; // Original Pac-Man overflow bug
            break;
          case 'down': targetY += 4; break;
          case 'left': targetX -= 4; break;
          case 'right': targetX += 4; break;
        }
        
        // Clamp to maze bounds
        targetX = Math.max(0, Math.min(targetX, this.maze[0].length - 1));
        targetY = Math.max(0, Math.min(targetY, this.maze.length - 1));
        return { x: targetX, y: targetY };
        
      case 2: // Inky (Cyan) - Ambush using Blinky's position
        const blinky = this.ghosts[0];
        if (blinky && !blinky.isInBox) {
          let pacTargetX = this.pacman.gridX;
          let pacTargetY = this.pacman.gridY;
          
          // Get 2 tiles ahead of Pac-Man
          switch (this.pacman.direction) {
            case 'up': pacTargetY -= 2; break;
            case 'down': pacTargetY += 2; break;
            case 'left': pacTargetX -= 2; break;
            case 'right': pacTargetX += 2; break;
          }
          
          // Vector from Blinky to this point, then double it
          const vectorX = pacTargetX - blinky.gridX;
          const vectorY = pacTargetY - blinky.gridY;
          targetX = pacTargetX + vectorX;
          targetY = pacTargetY + vectorY;
        } else {
          // Fallback to direct chase if Blinky not available
          targetX = this.pacman.gridX;
          targetY = this.pacman.gridY;
        }
        
        targetX = Math.max(0, Math.min(targetX, this.maze[0].length - 1));
        targetY = Math.max(0, Math.min(targetY, this.maze.length - 1));
        return { x: targetX, y: targetY };
        
      case 3: // Clyde (Orange) - Chase when far, scatter when close
        const distance = Math.abs(ghost.gridX - this.pacman.gridX) + Math.abs(ghost.gridY - this.pacman.gridY);
        if (distance < 8) {
          // Too close, scatter to home corner
          return { x: ghost.homeX || 1, y: ghost.homeY || 21 };
        } else {
          // Far enough, chase directly
          return { x: this.pacman.gridX, y: this.pacman.gridY };
        }
        
      default:
        return { x: this.pacman.gridX, y: this.pacman.gridY };
    }
  }
  
  private getFleeTarget(ghost: Ghost): {x: number, y: number} {
    // Simple flee logic - move away from Pac-Man
    const possibleMoves = this.getGhostPossibleMoves(ghost, true);
    
    let bestMove = null;
    let maxDistance = -1;
    
    for (const move of possibleMoves) {
      const newGridX = ghost.gridX + move.dx;
      const newGridY = ghost.gridY + move.dy;
      
      const distance = Math.abs(newGridX - this.pacman.gridX) + Math.abs(newGridY - this.pacman.gridY);
      
      if (distance > maxDistance) {
        maxDistance = distance;
        bestMove = { x: newGridX, y: newGridY };
      }
    }
    
    return bestMove || { x: ghost.gridX, y: ghost.gridY };
  }
  
  private getBestMoveToTarget(ghost: Ghost, targetX: number, targetY: number): {dx: number, dy: number, direction: 'up' | 'down' | 'left' | 'right'} | null {
    const possibleMoves = this.getGhostPossibleMoves(ghost);
    
    if (possibleMoves.length === 0) {
      // If stuck, allow any move including reversing
      const allMoves = this.getGhostPossibleMoves(ghost, true);
      if (allMoves.length > 0) {
        return allMoves[Math.floor(Math.random() * allMoves.length)];
      }
      return null;
    }
    
    // Choose move that minimizes distance to target
    let bestMove = null;
    let minDistance = Infinity;
    
    for (const move of possibleMoves) {
      const newGridX = ghost.gridX + move.dx;
      const newGridY = ghost.gridY + move.dy;
      
      // Handle tunnel wraparound
      let wrappedX = newGridX;
      if (wrappedX < 0) wrappedX = this.maze[0].length - 1;
      if (wrappedX >= this.maze[0].length) wrappedX = 0;
      
      const distance = Math.abs(wrappedX - targetX) + Math.abs(newGridY - targetY);
      
      if (distance < minDistance) {
        minDistance = distance;
        bestMove = move;
      }
    }
    
    return bestMove;
  }
  
  private getGhostPossibleMoves(ghost: Ghost, allowReverse: boolean = false): Array<{dx: number, dy: number, direction: 'up' | 'down' | 'left' | 'right'}> {
    const moves = [
      { dx: 0, dy: -1, direction: 'up' as const },
      { dx: 0, dy: 1, direction: 'down' as const },
      { dx: -1, dy: 0, direction: 'left' as const },
      { dx: 1, dy: 0, direction: 'right' as const }
    ];
    
    const oppositeDirection = this.getOppositeDirection(ghost.direction);
    
    return moves.filter(move => {
      const newGridX = ghost.gridX + move.dx;
      const newGridY = ghost.gridY + move.dy;
      
      // Handle tunnel wraparound
      let wrappedX = newGridX;
      if (wrappedX < 0) wrappedX = this.maze[0].length - 1;
      if (wrappedX >= this.maze[0].length) wrappedX = 0;
      
      const isValidMove = this.isValidMove(wrappedX, newGridY);
      const isReverse = move.direction === oppositeDirection;
      
      return isValidMove && (allowReverse || !isReverse);
    });
  }
  
  private getOppositeDirection(direction: string): string {
    switch (direction) {
      case 'up': return 'down';
      case 'down': return 'up';
      case 'left': return 'right';
      case 'right': return 'left';
      default: return '';
    }
  }
  
  private moveGhost(ghost: Ghost, move: {dx: number, dy: number, direction: 'up' | 'down' | 'left' | 'right'}) {
    const newGridX = ghost.gridX + move.dx;
    const newGridY = ghost.gridY + move.dy;
    
    // Handle tunnel wraparound
    let wrappedX = newGridX;
    if (wrappedX < 0) wrappedX = this.maze[0].length - 1;
    if (wrappedX >= this.maze[0].length) wrappedX = 0;
    
    ghost.gridX = wrappedX;
    ghost.gridY = newGridY;
    ghost.x = wrappedX * this.cellSize;
    ghost.y = newGridY * this.cellSize;
    ghost.direction = move.direction;
  }

  private isValidMove(gridX: number, gridY: number): boolean {
    if (gridY < 0 || gridY >= this.maze.length || gridX < 0 || gridX >= this.maze[0].length) {
      return false;
    }
    return this.maze[gridY][gridX] !== 1;
  }

  private checkMissPoopeeManCollisions() {
    // Check pellet collection
    this.pellets.forEach(pellet => {
      if (!pellet.collected && pellet.gridX === this.pacman.gridX && pellet.gridY === this.pacman.gridY) {
        pellet.collected = true;
        
        if (pellet.isPowerPellet) {
          this.score += 25; // Reduced from 50
          this.vulnerabilityTimer = 600; // 10 seconds at 60fps
          console.log("💊 Power pellet eaten! Ghosts are now frightened for 10 seconds");
          
          this.ghosts.forEach(ghost => {
            if (!ghost.isInBox) {
              ghost.isVulnerable = true;
              ghost.isBlinking = false;
              ghost.mode = 'frightened';
              ghost.modeTimer = 600;
            }
          });
        } else {
          this.score += 5; // Reduced from 10
        }
        
        this.onScoreUpdate(this.score);
      }
    });
    
    // Update invulnerability timer
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer--;
    }
    
    // Check ghost collisions (only if not invulnerable)
    if (this.invulnerabilityTimer <= 0) {
      this.ghosts.forEach((ghost, index) => {
        if (ghost.gridX === this.pacman.gridX && ghost.gridY === this.pacman.gridY && !ghost.isInBox) {
          if (ghost.isVulnerable && ghost.mode === 'frightened') {
            // Eat ghost
            this.score += 100; // Reduced from 200
            this.onScoreUpdate(this.score);
            console.log(`👻 Ghost ${index} eaten! Score +100`);
            
            // Send ghost back to house
            ghost.gridX = 19;
            ghost.gridY = 11;
            ghost.x = 19 * this.cellSize;
            ghost.y = 11 * this.cellSize;
            ghost.isVulnerable = false;
            ghost.isBlinking = false;
            ghost.mode = 'eaten';
            ghost.modeTimer = 300; // Time to get back to normal
          } else if (ghost.mode !== 'eaten') {
            // Lose a life
            this.lives--;
            this.invulnerabilityTimer = 120; // 2 seconds of invulnerability
            console.log(`💀 Pac-Man hit by ghost ${index}! Lives remaining: ${this.lives}`);
            
            if (this.lives <= 0) {
              // Game over - no more lives
              console.log("💀 Game Over - No more lives!");
              this.gameOver();
            } else {
              // Reset positions
              this.resetPositions();
            }
          }
        }
      });
    }
    
    // Check if all pellets collected
    const remainingPellets = this.pellets.filter(p => !p.collected);
    if (remainingPellets.length === 0) {
      this.nextLevel();
    }
  }
  
  private resetPositions() {
    // Reset Pac-Man position
    this.pacman.gridX = 19;
    this.pacman.gridY = 21;
    this.pacman.x = 19 * this.cellSize;
    this.pacman.y = 21 * this.cellSize;
    this.pacman.direction = 'right';
    this.pacman.nextDirection = null;
    
    // Reset ghosts to center with fresh release timers
    this.ghosts.forEach((ghost, index) => {
      ghost.gridX = 19 + (index % 2);
      ghost.gridY = 11 + Math.floor(index / 2);
      ghost.x = ghost.gridX * this.cellSize;
      ghost.y = ghost.gridY * this.cellSize;
      ghost.isVulnerable = false;
      ghost.isBlinking = false;
      ghost.isInBox = true;
      ghost.mode = 'scatter';
      ghost.modeTimer = 420;
      
      // Reset release timers
      ghost.releaseTimer = index * 60; // Staggered release: 0, 1, 2, 3 seconds
    });
    
    // Reset vulnerability timer
    this.vulnerabilityTimer = 0;
    this.globalModeTimer = 0;
    this.currentGlobalMode = 'scatter';
  }
  
  private nextLevel() {
    this.level++;
    console.log("🎉 Level complete! Moving to level", this.level);
    
    // Add level complete bonus
    this.score += 1000;
    this.onScoreUpdate(this.score);
    
    // Reset game state for next level
    this.initializeMissPoopeeMan();
    
    // Keep current score and level
    const currentScore = this.score;
    const currentLevel = this.level;
    const currentLives = this.lives;
    
    // Re-initialize but preserve game state
    this.initializeMissPoopeeMan();
    this.score = currentScore;
    this.level = currentLevel;
    this.lives = currentLives;
    
    // Generate new maze pattern (simple variation)
    this.generateMazeVariation();
  }
  
  private generateMazeVariation() {
    // Simple maze variations - just change power pellet positions
    const variations = [
      [[1, 3], [38, 3], [1, 17], [38, 17]], // Original
      [[1, 1], [38, 1], [1, 21], [38, 21]], // Variation 1
      [[1, 5], [38, 5], [1, 15], [38, 15]], // Variation 2
      [[3, 3], [36, 3], [3, 17], [36, 17]], // Variation 3
    ];
    
    const currentVariation = variations[this.level % variations.length];
    
    // Reset all power pellets to regular pellets
    this.pellets.forEach(pellet => {
      pellet.isPowerPellet = false;
    });
    
    // Set new power pellet positions
    currentVariation.forEach(([x, y]) => {
      const pellet = this.pellets.find(p => p.gridX === x && p.gridY === y);
      if (pellet) {
        pellet.isPowerPellet = true;
      }
    });
  }
  
  // Override getCurrentShields for Miss POOPEE-Man to return lives
  getCurrentShields() {
    if (this.gameMode === 'miss_poopee_man') {
      return this.lives;
    }
    return this.pipeHitsRemaining;
  }

  render() {
    try {
      if (this.gameMode === 'flappy_hippos') {
        this.renderer.renderBackground(this.missileWarningTime, this.hitEffectTime);
        this.renderer.renderClouds();
        this.pipes.forEach(pipe => this.renderer.renderPipe(pipe));
        this.missiles.forEach(missile => this.renderer.renderMissile(missile));
        this.renderer.renderGround();
        this.renderer.renderHippo(this.hippo, this.invincibilityTime);
        this.renderer.renderScore(this.score);
        this.renderer.renderShieldCounter(this.pipeHitsRemaining, this.maxShields);
        this.renderer.restoreContext(this.hitEffectTime);
      } else {
        // Miss POOPEE-Man render
        this.renderer.renderMissPoopeeManGame(
          this.maze, 
          this.pacman, 
          this.ghosts, 
          this.pellets, 
          this.score, 
          this.cellSize,
          this.lives
        );
      }
    } catch (error) {
      console.error("❌ Error in render:", error);
    }
  }
}
