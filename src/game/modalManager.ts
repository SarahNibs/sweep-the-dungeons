import { GameState, Card, ScreenContinuation, ModalEntry } from '../types'
import { advanceToNextLevel } from './cardSystem'
import { startShopSelection } from './shopSystem'
import { shouldShowShopReward } from './levelSystem'

/**
 * Push equipment upgrade modal with explicit continuation
 * This ensures we always know where to return after showing upgrade results
 */
export function pushEquipmentUpgradeModal(
  state: GameState,
  results: { before: Card; after: Card }[],
  continuation: ScreenContinuation
): GameState {
  const modalEntry: ModalEntry = {
    modalType: 'equipment_upgrade_display',
    continuation
  }

  return {
    ...state,
    modalStack: [...state.modalStack, modalEntry],
    equipmentUpgradeResults: results
  }
}

/**
 * Push viewing pile modal (for deck/discard/exhaust viewing)
 * No continuation needed - always returns to current screen
 */
export function pushViewingPileModal(
  state: GameState,
  pileType: 'deck' | 'discard' | 'exhaust'
): GameState {
  const modalEntry: ModalEntry = {
    modalType: 'viewing_pile',
    continuation: undefined // No continuation - just returns to same screen
  }

  return {
    ...state,
    modalStack: [...state.modalStack, modalEntry],
    pileViewingType: pileType
  }
}

/**
 * Close the top modal and apply its continuation
 * This is the centralized place for all modal navigation logic
 */
export function closeTopModal(state: GameState): GameState {
  if (state.modalStack.length === 0) {
    return state
  }

  const topModal = state.modalStack[state.modalStack.length - 1]
  const newStack = state.modalStack.slice(0, -1)

  // Start with base state (modal popped, results cleared)
  let newState: GameState = {
    ...state,
    modalStack: newStack,
    equipmentUpgradeResults: undefined,
    pileViewingType: undefined
  }

  // Apply continuation if present
  if (topModal.continuation) {
    const { returnTo, preservedState } = topModal.continuation

    switch (returnTo) {
      case 'shop':
        // Return to shop with preserved state
        newState = {
          ...newState,
          gamePhase: 'shop_selection',
          ...preservedState
        }
        break

      case 'playing':
        // Return to playing floor (debug context)
        newState = {
          ...newState,
          gamePhase: 'playing',
          equipmentOptions: undefined,
          waitingForCardRemoval: false,
          bootsTransformMode: false
        }
        break

      case 'reward_flow':
        // Continue reward flow: shop or next level
        if (shouldShowShopReward(newState.currentLevelId)) {
          newState = startShopSelection(newState)
        } else {
          newState = advanceToNextLevel(newState)
        }
        break
    }
  }

  return newState
}
