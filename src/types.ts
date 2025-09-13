export interface Card {
  id: string
  name: string
  cost: number
}

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
}

export type CardZone = 'deck' | 'hand' | 'discard'