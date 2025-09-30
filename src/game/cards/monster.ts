import { GameState } from '../../types'
import { drawCards } from '../cardSystem'

export function executeMonsterEffect(state: GameState, card?: import('../../types').Card): GameState {
  // Enhanced: Draw 3 cards, Normal: Draw 2 cards
  const cardCount = card?.enhanced ? 3 : 2
  return drawCards(state, cardCount)
}