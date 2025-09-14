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
  cardType: 'solid_clue' | 'stretch_clue'
  strengthForThisTile: number // How many pips this clue contributed to this specific tile
  allAffectedTiles: Position[] // All tiles that got pips from this clue
}

export interface TileAnnotation {
  type: 'safe' | 'unsafe' | 'enemy' | 'clue_results'
  clueResults?: ClueResult[] // For clue strength annotations
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
  owner: 'player' | 'enemy' | 'neutral' | 'assassin'
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

export interface GameState {
  deck: Card[]
  hand: Card[]
  discard: Card[]
  selectedCardName: string | null
  energy: number
  maxEnergy: number
  board: Board
  currentPlayer: 'player' | 'enemy'
  pendingCardEffect: CardEffect | null
  eventQueue: GameEvent[]
}

export type CardZone = 'deck' | 'hand' | 'discard'