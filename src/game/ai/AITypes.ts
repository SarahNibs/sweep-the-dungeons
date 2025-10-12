import { GameState, Tile, ClueResult, Position, LevelConfig } from '../../types'

export interface RivalClueSet {
  visible: ClueResult[] // X marks shown to player
  hidden: ClueResult[]  // AI-only information
  visiblePairs: { clueResult: ClueResult, targetPosition: Position }[]
  hiddenPairs: { clueResult: ClueResult, targetPosition: Position }[]
}

export interface AIContext {
  levelConfig: LevelConfig
  turnNumber: number
  specialBehaviors: {
    rivalNeverMines?: boolean
    adjacencyRule?: 'standard' | 'manhattan-2'
    initialRivalReveal?: number
  }
}

export interface AIModifiers {
  aggressiveness: number    // 0-1 scale affecting risk tolerance
  priorityBoost: number     // Additional random factor
  avoidMines: boolean       // Override for mine avoidance
}

export interface RivalAI {
  readonly name: string
  readonly description: string
  readonly icon: string
  
  // Core AI decision making
  selectTilesToReveal(
    state: GameState, 
    hiddenClues: { clueResult: ClueResult, targetPosition: Position }[],
    context: AIContext
  ): Tile[]
  
  // Optional: Custom clue generation behavior
  generateClues?(state: GameState): RivalClueSet
  
  // Optional: Turn-specific behavior modifiers
  getTurnModifiers?(state: GameState, turnNumber: number): AIModifiers
}

export interface AITurnResult {
  stateWithVisibleClues: GameState
  hiddenClues: ClueResult[]
  tilesToReveal: Tile[]
}