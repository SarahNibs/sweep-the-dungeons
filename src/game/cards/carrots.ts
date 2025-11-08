import { GameState, Card } from '../../types'
import { createStatusEffect } from '../gameRepository'

/**
 * Carrots card effect: reveals 1 player tile at the beginning of a floor
 * Base version adds 2 stacks, enhanced adds 3 stacks
 * Each stack lasts for 1 floor completion
 * As long as there are any stacks, reveal +1 player tile at start of floor
 */
export function executeCarrotsEffect(state: GameState, card?: Card): GameState {

  const stacksToAdd = card?.enhanced ? 3 : 2

  // Check if we already have carrots status effect
  const existingCarrots = state.activeStatusEffects.find(e => e.type === 'carrots')

  let newState = state

  if (existingCarrots) {
    // Add more stacks
    const newCount = (existingCarrots.count || 0) + stacksToAdd

    newState = {
      ...state,
      activeStatusEffects: state.activeStatusEffects.map(e =>
        e.type === 'carrots'
          ? {
              ...e,
              count: newCount,
              description: `Reveal +1 player tile at start of floor (${newCount} floor${newCount > 1 ? 's' : ''} remaining)`
            }
          : e
      )
    }
  } else {
    // Create new carrots status effect with stacks using centralized definition
    // Don't pass enhanced flag - the enhanced state is reflected in the count, not the UI indicator
    const baseEffect = createStatusEffect('carrots', false)
    const carrotsEffect = {
      ...baseEffect,
      count: stacksToAdd,
      description: `Reveal +1 player tile at start of floor (${stacksToAdd} floor${stacksToAdd > 1 ? 's' : ''} remaining)`
    }

    newState = {
      ...state,
      activeStatusEffects: [...state.activeStatusEffects, carrotsEffect]
    }
  }

  return newState
}

/**
 * Decrement Carrots stacks when completing a floor
 * Called from advanceToNextLevel
 */
export function decrementCarrotsStacks(state: GameState): GameState {
  const carrotsEffect = state.activeStatusEffects.find(e => e.type === 'carrots')

  if (!carrotsEffect) {
    return state
  }

  const newCount = (carrotsEffect.count || 0) - 1

  if (newCount <= 0) {
    // Remove the effect
    return {
      ...state,
      activeStatusEffects: state.activeStatusEffects.filter(e => e.type !== 'carrots')
    }
  } else {
    // Update count
    return {
      ...state,
      activeStatusEffects: state.activeStatusEffects.map(e =>
        e.type === 'carrots'
          ? {
              ...e,
              count: newCount,
              description: `Reveal +1 player tile at start of floor (${newCount} floor${newCount > 1 ? 's' : ''} remaining)`
            }
          : e
      )
    }
  }
}
