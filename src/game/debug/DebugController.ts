import { GameState } from '../../types'
import { checkGameStatus } from '../cardEffects'
import { calculateCopperReward } from '../levelSystem'
import { createAIStatusEffect } from '../gameRepository'

/**
 * Helper function to update state and award copper if game was just won
 */
function updateStateWithCopperReward(
  set: (state: GameState) => void,
  get: () => GameState,
  newState: GameState
): void {

  const previousState = get()
  const wasPlaying = previousState.gameStatus.status === 'playing'
  const isNowWon = newState.gameStatus.status === 'player_won'

  let finalState
  if (wasPlaying && isNowWon) {
    // Player just won - award copper immediately
    const copperReward = calculateCopperReward(newState)
    finalState = {
      ...newState,
      copper: newState.copper + copperReward
    }
  } else {
    finalState = newState
  }


  set(finalState)

}

/**
 * DebugController provides debug/cheat functions
 * Separated from production store to keep it clean
 */
export class DebugController {
  constructor(
    private getState: () => GameState,
    private setState: (state: Partial<GameState> | GameState) => void
  ) {}

  /**
   * Instantly win the current level by revealing all player tiles
   */
  debugWinLevel(): void {
    const currentState = this.getState()
    if (currentState.gameStatus.status !== 'playing') return

    // Force win by setting all player tiles as revealed
    const newTiles = new Map(currentState.board.tiles)
    for (const [key, tile] of newTiles) {
      if (tile.owner === 'player' && !tile.revealed) {
        newTiles.set(key, {
          ...tile,
          revealed: true,
          revealedBy: 'player',
          adjacencyCount: 0 // Don't bother calculating, just set to 0 for debug
        })
      }
    }

    const newBoard = {
      ...currentState.board,
      tiles: newTiles
    }

    const gameStatus = checkGameStatus({
      ...currentState,
      board: newBoard
    })

    const stateWithGameStatus = {
      ...currentState,
      board: newBoard,
      gameStatus
    }

    updateStateWithCopperReward(this.setState.bind(this), this.getState, stateWithGameStatus)
  }

  /**
   * Give player a specific equipment (with special effects)
   */
  debugGiveEquipment(equipmentName: string): void {
    const currentState = this.getState()

    // Import dynamically to avoid require issues
    import('../gameRepository').then(({ getAllEquipment }) => {
      const allEquipment = getAllEquipment()

      const equipment = allEquipment.find((r: any) => r.name === equipmentName)

      if (!equipment) {
        return
      }

      // Check if already has this equipment
      if (currentState.equipment.some(r => r.name === equipmentName)) {
        return
      }


      // Add the equipment to the collection first, and mark as debug addition
      // Keep the current gamePhase ('playing') so the modal will overlay it correctly
      let newState = {
        ...currentState,
        equipment: [...currentState.equipment, equipment],
        equipmentUpgradeContext: 'debug' as const // Mark as debug context
      }

      // Apply special equipment effects for equipment that modify the deck
      // These will push the equipment_upgrade_display modal on top of 'playing' phase
      import('../equipment').then(({ applyEstrogenEffect, applyProgesteroneEffect, applyBootsEffect, applyCrystalEffect, applyBroomClosetEffect, applyNovelEffect, applyCocktailEffect, applyDiscoBallEffect, applyBleachEffect }) => {
        let effectState: any = newState

        if (equipment.name === 'Estrogen') {
          effectState = applyEstrogenEffect(newState)
        } else if (equipment.name === 'Progesterone') {
          effectState = applyProgesteroneEffect(newState)
        } else if (equipment.name === 'Boots') {
          effectState = applyBootsEffect(newState)
        } else if (equipment.name === 'Crystal') {
          effectState = applyCrystalEffect(newState)
        } else if (equipment.name === 'Broom Closet') {
          effectState = applyBroomClosetEffect(newState)
        } else if (equipment.name === 'Novel') {
          effectState = applyNovelEffect(newState)
        } else if (equipment.name === 'Cocktail') {
          effectState = applyCocktailEffect(newState)
        } else if (equipment.name === 'Disco Ball') {
          effectState = applyDiscoBallEffect(newState)
        } else if (equipment.name === 'Bleach') {
          effectState = applyBleachEffect(newState)
        } else {
          effectState = newState
        }

        this.setState(effectState)
      }).catch(() => {
      })
    }).catch(() => {
    })
  }

  /**
   * Give player a specific card (optionally with upgrades)
   */
  debugGiveCard(cardName: string, upgrades?: { energyReduced?: boolean; enhanced?: boolean }): void {
    const currentState = this.getState()

    // Import dynamically to avoid require issues
    import('../gameRepository').then(({ createCard }) => {
      const card = createCard(cardName, upgrades)

      const newState = {
        ...currentState,
        hand: [...currentState.hand, card]
      }
      this.setState(newState)
    }).catch(() => {
    })
  }

  /**
   * Change the rival AI type
   */
  debugSetAIType(aiType: string): void {
    const currentState = this.getState()

    // Import dynamically
    import('../ai/AIRegistry').then(({ AIRegistry }) => {
      // Check if AI type exists
      if (!AIRegistry.hasType(aiType)) {
        return
      }

      // Remove existing AI status effect and add new one using centralized metadata
      const filteredEffects = currentState.activeStatusEffects.filter(e => e.type !== 'rival_ai_type')
      const newStatusEffect = createAIStatusEffect(aiType)

      const newState = {
        ...currentState,
        aiTypeOverride: aiType, // Set the override for AIController to use
        activeStatusEffects: [...filteredEffects, newStatusEffect]
      }

      this.setState(newState)
    }).catch(() => {
    })
  }

  /**
   * Skip to a specific level (preserving deck/equipment/copper)
   */
  debugSkipToLevel(levelId: string): void {

    // Import dynamically
    import('../levelSystem').then(({ getLevelConfig }) => {
      import('../cardSystem').then(({ createInitialState }) => {
        const levelConfig = getLevelConfig(levelId)

        if (!levelConfig) {
          return
        }

        const currentState = this.getState()

        // Create a new initial state for this level, preserving deck/equipment/copper
        const newState = createInitialState(levelId)

        this.setState({
          ...newState,
          persistentDeck: currentState.persistentDeck,
          equipment: currentState.equipment,
          copper: currentState.copper
        })

      }).catch(() => {
      })
    }).catch(() => {
    })
  }
}
