export type PileType = 'deck' | 'discard' | 'exhaust'

export interface Card {
  id: string
  name: string
  cost: number
  exhaust?: boolean // If true, card is removed from deck after use
}

export type CardEffect = 
  | { type: 'scout'; target: Position }
  | { type: 'quantum'; targets: [Position, Position] }
  | { type: 'report' }
  | { type: 'solid_clue' }
  | { type: 'stretch_clue' }
  | { type: 'energized' }
  | { type: 'options' }
  | { type: 'brush'; target: Position }
  | { type: 'ramble' }

export interface ClueResult {
  id: string // Unique identifier for this clue cast
  cardType: 'solid_clue' | 'stretch_clue' | 'enemy_clue'
  strengthForThisTile: number // How many pips this clue contributed to this specific tile
  allAffectedTiles: Position[] // All tiles that got pips from this clue
  clueOrder: number // Order in which this clue was played (1st, 2nd, 3rd...)
  clueRowPosition: number // Row position for this clue type (player/enemy separate)
}

export interface TileAnnotation {
  type: 'safe' | 'unsafe' | 'enemy' | 'clue_results' | 'owner_subset' | 'player_slash'
  clueResults?: ClueResult[] // For clue strength annotations
  ownerSubset?: Set<'player' | 'enemy' | 'neutral' | 'mine'> // For subset annotations
}

export interface GameStatusInfo {
  status: 'playing' | 'player_won' | 'player_lost'
  reason?: 'player_revealed_mine' | 'enemy_revealed_mine' | 'all_player_tiles_revealed' | 'all_enemy_tiles_revealed'
  enemyTilesLeft?: number
}

export type GameEvent = 
  | { type: 'card_effect'; effect: CardEffect; cardId: string }
  | { type: 'tile_annotated'; position: Position; annotation: TileAnnotation }

export interface Position {
  x: number
  y: number
}

export interface Tile {
  position: Position
  owner: 'player' | 'enemy' | 'neutral' | 'mine' | 'empty'
  revealed: boolean
  revealedBy: 'player' | 'enemy' | null
  adjacencyCount: number | null
  annotations: TileAnnotation[]
}

export interface Board {
  width: number
  height: number
  tiles: Map<string, Tile>
}

export interface LevelConfig {
  levelNumber: number
  levelId: string
  uponFinish: {
    cardReward: boolean
    relicReward: boolean
    upgradeReward: boolean
    shopReward: boolean
    winTheGame: boolean
    nextLevel: string[]
  }
  description: string
  dimensions: {
    columns: number
    rows: number
  }
  tileCounts: {
    player: number
    enemy: number
    neutral: number
    mine: number
  }
  unusedLocations: number[][]
  specialTiles: any[]
  specialBehaviors: any
}

export interface GameState {
  // Persistent deck - all cards the player owns across levels
  persistentDeck: Card[]
  // In-play state - only used during levels, reset each level
  deck: Card[] // Draw pile
  hand: Card[]
  discard: Card[]
  exhaust: Card[] // Cards removed from play this level (but still in persistent deck)
  selectedCardName: string | null
  energy: number
  maxEnergy: number
  board: Board
  currentPlayer: 'player' | 'enemy'
  gameStatus: GameStatusInfo
  pendingCardEffect: CardEffect | null
  eventQueue: GameEvent[]
  hoveredClueId: string | null // For highlighting related clue pips and tiles
  clueCounter: number // Counter for clue order (1st, 2nd, 3rd...)
  playerClueCounter: number // Counter for player clue rows
  enemyClueCounter: number // Counter for enemy clue rows
  currentLevelId: string
  gamePhase: 'playing' | 'card_selection' | 'viewing_pile'
  pileViewingType?: PileType
  cardSelectionOptions?: Card[] // Three cards to choose from when advancing level
  // Dual enemy clue system: visible clues (shown as X) vs AI clues (hidden)
  enemyHiddenClues: ClueResult[] // AI-only clues for enemy decision making (not shown to player)
  tingleAnimation: {
    targetTile: Position | null
    isEmphasized: boolean
  } | null
  enemyAnimation: {
    isActive: boolean
    highlightedTile: Position | null
    revealsRemaining: Tile[]
    currentRevealIndex: number
  } | null
  rambleActive: boolean // True if Ramble was played this turn
}

export type CardZone = 'deck' | 'hand' | 'discard'