import { GameState } from '../types'

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
 *
 * Does NOT clear:
 * - Modal state (modalStack, equipmentUpgradeResults, pileViewingType) - managed by modal system
 * - Persistent state (shopVisitCount) - persists across floors
 */
export function clearRewardScreenState(state: GameState): GameState {
  return {
    ...state,
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
