import { GameState } from '../../types'
import { addStatusEffect } from '../gameRepository'

export function executeForgorEffect(state: GameState, card?: import('../../types').Card): GameState {
  // Add status effect that will cause the next card to be played twice
  return addStatusEffect(state, 'forgor_next', card?.enhanced)
}