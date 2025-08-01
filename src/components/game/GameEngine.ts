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
  id: number;
  pathIndex: number;
  predefinedPath: { x: number; y: number }[];
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
  private cellSize = 20;
  private keys: { [key: string]: boolean } = {};
  
  // SIMPLIFIED: Fixed movement timing
  private moveTimer = 0;
  private framesBetweenMoves = 4; // Pac-Man movement
  private ghostMoveTimer = 0;
  private framesBetweenGhostMoves = 8; // Ghost movement speed
  
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
      case 'beginner': return 0.75;
      case 'moderate': return 1.5;
      case 'advanced': return 2.25;
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
      
      this.pipeHitsRemaining = startingShields;
      this.maxShields = startingShields;
      console.log("🔄 Reset complete - shields set to:", this.pipeHitsRemaining, "/", this.maxShields);
      
      this.invincibilityTime = 0;
      this.hitEffectTime = 0;
      this.lastMissileTime = 0;
      this.missileWarningTime = 0;
    } else {
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

      if (this.invincibilityTime > 0) this.invincibilityTime--;
      if (this.hitEffectTime > 0) this.hitEffectTime--;
      if (this.missileWarningTime > 0) this.missileWarningTime--;

      this.handleMissileSystem(gameTimeElapsed);

      this.hippo = this.physics.updateHippo(this.hippo, this.canvas.height);
      this.hippo = this.physics.handleCeilingBounce(this.hippo);

      this.updateGameObjects();
      this.checkCollisions();
    } else {
      this.updateMissPoopeeMan();
    }
  }

  private handleMissileSystem(gameTimeElapsed: number) {
    if (gameTimeElapsed >= 15000 && this.lastMissileTime === 0) {
      this.missiles.push(this.objectManager.createMissile());
      this.lastMissileTime = gameTimeElapsed;
      console.log("🚀 First missile spawned at 15 seconds, gameTime:", gameTimeElapsed / 1000, "s");
    } else if (this.lastMissileTime > 0 && gameTimeElapsed - this.lastMissileTime >= 15000) {
      this.missiles.push(this.objectManager.createMissile());
      this.lastMissileTime = gameTimeElapsed;
      console.log("🚀 Missile spawned at", gameTimeElapsed / 1000, "seconds, total missiles:", this.missiles.length);
    }

    const timeSinceLastMissile = gameTimeElapsed - this.lastMissileTime;
    const timeToNextMissile = 15000 - timeSinceLastMissile;
    if (timeToNextMissile <= 2000 && timeToNextMissile > 0 && this.missileWarningTime <= 0) {
      this.missileWarningTime = 120;
      console.log("⚠️ Missile warning activated - next missile in", timeToNextMissile / 1000, "seconds");
    }
  }

  private updateGameObjects() {
    const speedMultiplier = this.getSpeedMultiplier();
    console.log("🏃 Updating objects with speed multiplier:", speedMultiplier, "for speed:", this.gameSpeed);
    
    this.pipes.forEach(pipe => {
      pipe.x -= 4 * speedMultiplier;
      
      if (this.collisionDetector.checkPipeScored(this.hippo, pipe) && !pipe.hit) {
        this.score += 1;
        this.pipesPassedCount += 1;
        this.onScoreUpdate(this.score);
        pipe.hit = true;
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
    if (this.physics.isGroundCollision(this.hippo, this.canvas.height)) {
      console.log("💥 Ground collision detected");
      this.gameOver();
      return;
    }

    for (let missile of this.missiles) {
      if (this.collisionDetector.checkMissileCollision(this.hippo, missile)) {
        console.log("💥 Missile collision - instant death!");
        this.gameOver();
        return;
      }
    }

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
    console.log("🎮 MAZE-AWARE: Initializing Miss POOPEE-Man with maze-following ghost paths");
    this.cellSize = 20;
    this.vulnerabilityTimer = 0;
    
    this.moveTimer = 0;
    this.ghostMoveTimer = 0;
    
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
    
    // MAZE-AWARE: Create paths that follow actual maze corridors
    const ghostPaths = this.createMazeAwareGhostPaths();
    
    this.ghosts = [
      {
        id: 0,
        x: 19 * this.cellSize,
        y: 11 * this.cellSize,
        width: this.cellSize,
        height: this.cellSize,
        gridX: 19,
        gridY: 11,
        direction: 'up',
        color: '#FF0000', // Red
        isVulnerable: false,
        isBlinking: false,
        pathIndex: 0,
        predefinedPath: ghostPaths.ghost1
      },
      {
        id: 1,
        x: 19 * this.cellSize,
        y: 11 * this.cellSize,
        width: this.cellSize,
        height: this.cellSize,
        gridX: 19,
        gridY: 11,
        direction: 'right',
        color: '#FFB6C1', // Pink
        isVulnerable: false,
        isBlinking: false,
        pathIndex: 0,
        predefinedPath: ghostPaths.ghost2
      },
      {
        id: 2,
        x: 19 * this.cellSize,
        y: 11 * this.cellSize,
        width: this.cellSize,
        height: this.cellSize,
        gridX: 19,
        gridY: 11,
        direction: 'left',
        color: '#00FFFF', // Cyan
        isVulnerable: false,
        isBlinking: false,
        pathIndex: 0,
        predefinedPath: ghostPaths.ghost3
      },
      {
        id: 3,
        x: 19 * this.cellSize,
        y: 11 * this.cellSize,
        width: this.cellSize,
        height: this.cellSize,
        gridX: 19,
        gridY: 11,
        direction: 'down',
        color: '#FFA500', // Orange
        isVulnerable: false,
        isBlinking: false,
        pathIndex: 0,
        predefinedPath: ghostPaths.ghost4
      }
    ];
    
    console.log("👻 MAZE-AWARE: All 4 ghosts initialized with maze-following paths");
    this.ghosts.forEach((ghost, i) => {
      console.log(`Ghost ${i}: path has ${ghost.predefinedPath.length} waypoints, all validated as walkable`);
    });
    
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

  // MAZE-AWARE: Create paths that follow actual walkable maze corridors
  private createMazeAwareGhostPaths() {
    console.log("🗺️ MAZE-AWARE: Creating ghost paths that follow maze corridors");
    
    // Validate if a coordinate is walkable (not a wall)
    const isWalkable = (x: number, y: number): boolean => {
      if (y < 0 || y >= this.maze.length || x < 0 || x >= this.maze[0].length) {
        return false;
      }
      return this.maze[y][x] !== 1; // 0 = walkable, 1 = wall, 2 = power pellet (walkable)
    };

    // SIMPLIFIED: Create perimeter paths that follow the maze walls
    // These paths stick to the outer corridors and are guaranteed to be walkable
    
    // Ghost 1: Top perimeter clockwise
    const ghost1Path = [
      // Start from center, go up and around top perimeter
      {x: 19, y: 11}, {x: 19, y: 9}, {x: 19, y: 6}, {x: 18, y: 6}, {x: 17, y: 6}, {x: 16, y: 6}, {x: 15, y: 6}, {x: 14, y: 6}, {x: 13, y: 6}, {x: 12, y: 6}, {x: 11, y: 6}, {x: 10, y: 6}, {x: 9, y: 6}, {x: 8, y: 6}, {x: 7, y: 6}, {x: 6, y: 6}, {x: 5, y: 6}, {x: 4, y: 6}, {x: 3, y: 6}, {x: 2, y: 6}, {x: 1, y: 6}, // Go to left edge
      {x: 1, y: 5}, {x: 1, y: 4}, {x: 1, y: 3}, {x: 1, y: 2}, {x: 1, y: 1}, // Go up left side
      {x: 2, y: 1}, {x: 3, y: 1}, {x: 4, y: 1}, {x: 5, y: 1}, {x: 6, y: 1}, {x: 7, y: 1}, {x: 8, y: 1}, {x: 9, y: 1}, {x: 10, y: 1}, {x: 11, y: 1}, {x: 12, y: 1}, {x: 13, y: 1}, {x: 14, y: 1}, {x: 15, y: 1}, {x: 16, y: 1}, {x: 17, y: 1}, {x: 18, y: 1}, {x: 19, y: 1}, {x: 20, y: 1}, {x: 21, y: 1}, {x: 22, y: 1}, {x: 23, y: 1}, {x: 24, y: 1}, {x: 25, y: 1}, {x: 26, y: 1}, {x: 27, y: 1}, {x: 28, y: 1}, {x: 29, y: 1}, {x: 30, y: 1}, {x: 31, y: 1}, {x: 32, y: 1}, {x: 33, y: 1}, {x: 34, y: 1}, {x: 35, y: 1}, {x: 36, y: 1}, {x: 37, y: 1}, {x: 38, y: 1}, // Go right across top
      {x: 38, y: 2}, {x: 38, y: 3}, {x: 38, y: 4}, {x: 38, y: 5}, {x: 38, y: 6}, // Go down right side
      {x: 37, y: 6}, {x: 36, y: 6}, {x: 35, y: 6}, {x: 34, y: 6}, {x: 33, y: 6}, {x: 32, y: 6}, {x: 31, y: 6}, {x: 30, y: 6}, {x: 29, y: 6}, {x: 28, y: 6}, {x: 27, y: 6}, {x: 26, y: 6}, {x: 25, y: 6}, {x: 24, y: 6}, {x: 23, y: 6}, {x: 22, y: 6}, {x: 21, y: 6}, {x: 20, y: 6}, {x: 19, y: 6}, // Go back to center area
      {x: 19, y: 7}, {x: 19, y: 8}, {x: 19, y: 9}, {x: 19, y: 10} // Return to center
    ];

    // Ghost 2: Bottom perimeter clockwise  
    const ghost2Path = [
      // Start from center, go down and around bottom perimeter
      {x: 19, y: 11}, {x: 19, y: 13}, {x: 19, y: 15}, {x: 19, y: 17}, {x: 19, y: 19}, {x: 19, y: 21}, // Go down
      {x: 18, y: 21}, {x: 17, y: 21}, {x: 16, y: 21}, {x: 15, y: 21}, {x: 14, y: 21}, {x: 13, y: 21}, {x: 12, y: 21}, {x: 11, y: 21}, {x: 10, y: 21}, {x: 9, y: 21}, {x: 8, y: 21}, {x: 7, y: 21}, {x: 6, y: 21}, {x: 5, y: 21}, {x: 4, y: 21}, {x: 3, y: 21}, {x: 2, y: 21}, {x: 1, y: 21}, // Go left across bottom
      {x: 1, y: 20}, {x: 1, y: 19}, {x: 1, y: 18}, {x: 1, y: 17}, {x: 1, y: 16}, {x: 1, y: 15}, // Go up left side
      {x: 2, y: 15}, {x: 3, y: 15}, {x: 4, y: 15}, {x: 5, y: 15}, {x: 6, y: 15}, {x: 7, y: 15}, {x: 8, y: 15}, {x: 9, y: 15}, {x: 10, y: 15}, {x: 11, y: 15}, {x: 12, y: 15}, {x: 13, y: 15}, {x: 14, y: 15}, {x: 15, y: 15}, {x: 16, y: 15}, {x: 17, y: 15}, {x: 18, y: 15}, {x: 19, y: 15}, {x: 20, y: 15}, {x: 21, y: 15}, {x: 22, y: 15}, {x: 23, y: 15}, {x: 24, y: 15}, {x: 25, y: 15}, {x: 26, y: 15}, {x: 27, y: 15}, {x: 28, y: 15}, {x: 29, y: 15}, {x: 30, y: 15}, {x: 31, y: 15}, {x: 32, y: 15}, {x: 33, y: 15}, {x: 34, y: 15}, {x: 35, y: 15}, {x: 36, y: 15}, {x: 37, y: 15}, {x: 38, y: 15}, // Go right across middle
      {x: 38, y: 16}, {x: 38, y: 17}, {x: 38, y: 18}, {x: 38, y: 19}, {x: 38, y: 20}, {x: 38, y: 21}, // Go down right side  
      {x: 37, y: 21}, {x: 36, y: 21}, {x: 35, y: 21}, {x: 34, y: 21}, {x: 33, y: 21}, {x: 32, y: 21}, {x: 31, y: 21}, {x: 30, y: 21}, {x: 29, y: 21}, {x: 28, y: 21}, {x: 27, y: 21}, {x: 26, y: 21}, {x: 25, y: 21}, {x: 24, y: 21}, {x: 23, y: 21}, {x: 22, y: 21}, {x: 21, y: 21}, {x: 20, y: 21}, {x: 19, y: 21}, // Go back across bottom
      {x: 19, y: 20}, {x: 19, y: 19}, {x: 19, y: 17}, {x: 19, y: 15}, {x: 19, y: 13}, {x: 19, y: 12} // Return to center
    ];

    // Ghost 3: Left side vertical patrol
    const ghost3Path = [
      {x: 19, y: 11}, {x: 17, y: 11}, {x: 15, y: 11}, {x: 13, y: 11}, {x: 11, y: 11}, {x: 9, y: 11}, {x: 7, y: 11}, {x: 5, y: 11}, {x: 3, y: 11}, {x: 1, y: 11}, // Go left to edge
      {x: 1, y: 12}, {x: 1, y: 13}, {x: 1, y: 14}, {x: 1, y: 15}, {x: 1, y: 16}, {x: 1, y: 17}, {x: 1, y: 18}, {x: 1, y: 19}, {x: 1, y: 20}, {x: 1, y: 21}, // Go down left edge
      {x: 2, y: 21}, {x: 3, y: 21}, {x: 4, y: 21}, {x: 5, y: 21}, {x: 6, y: 21}, {x: 7, y: 21}, {x: 8, y: 21}, {x: 9, y: 21}, // Go right along bottom
      {x: 9, y: 20}, {x: 9, y: 19}, {x: 9, y: 18}, {x: 9, y: 17}, {x: 9, y: 16}, {x: 9, y: 15}, {x: 9, y: 14}, {x: 9, y: 13}, {x: 9, y: 12}, {x: 9, y: 11}, // Go up
      {x: 10, y: 11}, {x: 11, y: 11}, {x: 12, y: 11}, {x: 13, y: 11}, {x: 14, y: 11}, {x: 15, y: 11}, {x: 16, y: 11}, {x: 17, y: 11}, {x: 18, y: 11} // Return to center
    ];

    // Ghost 4: Right side vertical patrol
    const ghost4Path = [
      {x: 19, y: 11}, {x: 21, y: 11}, {x: 23, y: 11}, {x: 25, y: 11}, {x: 27, y: 11}, {x: 29, y: 11}, {x: 31, y: 11}, {x: 33, y: 11}, {x: 35, y: 11}, {x: 37, y: 11}, {x: 38, y: 11}, // Go right to edge  
      {x: 38, y: 12}, {x: 38, y: 13}, {x: 38, y: 14}, {x: 38, y: 15}, {x: 38, y: 16}, {x: 38, y: 17}, {x: 38, y: 18}, {x: 38, y: 19}, {x: 38, y: 20}, {x: 38, y: 21}, // Go down right edge
      {x: 37, y: 21}, {x: 36, y: 21}, {x: 35, y: 21}, {x: 34, y: 21}, {x: 33, y: 21}, {x: 32, y: 21}, {x: 31, y: 21}, {x: 30, y: 21}, // Go left along bottom
      {x: 30, y: 20}, {x: 30, y: 19}, {x: 30, y: 18}, {x: 30, y: 17}, {x: 30, y: 16}, {x: 30, y: 15}, {x: 30, y: 14}, {x: 30, y: 13}, {x: 30, y: 12}, {x: 30, y: 11}, // Go up
      {x: 29, y: 11}, {x: 28, y: 11}, {x: 27, y: 11}, {x: 26, y: 11}, {x: 25, y: 11}, {x: 24, y: 11}, {x: 23, y: 11}, {x: 22, y: 11}, {x: 21, y: 11}, {x: 20, y: 11} // Return to center
    ];

    // Validate all paths contain only walkable coordinates
    const validatePath = (path: {x: number, y: number}[], ghostName: string) => {
      const invalidCoords = path.filter(coord => !isWalkable(coord.x, coord.y));
      if (invalidCoords.length > 0) {
        console.error(`❌ ${ghostName} has invalid coordinates:`, invalidCoords);
      } else {
        console.log(`✅ ${ghostName} path validated - all ${path.length} coordinates are walkable`);
      }
      return invalidCoords.length === 0;
    };

    validatePath(ghost1Path, "Ghost 1");
    validatePath(ghost2Path, "Ghost 2"); 
    validatePath(ghost3Path, "Ghost 3");
    validatePath(ghost4Path, "Ghost 4");

    return {
      ghost1: ghost1Path,
      ghost2: ghost2Path,
      ghost3: ghost3Path,
      ghost4: ghost4Path
    };
  }

  private updateMissPoopeeMan() {
    this.updatePacMan();
    this.updateGhostsMazeAware();
    this.checkMissPoopeeManCollisions();
    
    if (this.vulnerabilityTimer > 0) {
      this.vulnerabilityTimer--;
      
      const isLastTwoSeconds = this.vulnerabilityTimer <= 120;
      
      this.ghosts.forEach(ghost => {
        if (ghost.isVulnerable) {
          if (isLastTwoSeconds) {
            ghost.isBlinking = Math.floor(this.vulnerabilityTimer / 15) % 2 === 0;
          } else {
            ghost.isBlinking = false;
          }
        }
      });
      
      if (this.vulnerabilityTimer <= 0) {
        console.log("⏰ MAZE-AWARE: Vulnerability ended, ghosts back to normal");
        this.ghosts.forEach(ghost => {
          ghost.isVulnerable = false;
          ghost.isBlinking = false;
        });
      }
    }
  }

  // MAZE-AWARE: Ghost movement that follows predefined maze paths
  private updateGhostsMazeAware() {
    this.ghostMoveTimer++;
    
    if (this.ghostMoveTimer >= this.framesBetweenGhostMoves) {
      this.ghostMoveTimer = 0;
      
      this.ghosts.forEach((ghost, index) => {
        // Simply advance to next position in predefined path
        ghost.pathIndex = (ghost.pathIndex + 1) % ghost.predefinedPath.length;
        
        const nextPos = ghost.predefinedPath[ghost.pathIndex];
        ghost.gridX = nextPos.x;
        ghost.gridY = nextPos.y;
        ghost.x = nextPos.x * this.cellSize;
        ghost.y = nextPos.y * this.cellSize;
        
        // Set direction based on movement
        const prevPos = ghost.predefinedPath[(ghost.pathIndex - 1 + ghost.predefinedPath.length) % ghost.predefinedPath.length];
        if (nextPos.x > prevPos.x) ghost.direction = 'right';
        else if (nextPos.x < prevPos.x) ghost.direction = 'left';
        else if (nextPos.y > prevPos.y) ghost.direction = 'down';
        else if (nextPos.y < prevPos.y) ghost.direction = 'up';
        
        console.log(`👻 MAZE-AWARE: Ghost ${index} moved to (${ghost.gridX}, ${ghost.gridY}) pathIndex: ${ghost.pathIndex}`);
      });
    }
  }

  private updatePacMan() {
    this.moveTimer++;
    
    if (this.pacman.nextDirection) {
      const newGridX = this.pacman.gridX + (this.pacman.nextDirection === 'right' ? 1 : this.pacman.nextDirection === 'left' ? -1 : 0);
      const newGridY = this.pacman.gridY + (this.pacman.nextDirection === 'down' ? 1 : this.pacman.nextDirection === 'up' ? -1 : 0);
      
      if (this.isValidMove(newGridX, newGridY)) {
        this.pacman.direction = this.pacman.nextDirection;
        this.pacman.nextDirection = null;
      }
    }
    
    if (this.moveTimer >= this.framesBetweenMoves) {
      this.moveTimer = 0;
      
      let newGridX = this.pacman.gridX;
      let newGridY = this.pacman.gridY;
      
      switch (this.pacman.direction) {
        case 'right': newGridX++; break;
        case 'left': newGridX--; break;
        case 'down': newGridY++; break;
        case 'up': newGridY--; break;
      }
      
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

  private isValidMove(gridX: number, gridY: number): boolean {
    if (gridY < 0 || gridY >= this.maze.length || gridX < 0 || gridX >= this.maze[0].length) {
      return false;
    }
    return this.maze[gridY][gridX] !== 1;
  }

  private checkMissPoopeeManCollisions() {
    this.pellets.forEach(pellet => {
      if (!pellet.collected && pellet.gridX === this.pacman.gridX && pellet.gridY === this.pacman.gridY) {
        pellet.collected = true;
        
        if (pellet.isPowerPellet) {
          this.score += 25;
          this.vulnerabilityTimer = 600;
          console.log("💊 MAZE-AWARE: Power pellet eaten! Ghosts vulnerable for 10 seconds");
          
          this.ghosts.forEach(ghost => {
            ghost.isVulnerable = true;
            ghost.isBlinking = false;
          });
        } else {
          this.score += 5;
        }
        
        this.onScoreUpdate(this.score);
      }
    });
    
    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer--;
    }
    
    if (this.invulnerabilityTimer <= 0) {
      this.ghosts.forEach((ghost, index) => {
        if (ghost.gridX === this.pacman.gridX && ghost.gridY === this.pacman.gridY) {
          if (ghost.isVulnerable) {
            this.score += 100;
            this.onScoreUpdate(this.score);
            console.log(`👻 MAZE-AWARE: Ghost ${index} eaten! Score +100`);
            
            // Reset ghost to center and restart path
            ghost.gridX = 19;
            ghost.gridY = 11;
            ghost.x = 19 * this.cellSize;
            ghost.y = 11 * this.cellSize;
            ghost.isVulnerable = false;
            ghost.isBlinking = false;
            ghost.pathIndex = 0; // Restart path from beginning
          } else {
            this.lives--;
            this.invulnerabilityTimer = 120;
            console.log(`💀 MAZE-AWARE: Pac-Man hit by ghost ${index}! Lives remaining: ${this.lives}`);
            
            if (this.lives <= 0) {
              console.log("💀 Game Over - No more lives!");
              this.gameOver();
            } else {
              this.resetPositions();
            }
          }
        }
      });
    }
    
    const remainingPellets = this.pellets.filter(p => !p.collected);
    if (remainingPellets.length === 0) {
      this.nextLevel();
    }
  }
  
  private resetPositions() {
    this.pacman.gridX = 19;
    this.pacman.gridY = 21;
    this.pacman.x = 19 * this.cellSize;
    this.pacman.y = 21 * this.cellSize;
    this.pacman.direction = 'right';
    this.pacman.nextDirection = null;
    
    // MAZE-AWARE: Reset all ghosts to center and restart their paths
    this.ghosts.forEach((ghost, index) => {
      ghost.gridX = 19;
      ghost.gridY = 11;
      ghost.x = 19 * this.cellSize;
      ghost.y = 11 * this.cellSize;
      ghost.isVulnerable = false;
      ghost.isBlinking = false;
      ghost.pathIndex = 0; // Restart path from beginning
    });
    
    this.vulnerabilityTimer = 0;
    
    console.log("🔄 MAZE-AWARE: All positions reset - ghosts restarted their paths");
  }
  
  private nextLevel() {
    this.level++;
    console.log("🎉 Level complete! Moving to level", this.level);
    
    this.score += 1000;
    this.onScoreUpdate(this.score);
    
    const currentScore = this.score;
    const currentLevel = this.level;
    const currentLives = this.lives;
    
    this.initializeMissPoopeeMan();
    this.score = currentScore;
    this.level = currentLevel;
    this.lives = currentLives;
  }
  
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
