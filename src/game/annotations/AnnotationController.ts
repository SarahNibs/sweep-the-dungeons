import { GameState, Position } from '../../types'
import { positionToKey } from '../boardSystem'

/**
 * AnnotationController handles all player annotation logic
 * Separated from store to reduce complexity
 */
export class AnnotationController {
  constructor(
    private getState: () => GameState,
    private setState: (state: Partial<GameState> | GameState) => void
  ) {}

  /**
   * Toggle slash annotation on a tile
   */
  togglePlayerSlash(position: Position): void {
    const currentState = this.getState()
    const key = positionToKey(position)
    const tile = currentState.board.tiles.get(key)

    if (!tile || tile.revealed) return

    const newTiles = new Map(currentState.board.tiles)
    const hasSlash = tile.annotations.some(a => a.type === 'player_slash')

    let newAnnotations
    if (hasSlash) {
      // Remove slash
      newAnnotations = tile.annotations.filter(a => a.type !== 'player_slash')
    } else {
      // Add slash
      newAnnotations = [...tile.annotations, { type: 'player_slash' as const }]
    }

    const updatedTile = {
      ...tile,
      annotations: newAnnotations
    }

    newTiles.set(key, updatedTile)

    this.setState({
      ...currentState,
      board: {
        ...currentState.board,
        tiles: newTiles
      }
    })
  }

  /**
   * Set player annotation mode (slash, big checkmark, small checkmark)
   */
  setPlayerAnnotationMode(mode: 'slash' | 'big_checkmark' | 'small_checkmark'): void {
    const currentState = this.getState()
    this.setState({
      ...currentState,
      playerAnnotationMode: mode
    })
  }

  /**
   * Toggle player annotation based on current mode
   */
  togglePlayerAnnotation(position: Position): void {
    const currentState = this.getState()
    const key = positionToKey(position)
    const tile = currentState.board.tiles.get(key)

    if (!tile || tile.revealed) return

    const newTiles = new Map(currentState.board.tiles)
    const mode = currentState.playerAnnotationMode

    // Get current annotation types
    const hasSlash = tile.annotations.some(a => a.type === 'player_slash')
    const hasBigCheckmark = tile.annotations.some(a => a.type === 'player_big_checkmark')
    const hasSmallCheckmark = tile.annotations.some(a => a.type === 'player_small_checkmark')

    let newAnnotations = tile.annotations.filter(a =>
      a.type !== 'player_slash' &&
      a.type !== 'player_big_checkmark' &&
      a.type !== 'player_small_checkmark'
    )

    // Cycle through annotations based on mode
    if (mode === 'slash') {
      // Mode 1: no annotation <-> black slash
      if (!hasSlash) {
        newAnnotations = [...newAnnotations, { type: 'player_slash' as const }]
      }
    } else if (mode === 'big_checkmark') {
      // Mode 2: no annotation -> black slash -> big green checkmark -> no annotation
      if (!hasSlash && !hasBigCheckmark) {
        newAnnotations = [...newAnnotations, { type: 'player_slash' as const }]
      } else if (hasSlash && !hasBigCheckmark) {
        newAnnotations = [...newAnnotations, { type: 'player_big_checkmark' as const }]
      }
      // If hasBigCheckmark, we remove all (already filtered out above)
    } else if (mode === 'small_checkmark') {
      // Mode 3: no annotation -> black slash -> small purple checkmark -> no annotation
      if (!hasSlash && !hasSmallCheckmark) {
        newAnnotations = [...newAnnotations, { type: 'player_slash' as const }]
      } else if (hasSlash && !hasSmallCheckmark) {
        newAnnotations = [...newAnnotations, { type: 'player_small_checkmark' as const }]
      }
      // If hasSmallCheckmark, we remove all (already filtered out above)
    }

    const updatedTile = {
      ...tile,
      annotations: newAnnotations
    }

    newTiles.set(key, updatedTile)

    this.setState({
      ...currentState,
      board: {
        ...currentState.board,
        tiles: newTiles
      }
    })
  }

  /**
   * Set whether to use default annotations
   */
  setUseDefaultAnnotations(useDefault: boolean): void {
    const currentState = this.getState()
    this.setState({
      ...currentState,
      useDefaultAnnotations: useDefault
    })
  }

  /**
   * Toggle an owner possibility combination
   */
  toggleOwnerPossibility(ownerCombo: string): void {
    const currentState = this.getState()
    const newEnabled = new Set(currentState.enabledOwnerPossibilities)

    if (newEnabled.has(ownerCombo)) {
      newEnabled.delete(ownerCombo)
    } else {
      newEnabled.add(ownerCombo)
    }

    this.setState({
      ...currentState,
      enabledOwnerPossibilities: newEnabled,
      currentOwnerPossibilityIndex: 0 // Reset to first enabled option
    })
  }

  /**
   * Cycle through player owner annotation possibilities
   */
  cyclePlayerOwnerAnnotation(position: Position): void {
    const currentState = this.getState()

    if (currentState.useDefaultAnnotations) {
      // Use the existing default annotation logic
      this.togglePlayerAnnotation(position)
      return
    }

    // Use the new owner possibility system
    const enabledCombos = Array.from(currentState.enabledOwnerPossibilities)
    if (enabledCombos.length === 0) return // No enabled possibilities

    const key = positionToKey(position)
    const tile = currentState.board.tiles.get(key)
    if (!tile || tile.revealed) return

    const newTiles = new Map(currentState.board.tiles)
    const updatedTile = { ...tile }

    // Remove existing player owner possibility annotation
    updatedTile.annotations = updatedTile.annotations.filter(a => a.type !== 'player_owner_possibility')

    // Find next enabled possibility
    let nextIndex = (currentState.currentOwnerPossibilityIndex + 1) % (enabledCombos.length + 1)

    // If not the "clear" option, add the annotation
    if (nextIndex < enabledCombos.length) {
      const ownerCombo = enabledCombos[nextIndex]
      const ownerSet = new Set(ownerCombo.split(',').filter(s => s.length > 0)) as Set<'player' | 'rival' | 'neutral' | 'mine'>

      updatedTile.annotations.push({
        type: 'player_owner_possibility',
        playerOwnerPossibility: ownerSet
      })
    }

    newTiles.set(key, updatedTile)

    this.setState({
      ...currentState,
      board: {
        ...currentState.board,
        tiles: newTiles
      },
      currentOwnerPossibilityIndex: nextIndex
    })
  }

  /**
   * Toggle annotation button state
   */
  toggleAnnotationButton(buttonType: 'player' | 'rival' | 'neutral' | 'mine'): void {
    const currentState = this.getState()
    this.setState({
      ...currentState,
      annotationButtons: {
        ...currentState.annotationButtons,
        [buttonType]: !currentState.annotationButtons[buttonType]
      }
    })
  }

  /**
   * Toggle filtered annotation based on depressed buttons
   */
  toggleFilteredAnnotation(position: Position): void {
    const currentState = this.getState()
    const key = positionToKey(position)
    const tile = currentState.board.tiles.get(key)
    if (!tile || tile.revealed) return

    const newTiles = new Map(currentState.board.tiles)
    const updatedTile = { ...tile }

    // Remove existing player owner possibility annotation
    const existingAnnotation = updatedTile.annotations.find(a => a.type === 'player_owner_possibility')
    updatedTile.annotations = updatedTile.annotations.filter(a => a.type !== 'player_owner_possibility')

    // If no existing annotation, add filtered annotation based on depressed buttons
    if (!existingAnnotation) {
      const depressedOwners: ('player' | 'rival' | 'neutral' | 'mine')[] = []

      if (currentState.annotationButtons.player) depressedOwners.push('player')
      if (currentState.annotationButtons.rival) depressedOwners.push('rival')
      if (currentState.annotationButtons.neutral) depressedOwners.push('neutral')
      if (currentState.annotationButtons.mine) depressedOwners.push('mine')

      if (depressedOwners.length > 0) {
        const ownerSet = new Set(depressedOwners)
        updatedTile.annotations.push({
          type: 'player_owner_possibility',
          playerOwnerPossibility: ownerSet
        })
      }
    }
    // If annotation exists, remove it (toggle off)

    newTiles.set(key, updatedTile)

    this.setState({
      ...currentState,
      board: {
        ...currentState.board,
        tiles: newTiles
      }
    })
  }
}
