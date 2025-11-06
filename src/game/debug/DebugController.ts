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
  console.log('🏪 UPDATE STATE WITH COPPER REWARD DEBUG')
  console.log('  - Input state underwireProtection:', newState.underwireProtection)
  console.log('  - Input state activeStatusEffects:', newState.activeStatusEffects.map(e => ({ type: e.type, id: e.id })))
  console.log('  - Input state hand size:', newState.hand.length)
  console.log('  - Input state deck size:', newState.deck.length)

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
    console.log('  - Added copper reward, setting state with copper')
  } else {
    finalState = newState
    console.log('  - No copper reward, setting state as-is')
  }

  console.log('  - Final state underwireProtection:', finalState.underwireProtection)
  console.log('  - Final state activeStatusEffects:', finalState.activeStatusEffects.map(e => ({ type: e.type, id: e.id })))
  console.log('  - Final state hand size:', finalState.hand.length)
  console.log('  - Final state deck size:', finalState.deck.length)

  set(finalState)

  console.log('🏪 STATE SET COMPLETE')
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
    console.log(`🎯 DEBUG: debugGiveEquipment called with "${equipmentName}"`)
    const currentState = this.getState()
    console.log('Current equipment:', currentState.equipment.map(r => r.name))

    // Import dynamically to avoid require issues
    import('../gameRepository').then(({ getAllEquipment }) => {
      const allEquipment = getAllEquipment()
      console.log('All available equipment:', allEquipment.map((r: any) => r.name))

      const equipment = allEquipment.find((r: any) => r.name === equipmentName)

      if (!equipment) {
        console.warn(`❌ Equipment "${equipmentName}" not found in getAllEquipment()`)
        return
      }

      // Check if already has this equipment
      if (currentState.equipment.some(r => r.name === equipmentName)) {
        console.warn(`❌ Already has equipment "${equipmentName}"`)
        return
      }

      console.log(`🎁 DEBUG: Giving equipment "${equipmentName}"`, equipment)

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

        console.log('New equipment after update:', effectState.equipment.map((r: any) => r.name))
        this.setState(effectState)
        console.log('✅ debugGiveEquipment completed')
      }).catch(err => {
        console.error('Failed to import equipment effects:', err)
      })
    }).catch(err => {
      console.error('Failed to import gameRepository:', err)
    })
  }

  /**
   * Give player a specific card (optionally with upgrades)
   */
  debugGiveCard(cardName: string, upgrades?: { energyReduced?: boolean; enhanced?: boolean }): void {
    console.log(`🎯 DEBUG: debugGiveCard called with "${cardName}"`, upgrades)
    const currentState = this.getState()
    console.log('Current hand size:', currentState.hand.length)
    console.log('Current hand cards:', currentState.hand.map(c => c.name))

    // Import dynamically to avoid require issues
    import('../gameRepository').then(({ createCard }) => {
      const card = createCard(cardName, upgrades)

      console.log(`🎁 DEBUG: Created card:`, card)
      const newState = {
        ...currentState,
        hand: [...currentState.hand, card]
      }
      console.log('New hand size after update:', newState.hand.length)
      console.log('New hand cards:', newState.hand.map(c => c.name))
      this.setState(newState)
      console.log('✅ debugGiveCard completed')
    }).catch(err => {
      console.error('Failed to import cardSystem:', err)
    })
  }

  /**
   * Change the rival AI type
   */
  debugSetAIType(aiType: string): void {
    console.log(`🤖 DEBUG: debugSetAIType called with "${aiType}"`)
    const currentState = this.getState()

    // Import dynamically
    import('../ai/AIRegistry').then(({ AIRegistry }) => {
      // Check if AI type exists
      if (!AIRegistry.hasType(aiType)) {
        console.error(`❌ Unknown AI type: ${aiType}`)
        console.log('Available types:', AIRegistry.getAvailableTypes())
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

      console.log(`✅ Changed rival AI to: ${newStatusEffect.name}`)
      console.log(`   Next rival turn will use AI type: ${aiType}`)
      this.setState(newState)
    }).catch(err => {
      console.error('Failed to change AI type:', err)
    })
  }

  /**
   * Skip to a specific level (preserving deck/equipment/copper)
   */
  debugSkipToLevel(levelId: string): void {
    console.log(`🎯 DEBUG: debugSkipToLevel called with "${levelId}"`)

    // Import dynamically
    import('../levelSystem').then(({ getLevelConfig }) => {
      import('../cardSystem').then(({ createInitialState }) => {
        const levelConfig = getLevelConfig(levelId)

        if (!levelConfig) {
          console.error(`❌ Level "${levelId}" not found`)
          return
        }

        console.log(`✅ Skipping to level: ${levelId}`)
        const currentState = this.getState()

        // Create a new initial state for this level, preserving deck/equipment/copper
        const newState = createInitialState(levelId)

        this.setState({
          ...newState,
          persistentDeck: currentState.persistentDeck,
          equipment: currentState.equipment,
          copper: currentState.copper
        })

        console.log(`✅ Now on level: ${levelId}`)
      }).catch(err => {
        console.error('Failed to import cardSystem:', err)
      })
    }).catch(err => {
      console.error('Failed to skip to level:', err)
    })
  }
}
