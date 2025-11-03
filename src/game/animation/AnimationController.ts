import { GameState, Position, Tile } from '../../types'
import { getUnrevealedTilesByOwner, revealTileWithRelicEffects } from '../cardEffects'
import { executeTingleEffect } from '../cards/report'
import { selectTrystTiles } from '../cards/tryst'
import { queueCardDrawsFromDirtCleaning } from '../cardSystem'
import { isTestMode } from '../utils/testMode'
import { triggerBleachEffect } from '../relics'

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
    // Find random rival or mine tiles to target (1 for both versions)
    const rivalTiles = getUnrevealedTilesByOwner(state, 'rival')
    const mineTiles = getUnrevealedTilesByOwner(state, 'mine')
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
      let effectState = state
      for (const tile of randomTiles) {
        effectState = executeTingleEffect(effectState, tile.position, isEnhanced)
      }
      this.setState(effectState)
      return
    }

    // Start the sequential animation with first tile
    this.setState({
      ...state,
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
        console.warn('⚠️ Tingle animation was cleared during emphasis phase')
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
          console.warn('⚠️ Tingle animation was cleared during fade phase')
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
    // Use shared tile selection logic from tryst.ts
    const reveals = selectTrystTiles(state, target, isEnhanced)

    if (reveals.length === 0) return

    if (isTestMode()) {
      // In tests, execute immediately without animation
      let effectState = state
      for (const { tile, revealer } of reveals) {
        effectState = revealTileWithRelicEffects(effectState, tile.position, revealer)
      }
      this.setState(effectState)
      return
    }

    // Start the animation with first tile
    this.setState({
      ...state,
      trystAnimation: {
        isActive: true,
        highlightedTile: reveals[0].tile.position,
        revealsRemaining: reveals,
        currentRevealIndex: 0
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

    const { revealsRemaining, currentRevealIndex } = currentState.trystAnimation

    if (currentRevealIndex >= revealsRemaining.length) {
      // Animation complete - clear processing flag
      this.setState({
        ...currentState,
        trystAnimation: null,
        isProcessingCard: false
      })
      return
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

      // Queue card draws for cleaning dirt by revealing (Mop relic effect)
      const updatedState = queueCardDrawsFromDirtCleaning(currentStateForReveal, 1)
      currentStateForReveal = {
        ...currentStateForReveal,
        queuedCardDraws: updatedState.queuedCardDraws
      }

      // Spread clean to adjacent tiles (Bleach relic effect)
      currentStateForReveal = triggerBleachEffect(currentStateForReveal, currentReveal.tile.position)
    }

    // Reveal the current tile
    let newState = revealTileWithRelicEffects(currentStateForReveal, currentReveal.tile.position, currentReveal.revealer)

    // Update animation state for next reveal
    const nextIndex = currentRevealIndex + 1
    if (nextIndex < revealsRemaining.length) {
      // More reveals to go
      newState = {
        ...newState,
        trystAnimation: {
          isActive: true,
          highlightedTile: revealsRemaining[nextIndex].tile.position,
          revealsRemaining,
          currentRevealIndex: nextIndex
        }
      }

      this.setState(newState)

      // Schedule next reveal
      setTimeout(() => {
        this.performNextTrystReveal()
      }, 800)
    } else {
      // This was the last reveal - clear processing flag
      this.setState({
        ...newState,
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
