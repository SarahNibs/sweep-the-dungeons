import { GameState, Position, Tile } from '../../types'
import { getUnrevealedTilesByOwner, revealTileWithEquipmentEffects, addOwnerSubsetAnnotation } from '../cardEffects'
import { executeTingleEffect } from '../cards/report'
import { selectTrystTiles } from '../cards/tryst'
import { queueCardDrawsFromDirtCleaning, drawCards } from '../cardSystem'
import { isTestMode } from '../utils/testMode'

function manhattanDistance(pos1: Position, pos2: Position): number {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)
}

/**
 * AnimationController handles card animations (Tingle, Tryst)
 * Separated from store to reduce complexity
 */
export class AnimationController {
  constructor(
    private getState: () => GameState,
    private setState: (state: Partial<GameState> | GameState) => void
  ) {}

  /**
   * Execute Tingle animation - marks rival/mine tiles with a pulsing effect
   */
  executeTingleWithAnimation(state: GameState, isEnhanced: boolean): void {
    // Geode effect: Draw a card immediately when Tingle is played (before animation)
    let currentState = state
    if (currentState.equipment.some(r => r.name === 'Geode')) {
      currentState = drawCards(currentState, 1)
    }

    // Find random rival or mine tiles to target (1 for both versions)
    const rivalTiles = getUnrevealedTilesByOwner(currentState, 'rival')
    const mineTiles = getUnrevealedTilesByOwner(currentState, 'mine')
    const candidateTiles = [...rivalTiles, ...mineTiles]

    if (candidateTiles.length === 0) return

    // Helper function to check if a tile is unambiguously identified based on game annotations
    const isUnambiguous = (tile: Tile): boolean => {
      const subsetAnnotations = tile.annotations.filter(a => a.type === 'owner_subset')
      if (subsetAnnotations.length === 0) return false

      const latestSubset = subsetAnnotations[subsetAnnotations.length - 1]
      const ownerSubset = latestSubset.ownerSubset || new Set()

      // Tile is unambiguous if it can only be one owner (size 1)
      return ownerSubset.size === 1
    }

    // Separate tiles into ambiguous and unambiguous
    const ambiguousTiles = candidateTiles.filter(tile => !isUnambiguous(tile))

    // Prefer ambiguous tiles if available, otherwise use all candidate tiles
    const preferredTiles = ambiguousTiles.length > 0 ? ambiguousTiles : candidateTiles

    // Always mark only 1 tile (both base and enhanced versions)
    const tilesToMark = 1
    const randomTiles: Tile[] = []

    // Select random tile from preferred tiles
    const availableTiles = [...preferredTiles]
    for (let i = 0; i < tilesToMark; i++) {
      const randomIndex = Math.floor(Math.random() * availableTiles.length)
      randomTiles.push(availableTiles[randomIndex])
      availableTiles.splice(randomIndex, 1)
    }

    if (isTestMode()) {
      // In tests, execute immediately without animation
      let effectState = currentState
      for (const tile of randomTiles) {
        effectState = executeTingleEffect(effectState, tile.position, isEnhanced)
      }
      this.setState(effectState)
      return
    }

    // Start the sequential animation with first tile
    this.setState({
      ...currentState,
      tingleAnimation: {
        isActive: true,
        targetTile: randomTiles[0].position,
        isEmphasized: true,
        tilesRemaining: randomTiles,
        currentTileIndex: 0,
        isEnhanced // Store isEnhanced so performNextTingleMark can use it
      }
    })

    // Start the first tile's animation sequence
    this.performNextTingleMark()
  }

  /**
   * Performs the next step in Tingle animation sequence
   */
  performNextTingleMark(): void {
    const currentState = this.getState()
    if (!currentState.tingleAnimation || !currentState.tingleAnimation.isActive) return

    const { tilesRemaining, currentTileIndex } = currentState.tingleAnimation

    if (currentTileIndex >= tilesRemaining.length) {
      // Animation complete - clear processing flag
      this.setState({
        ...currentState,
        tingleAnimation: null,
        isProcessingCard: false
      })
      return
    }

    const currentTile = tilesRemaining[currentTileIndex]

    // After emphasis duration, fade back to normal
    setTimeout(() => {
      const state = this.getState()
      // If animation was cleared, just return without doing anything
      if (!state.tingleAnimation || !state.tingleAnimation.isActive) {
        return
      }

      this.setState({
        ...state,
        tingleAnimation: {
          ...state.tingleAnimation,
          isEmphasized: false
        }
      })

      // After fade duration, apply the effect and move to next tile
      setTimeout(() => {
        const finalState = this.getState()
        // If animation was cleared, just return without doing anything
        if (!finalState.tingleAnimation || !finalState.tingleAnimation.isActive) {
          return
        }

        // Apply effect to current tile
        const isEnhanced = finalState.tingleAnimation?.isEnhanced || false
        let effectState = executeTingleEffect(finalState, currentTile.position, isEnhanced)

        const nextIndex = currentTileIndex + 1
        if (nextIndex < tilesRemaining.length) {
          // More tiles to mark - set up next tile's animation
          this.setState({
            ...effectState,
            tingleAnimation: {
              isActive: true,
              targetTile: tilesRemaining[nextIndex].position,
              isEmphasized: true,
              tilesRemaining,
              currentTileIndex: nextIndex,
              isEnhanced
            }
          })

          // Continue with next tile
          this.performNextTingleMark()
        } else {
          // This was the last tile - clear processing flag
          this.setState({
            ...effectState,
            tingleAnimation: null,
            isProcessingCard: false
          })
        }
      }, 300) // Fade back duration
    }, 800) // Emphasis duration
  }

  /**
   * Execute Tryst animation - reveals player and rival tiles with pulsing
   */
  executeTrystWithAnimation(state: GameState, isEnhanced: boolean, target?: Position): void {
    if (state.debugFlags.debugLogging) {
    console.log(`\n[TRYST-ANIM] ========== executeTrystWithAnimation ==========`)
    }
    if (state.debugFlags.debugLogging) {
    console.log(`[TRYST-ANIM] Enhanced: ${isEnhanced}, Target: ${target ? `(${target.x},${target.y})` : 'none'}`)
    }

    // Use shared tile selection logic from tryst.ts
    const reveals = selectTrystTiles(state, target, isEnhanced)

    if (state.debugFlags.debugLogging) {
    console.log(`[TRYST-ANIM] Selected ${reveals.length} tiles to reveal`)
    }

    if (reveals.length === 0) return

    if (isTestMode()) {
      // In tests, execute immediately without animation - use executeTrystEffect to include annotations
      const { executeTrystEffect } = require('../cards/tryst')
      const card = { enhanced: isEnhanced }
      const effectState = executeTrystEffect(state, target, card)
      this.setState(effectState)
      return
    }

    if (state.debugFlags.debugLogging) {
      console.log(`[TRYST-ANIM] Starting animation, storing isEnhanced=${isEnhanced}, target=${target ? `(${target.x},${target.y})` : 'none'}`)
    }

    // Start the animation with first tile
    this.setState({
      ...state,
      trystAnimation: {
        isActive: true,
        highlightedTile: reveals[0].tile.position,
        revealsRemaining: reveals,
        currentRevealIndex: 0,
        isEnhanced,
        target
      }
    })

    // Start the reveal sequence after a short delay so the first pulse animation is visible
    setTimeout(() => {
      this.performNextTrystReveal()
    }, 1000)
  }

  /**
   * Performs the next step in Tryst animation sequence
   */
  performNextTrystReveal(): void {
    const currentState = this.getState()
    if (!currentState.trystAnimation || !currentState.trystAnimation.isActive) return

    const { revealsRemaining, currentRevealIndex, isEnhanced, target } = currentState.trystAnimation

    if (currentState.debugFlags.debugLogging) {
    console.log(`[TRYST-ANIM] performNextTrystReveal: index=${currentRevealIndex}/${revealsRemaining.length}, enhanced=${isEnhanced}, target=${target ? `(${target.x},${target.y})` : 'none'}`)
    }

    const currentReveal = revealsRemaining[currentRevealIndex]

    // Clean dirty tiles before revealing if this is a player tile
    let currentStateForReveal = currentState
    if (currentReveal.revealer === 'player' && currentReveal.tile.specialTiles.includes('extraDirty')) {
      // Clean the dirty tile first
      const key = `${currentReveal.tile.position.x},${currentReveal.tile.position.y}`
      const newTiles = new Map(currentStateForReveal.board.tiles)
      const cleanedTile = {
        ...currentReveal.tile,
        specialTiles: currentReveal.tile.specialTiles.filter(t => t !== 'extraDirty') // Remove extraDirty
      }
      newTiles.set(key, cleanedTile)
      currentStateForReveal = {
        ...currentStateForReveal,
        board: {
          ...currentStateForReveal.board,
          tiles: newTiles
        }
      }

      // Queue card draws for cleaning dirt by revealing (Mop equipment effect)
      const updatedState = queueCardDrawsFromDirtCleaning(currentStateForReveal, 1)
      currentStateForReveal = {
        ...currentStateForReveal,
        queuedCardDraws: updatedState.queuedCardDraws
      }
    }

    // Reveal the current tile
    let newState = revealTileWithEquipmentEffects(currentStateForReveal, currentReveal.tile.position, currentReveal.revealer)

    // Update animation state for next reveal
    const nextIndex = currentRevealIndex + 1
    if (nextIndex < revealsRemaining.length) {
      // More reveals to go - IMPORTANT: preserve isEnhanced and target for annotation logic
      newState = {
        ...newState,
        trystAnimation: {
          isActive: true,
          highlightedTile: revealsRemaining[nextIndex].tile.position,
          revealsRemaining,
          currentRevealIndex: nextIndex,
          isEnhanced,  // CRITICAL: preserve for final annotation step
          target       // CRITICAL: preserve for final annotation step
        }
      }

      this.setState(newState)

      // Schedule next reveal
      setTimeout(() => {
        this.performNextTrystReveal()
      }, 800)
    } else {
      // This was the last reveal - apply enhanced annotations if needed, then complete
      if (newState.debugFlags.debugLogging) {
      console.log(`[TRYST-ANIM] Last reveal complete, checking for annotations: enhanced=${isEnhanced}, target=${target ? `(${target.x},${target.y})` : 'none'}`)
      }

      let finalState = newState

      if (isEnhanced && target && revealsRemaining.length > 0) {
        if (finalState.debugFlags.debugLogging) {
        console.log(`[TRYST] Enhanced mode: Adding annotations for tiles closer to target (${target.x},${target.y})`)
        }

        // For each reveal, annotate closer unrevealed tiles
        for (const { tile } of revealsRemaining) {
          const revealedDistance = manhattanDistance(tile.position, target)
          const revealedOwner = tile.owner

          if (finalState.debugFlags.debugLogging) {
          console.log(`[TRYST] Processing reveal: (${tile.position.x},${tile.position.y})[${revealedOwner}] at distance ${revealedDistance}`)
          }

          // Determine "not of type" annotation
          let notOfTypeSubset: Set<'player' | 'rival' | 'neutral' | 'mine'>
          if (revealedOwner === 'rival') {
            notOfTypeSubset = new Set(['player', 'neutral', 'mine'])
            if (finalState.debugFlags.debugLogging) {
            console.log(`[TRYST] Revealed rival at distance ${revealedDistance}, marking closer tiles as "not rival"`)
            }
          } else if (revealedOwner === 'player') {
            notOfTypeSubset = new Set(['neutral', 'rival', 'mine'])
            if (finalState.debugFlags.debugLogging) {
            console.log(`[TRYST] Revealed player at distance ${revealedDistance}, marking closer tiles as "not player"`)
            }
          } else {
            if (finalState.debugFlags.debugLogging) {
            console.log(`[TRYST] WARNING: Revealed tile is neither player nor rival (${revealedOwner}), skipping annotations`)
            }
            continue
          }

          // Find all tiles strictly closer to target (distance < revealedDistance)
          let annotatedCount = 0
          for (const boardTile of finalState.board.tiles.values()) {
            if (boardTile.revealed || boardTile.owner === 'empty') {
              continue
            }

            const tileDistance = manhattanDistance(boardTile.position, target)
            if (tileDistance < revealedDistance) {
              if (finalState.debugFlags.debugLogging) {
              console.log(`[TRYST] Annotating tile (${boardTile.position.x},${boardTile.position.y})[${boardTile.owner}] at distance ${tileDistance} < ${revealedDistance}`)
              }
              finalState = addOwnerSubsetAnnotation(finalState, boardTile.position, notOfTypeSubset)
              annotatedCount++
            }
          }
          if (finalState.debugFlags.debugLogging) {
          console.log(`[TRYST] Annotated ${annotatedCount} tiles closer than distance ${revealedDistance}`)
          }
        }
      } else {
        if (finalState.debugFlags.debugLogging) {
        console.log(`[TRYST] Not adding annotations: enhanced=${isEnhanced}, target=${target ? 'present' : 'none'}, reveals=${revealsRemaining.length}`)
        }
      }

      // Animation complete - clear processing flag
      this.setState({
        ...finalState,
        trystAnimation: null,
        isProcessingCard: false
      })
    }
  }

  /**
   * Clear adjacency pattern animation state
   */
  clearAdjacencyPatternAnimation(): void {
    const currentState = this.getState()
    this.setState({
      ...currentState,
      adjacencyPatternAnimation: null
    })
  }
}
