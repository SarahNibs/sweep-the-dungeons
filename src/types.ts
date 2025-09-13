export interface Card {
  id: string
  name: string
  cost: number
}

export interface GameState {
  deck: Card[]
  hand: Card[]
  discard: Card[]
  selectedCardName: string | null
  energy: number
  maxEnergy: number
}

export type CardZone = 'deck' | 'hand' | 'discard'