import { GameState, Tile, LevelConfig } from '../../types'

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

  // Core AI decision making - now uses rivalIntentPoints instead of clues
  selectTilesToReveal(
    state: GameState,
    rivalIntentPoints: { [key: string]: number },
    context: AIContext
  ): Tile[]

  // Optional: Turn-specific behavior modifiers
  getTurnModifiers?(state: GameState, turnNumber: number): AIModifiers
}

export interface AITurnResult {
  stateWithVisibleClues: GameState
  tilesToReveal: Tile[]
}