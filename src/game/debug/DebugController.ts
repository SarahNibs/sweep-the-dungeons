import { GameState } from '../../types'
import { checkGameStatus } from '../cardEffects'
import { calculateCopperReward } from '../levelSystem'

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
   * Give player a specific relic (with special effects)
   */
  debugGiveRelic(relicName: string): void {
    console.log(`🎯 DEBUG: debugGiveRelic called with "${relicName}"`)
    const currentState = this.getState()
    console.log('Current relics:', currentState.relics.map(r => r.name))

    // Import dynamically to avoid require issues
    import('../gameRepository').then(({ getAllRelics }) => {
      const allRelics = getAllRelics()
      console.log('All available relics:', allRelics.map((r: any) => r.name))

      const relic = allRelics.find((r: any) => r.name === relicName)

      if (!relic) {
        console.warn(`❌ Relic "${relicName}" not found in getAllRelics()`)
        return
      }

      // Check if already has this relic
      if (currentState.relics.some(r => r.name === relicName)) {
        console.warn(`❌ Already has relic "${relicName}"`)
        return
      }

      console.log(`🎁 DEBUG: Giving relic "${relicName}"`, relic)

      // Add the relic to the collection first, and mark as debug addition
      let newState = {
        ...currentState,
        relics: [...currentState.relics, relic],
        debugRelicAddition: true // Flag to prevent level advancement
      }

      // Apply special relic effects for relics that modify the deck
      import('../relics').then(({ applyEstrogenEffect, applyProgesteroneEffect, applyBootsEffect, applyCrystalEffect, applyBroomClosetEffect, applyNovelEffect, applyCocktailEffect }) => {
        let effectState: any = newState // Use any to avoid type issues with debugRelicAddition

        if (relic.name === 'Estrogen') {
          effectState = { ...applyEstrogenEffect(newState), debugRelicAddition: true, gamePhase: currentState.gamePhase }
        } else if (relic.name === 'Progesterone') {
          effectState = { ...applyProgesteroneEffect(newState), debugRelicAddition: true, gamePhase: currentState.gamePhase }
        } else if (relic.name === 'Boots') {
          effectState = { ...applyBootsEffect(newState), debugRelicAddition: true, gamePhase: currentState.gamePhase }
        } else if (relic.name === 'Crystal') {
          effectState = { ...applyCrystalEffect(newState), debugRelicAddition: true, gamePhase: currentState.gamePhase }
        } else if (relic.name === 'Broom Closet') {
          effectState = { ...applyBroomClosetEffect(newState), debugRelicAddition: true, gamePhase: currentState.gamePhase }
        } else if (relic.name === 'Novel') {
          effectState = { ...applyNovelEffect(newState), debugRelicAddition: true, gamePhase: currentState.gamePhase }
        } else if (relic.name === 'Cocktail') {
          effectState = { ...applyCocktailEffect(newState), debugRelicAddition: true, gamePhase: currentState.gamePhase }
        } else {
          effectState = newState
        }

        console.log('New relics after update:', effectState.relics.map((r: any) => r.name))
        this.setState(effectState)
        console.log('✅ debugGiveRelic completed')
      }).catch(err => {
        console.error('Failed to import relic effects:', err)
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

      // Get AI info for status effect
      const ai = AIRegistry.create(aiType)

      // Remove existing AI status effect and add new one
      const filteredEffects = currentState.activeStatusEffects.filter(e => e.type !== 'rival_ai_type')
      const newStatusEffect = {
        id: crypto.randomUUID(),
        type: 'rival_ai_type' as const,
        icon: ai.icon,
        name: ai.name,
        description: ai.description
      }

      const newState = {
        ...currentState,
        aiTypeOverride: aiType, // Set the override for AIController to use
        activeStatusEffects: [...filteredEffects, newStatusEffect]
      }

      console.log(`✅ Changed rival AI to: ${ai.name}`)
      console.log(`   Next rival turn will use AI type: ${aiType}`)
      this.setState(newState)
    }).catch(err => {
      console.error('Failed to change AI type:', err)
    })
  }

  /**
   * Skip to a specific level (preserving deck/relics/copper)
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

        // Create a new initial state for this level, preserving deck/relics/copper
        const newState = createInitialState(levelId)

        this.setState({
          ...newState,
          persistentDeck: currentState.persistentDeck,
          relics: currentState.relics,
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
