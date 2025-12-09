import { GameState } from '../types'

/**
 * Clears adjacency_info annotations from all tiles on the board.
 * This is needed when leaving the playing phase to prevent Eavesdropping
 * info from showing through on reward screens.
 */
function clearAdjacencyInfoAnnotations(state: GameState): GameState {
  const newTiles = new Map(state.board.tiles)

  for (const [key, tile] of state.board.tiles) {
    // Filter out adjacency_info annotations
    const filteredAnnotations = tile.annotations.filter(a => a.type !== 'adjacency_info')

    // Only update the tile if it had adjacency_info annotations
    if (filteredAnnotations.length !== tile.annotations.length) {
      newTiles.set(key, {
        ...tile,
        annotations: filteredAnnotations
      })
    }
  }

  return {
    ...state,
    board: {
      ...state.board,
      tiles: newTiles
    }
  }
}

/**
 * Clears all reward screen state to prevent state leakage between different reward screens.
 *
 * This should be called at the start of each reward screen initialization function
 * (startCardSelection, startUpgradeSelection, startEquipmentSelection, startShopSelection)
 * to ensure a clean slate.
 *
 * Clears:
 * - All reward screen options (cardSelectionOptions, upgradeOptions, equipmentOptions, shopOptions, purchasedShopItems)
 * - Shared interaction state (waitingForCardRemoval, pendingUpgradeOption, bootsTransformMode)
 * - Adjacency info annotations (from Eavesdropping, etc.)
 *
 * Does NOT clear:
 * - Modal state (modalStack, equipmentUpgradeResults, pileViewingType) - managed by modal system
 * - Persistent state (shopVisitCount) - persists across floors
 */
export function clearRewardScreenState(state: GameState): GameState {
  // First clear adjacency info from board
  const stateWithClearedBoard = clearAdjacencyInfoAnnotations(state)

  return {
    ...stateWithClearedBoard,
    // Clear all reward screen options
    cardSelectionOptions: undefined,
    upgradeOptions: undefined,
    equipmentOptions: undefined,
    shopOptions: undefined,
    purchasedShopItems: undefined,

    // Clear shared interaction state
    waitingForCardRemoval: false,
    pendingUpgradeOption: undefined,
    bootsTransformMode: false
  }
}
