import { GameState, Position, CardEffect, Card } from '../../types'
import { getTile, positionToKey } from '../boardSystem'
import { executeCardEffect } from '../cardEffects'
import { canTargetTile } from '../targetingSystem'
import { deductEnergy, discardHand, cleanupMaskingAfterExecution } from '../cardSystem'
import { shouldRevealEndTurn } from '../boardSystem'

/**
 * Card targeting configuration
 * Maps effect types to their targeting requirements
 */
interface TargetingConfig {
  /** Maximum number of targets required */
  maxTargets: (enhanced: boolean) => number
  /** Whether to execute immediately after receiving a target */
  executeImmediate: boolean
}

const TARGETING_CONFIG: Record<string, TargetingConfig> = {
  scout: {
    maxTargets: () => 1,
    executeImmediate: true
  },
  quantum: {
    maxTargets: (enhanced) => enhanced ? 3 : 2,
    executeImmediate: false // Execute when all targets collected
  },
  brush: {
    maxTargets: () => 1,
    executeImmediate: true
  },
  sweep: {
    maxTargets: () => 1,
    executeImmediate: true
  },
  canary: {
    maxTargets: () => 1,
    executeImmediate: true
  },
  argument: {
    maxTargets: () => 1,
    executeImmediate: true
  },
  horse: {
    maxTargets: () => 1,
    executeImmediate: true
  },
  eavesdropping: {
    maxTargets: () => 1,
    executeImmediate: true
  },
  emanation: {
    maxTargets: () => 1,
    executeImmediate: true
  },
  tryst: {
    maxTargets: () => 1,
    executeImmediate: true
  },
  brat: {
    maxTargets: () => 1,
    executeImmediate: true
  },
  snip_snip: {
    maxTargets: () => 1,
    executeImmediate: true
  },
  gaze: {
    maxTargets: () => 1,
    executeImmediate: true
  },
  fan: {
    maxTargets: () => 1,
    executeImmediate: true
  },
  fetch: {
    maxTargets: () => 1,
    executeImmediate: true
  }
}

/**
 * Helper function to check if card needs animation on target
 */
function needsAnimationOnTarget(cardName: string): boolean {
  return cardName === 'Tryst'
}

/**
 * Helper to remove card from hand and exhaust it
 */
function removeCardAndDeductEnergy(state: GameState, card: Card): GameState {
  const newHand = state.hand.filter(c => c.id !== card.id)
  const newExhaust = [...state.exhaust, card]

  // Deduct energy before card execution
  return deductEnergy(
    {
      ...state,
      hand: newHand,
      exhaust: newExhaust
    },
    card,
    state.activeStatusEffects,
    'removeCardAndDeductEnergy'
  )
}

/**
 * TargetingController handles all card targeting logic
 * Separated from store to reduce complexity
 */
export class TargetingController {
  constructor(
    private getState: () => GameState,
    private setState: (state: Partial<GameState> | GameState) => void,
    private executeTrystWithAnimation: (state: GameState, isEnhanced: boolean, target?: Position) => void,
    private startRivalTurn: (board: import('../../types').Board) => void
  ) {}

  /**
   * Handle targeting a tile for the pending card effect
   */
  targetTileForCard(position: Position): void {
    const currentState = this.getState()
    if (!currentState.pendingCardEffect) return
    if (!currentState.selectedCardId) return
    if (currentState.currentPlayer !== 'player') return

    const tile = getTile(currentState.board, position)

    // Get card to check if it's enhanced
    const card = currentState.hand.find(c => c.id === currentState.selectedCardId)
    if (!card) {
      this.setState({
        ...currentState,
        pendingCardEffect: null,
        selectedCardName: null,
        selectedCardId: null
      })
      return
    }

    // Validate targeting using the targeting system
    const validation = canTargetTile(
      tile,
      currentState.selectedCardName,
      currentState.board,
      position,
      card.enhanced || false
    )

    if (!validation.isValid) {
      // Invalid target, do nothing
      return
    }

    const effect = currentState.pendingCardEffect
    const config = TARGETING_CONFIG[effect.type]

    if (!config) {
      console.warn(`No targeting config for effect type: ${effect.type}`)
      return
    }

    // Build new effect with target(s)
    const result = this.buildEffectWithTarget(effect, position, card.enhanced || false, config)

    if (result.shouldExecute && result.newEffect) {
      this.executeTargetedCard(currentState, card, result.newEffect)
    } else if (result.newEffect) {
      // Need more targets, update pending effect
      this.setState({
        ...currentState,
        pendingCardEffect: result.newEffect
      })
    }
  }

  /**
   * Build new effect with added target
   */
  private buildEffectWithTarget(
    effect: CardEffect,
    position: Position,
    isEnhanced: boolean,
    config: TargetingConfig
  ): { newEffect: CardEffect | null; shouldExecute: boolean } {
    // Handle quantum (multi-target) specially
    if (effect.type === 'quantum') {
      const existingTargets = 'targets' in effect ? effect.targets : []
      const newTargets = [...existingTargets, position]
      const maxTargets = config.maxTargets(isEnhanced)

      const newEffect: CardEffect = { type: 'quantum', targets: newTargets }
      const shouldExecute = newTargets.length >= maxTargets

      return { newEffect, shouldExecute }
    }

    // All other single-target effects
    const newEffect: CardEffect = { type: effect.type, target: position } as CardEffect
    return { newEffect, shouldExecute: config.executeImmediate }
  }

  /**
   * Execute card after all targets have been selected
   */
  private executeTargetedCard(currentState: GameState, card: Card, effect: CardEffect): void {
    // Check if this card needs animation handling
    if (needsAnimationOnTarget(card.name)) {
      // Handle animated targeting cards (currently just Tryst)
      const stateAfterCardRemoval = removeCardAndDeductEnergy(currentState, card)
      const stateWithFlag = { ...stateAfterCardRemoval, isProcessingCard: true }

      // Tryst always has a target when animated
      const target = 'target' in effect ? effect.target : undefined
      this.executeTrystWithAnimation(stateWithFlag, card.enhanced || false, target)
      return
    }

    // Execute the effect with the card for enhanced effects
    let effectState = executeCardEffect(currentState, effect, card)

    // BUGFIX: Remove card from the hand AFTER card effects (which may have drawn cards)
    const newHand = effectState.hand.filter(c => c.id !== card.id)
    // Enhanced Energized cards no longer exhaust
    const baseExhaust = card.exhaust && !(card.name === 'Energized' && card.enhanced)
    const shouldExhaust = baseExhaust || effectState.shouldExhaustLastCard
    // If card has exhaust, put it in exhaust pile; otherwise put in discard
    const newDiscard = shouldExhaust ? effectState.discard : [...effectState.discard, card]
    const newExhaust = shouldExhaust ? [...effectState.exhaust, card] : effectState.exhaust

    // CRITICAL: Use status effects from BEFORE card executed to calculate cost
    // This prevents cards like Horse from seeing their own discount status effect
    // IMPORTANT: Cards played via Masking should be free (don't deduct energy)
    let finalState: GameState
    if (currentState.maskingState) {
      // Card played via Masking - don't deduct energy, just cleanup masking state
      // IMPORTANT: Keep selectedCardId so cleanup can find the card and apply energyReduced bonus
      const stateBeforeCleanup = {
        ...effectState,
        hand: newHand,
        discard: newDiscard,
        exhaust: newExhaust,
        pendingCardEffect: null,
        shouldExhaustLastCard: false // Reset after use
        // DON'T clear selectedCardId yet - cleanup needs it
      }
      finalState = cleanupMaskingAfterExecution(stateBeforeCleanup as GameState)
      // Clear selectedCardId after cleanup is done
      finalState = {
        ...finalState,
        selectedCardId: null
      }
    } else {
      // Normal card - deduct energy
      const stateBeforeEnergy = {
        ...effectState,
        hand: newHand,
        discard: newDiscard,
        exhaust: newExhaust,
        pendingCardEffect: null,
        selectedCardId: null,
        shouldExhaustLastCard: false // Reset after use
      }
      finalState = deductEnergy(stateBeforeEnergy, card, currentState.activeStatusEffects, 'targetTileForCard (general)')
    }

    // Check if the effect revealed a tile that should end the turn
    const shouldEndTurn = this.checkShouldEndTurn(currentState, effectState, effect)

    if (shouldEndTurn) {
      // Clear espressoForcedPlay flag if it was set
      if (currentState.espressoForcedPlay) {
        console.log('☕ ESPRESSO: Card played and turn ending, clearing forced play flag')
        finalState = {
          ...finalState,
          espressoForcedPlay: undefined
        }
      }

      const discardedState = discardHand(finalState)
      this.setState(discardedState)
      this.startRivalTurn(discardedState.board)
      return
    }

    console.log('🎯 SETTING FINAL STATE FROM CARD EFFECT')
    console.log('  - Card played:', card.name)
    console.log('  - Effect type:', effect.type)
    console.log('  - Final state hand size:', finalState.hand.length)
    console.log('  - Final state deck size:', finalState.deck.length)
    console.log('  - Final state activeStatusEffects:', finalState.activeStatusEffects.map(e => ({ type: e.type, id: e.id })))

    // Clear espressoForcedPlay flag if it was set
    if (currentState.espressoForcedPlay) {
      console.log('☕ ESPRESSO: Card successfully played, clearing forced play flag')
      finalState = {
        ...finalState,
        espressoForcedPlay: undefined
      }
    }

    this.setState(finalState)
  }

  /**
   * Check if turn should end after card execution
   */
  private checkShouldEndTurn(
    currentState: GameState,
    effectState: GameState,
    effect: CardEffect
  ): boolean {
    // Check quantum-specific turn ending
    if (effect.type === 'quantum' && 'targets' in effect) {
      // Check all targets (base has 2, enhanced has 3)
      for (const pos of effect.targets) {
        const tileBefore = currentState.board.tiles.get(positionToKey(pos))
        const tileAfter = effectState.board.tiles.get(positionToKey(pos))

        // Check if this tile was revealed by comparing board states
        if (tileBefore && tileAfter && !tileBefore.revealed && tileAfter.revealed) {
          // Check if turn should end using centralized function
          if (shouldRevealEndTurn(effectState, tileAfter)) {
            console.log('🔄 QUANTUM ENDING TURN - Revealed non-player tile')
            return true
          }
        }
      }
    }

    // Check Horse-specific turn ending
    // Horse sets horseRevealedNonPlayer flag when it reveals non-player tiles
    // We still need to check Frilly Dress which is now handled in the centralized check
    if (effect.type === 'horse' && effectState.horseRevealedNonPlayer) {
      // Check if Frilly Dress would prevent turn ending
      // This happens when revealing neutrals (up to 6) on first turn
      const hasFrillyDress = effectState.equipment.some(r => r.name === 'Frilly Dress')
      const frillyDressPrevents = hasFrillyDress && effectState.isFirstTurn && effectState.neutralsRevealedThisTurn < 6

      if (!frillyDressPrevents) {
        console.log('🐴 HORSE ENDING TURN - Revealed non-player tiles')
        return true
      }
    }

    // Check Fetch-specific turn ending
    // Fetch sets fetchRevealedNonPlayer flag when it reveals non-player tiles
    // Frilly Dress exception is already handled in fetch.ts
    if (effect.type === 'fetch' && effectState.fetchRevealedNonPlayer) {
      console.log('🎾 FETCH ENDING TURN - Revealed non-player tiles')
      return true
    }

    return false
  }

  /**
   * Cancel current card targeting
   */
  cancelCardTargeting(): void {
    const currentState = this.getState()

    // Check if this is an Espresso forced play
    if (currentState.espressoForcedPlay) {
      console.log('☕ ESPRESSO: Canceling forced play - deducting energy and discarding card')

      const { cardId, energyCost, shouldExhaust } = currentState.espressoForcedPlay

      // Find the card
      const card = currentState.hand.find(c => c.id === cardId)
      if (!card) {
        console.error('☕ ESPRESSO: Card not found in hand during cancel')
        this.setState({
          ...currentState,
          pendingCardEffect: null,
          selectedCardName: null,
          selectedCardId: null,
          espressoForcedPlay: undefined
        })
        return
      }

      // Remove card from hand
      const newHand = currentState.hand.filter(c => c.id !== cardId)

      // Deduct energy and discard/exhaust the card
      const newState: GameState = {
        ...currentState,
        hand: newHand,
        energy: currentState.energy - energyCost,
        discard: shouldExhaust ? currentState.discard : [...currentState.discard, card],
        exhaust: shouldExhaust ? [...currentState.exhaust, card] : currentState.exhaust,
        pendingCardEffect: null,
        selectedCardName: null,
        selectedCardId: null,
        espressoForcedPlay: undefined
      }

      console.log(`☕ ESPRESSO: Canceled - deducted ${energyCost} energy, ${shouldExhaust ? 'exhausted' : 'discarded'} ${card.name}`)
      this.setState(newState)
    } else {
      // Normal cancel - just clear targeting state
      this.setState({
        ...currentState,
        pendingCardEffect: null,
        selectedCardName: null,
        selectedCardId: null
      })
    }
  }
}
