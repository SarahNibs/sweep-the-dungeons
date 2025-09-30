import { GameState } from '../../types'
import { drawCards } from '../cardSystem'

export function executeOptionsEffect(state: GameState, card?: import('../../types').Card): GameState {
  // Enhanced: Draw 5 cards, Normal: Draw 3 cards
  const cardCount = card?.enhanced ? 5 : 3
  return drawCards(state, cardCount)
}