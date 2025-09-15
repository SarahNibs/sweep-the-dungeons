export interface Card {
  id: string
  name: string
  cost: number
}

export type CardEffect = 
  | { type: 'scout'; target: Position }
  | { type: 'quantum'; targets: [Position, Position] }
  | { type: 'report' }
  | { type: 'solid_clue' }
  | { type: 'stretch_clue' }

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
  owner: 'player' | 'enemy' | 'neutral' | 'mine'
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
  level: number
  revealEnemyTileAtStart: boolean
  // Future level customizations can go here:
  // boardSize?: { width: number, height: number }
  // startingEnergy?: number
  // specialCards?: string[]
  // enemyBehavior?: 'normal' | 'aggressive' | 'defensive'
}

export interface GameState {
  deck: Card[]
  hand: Card[]
  discard: Card[]
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
  currentLevel: number
  enemyAnimation: {
    isActive: boolean
    highlightedTile: Position | null
    revealsRemaining: Tile[]
    currentRevealIndex: number
  } | null
}

export type CardZone = 'deck' | 'hand' | 'discard'