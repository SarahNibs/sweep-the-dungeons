import { GameState } from '../../types'
import { hasRelic } from './relicUtils'

function addBusyCanaryOwnerSubsetAnnotation(state: GameState, position: { x: number, y: number }, ownerSubset: Set<'player' | 'rival' | 'neutral' | 'mine'>): GameState {
  const key = `${position.x},${position.y}`
  const tile = state.board.tiles.get(key)

  if (!tile) return state

  const newTiles = new Map(state.board.tiles)

  // Find existing subset annotation if any
  const existingSubsetAnnotation = tile.annotations.find(a => a.type === 'owner_subset')
  const otherAnnotations = tile.annotations.filter(a =>
    a.type !== 'owner_subset' && a.type !== 'safe' && a.type !== 'unsafe' && a.type !== 'rival'
  )

  let finalOwnerSubset: Set<'player' | 'rival' | 'neutral' | 'mine'>

  if (existingSubsetAnnotation?.ownerSubset) {
    // Combine with existing subset through intersection
    const intersected = new Set<'player' | 'rival' | 'neutral' | 'mine'>()
    for (const owner of ownerSubset) {
      if (existingSubsetAnnotation.ownerSubset.has(owner)) {
        intersected.add(owner)
      }
    }
    finalOwnerSubset = intersected
  } else {
    // No existing subset, use the new one
    finalOwnerSubset = new Set(ownerSubset)
  }

  // Only add annotation if the subset is non-empty
  const finalAnnotations = [...otherAnnotations]
  if (finalOwnerSubset.size > 0) {
    finalAnnotations.push({
      type: 'owner_subset',
      ownerSubset: finalOwnerSubset
    })
  }

  const annotatedTile = {
    ...tile,
    annotations: finalAnnotations
  }

  newTiles.set(key, annotatedTile)

  return {
    ...state,
    board: {
      ...state.board,
      tiles: newTiles
    }
  }
}

export function triggerBusyCanaryEffect(state: GameState): GameState {
  if (!hasRelic(state, 'Busy Canary')) {
    return state
  }

  let currentState = state
  let mineFound = false
  const maxReveals = 2 // Try at most 2 area reveals

  for (let revealAttempt = 0; revealAttempt < maxReveals && !mineFound; revealAttempt++) {
    // Get all tiles on the board
    const allTiles = Array.from(currentState.board.tiles.values()).filter(tile =>
      tile.owner !== 'empty' && !tile.revealed
    )

    if (allTiles.length === 0) {
      break // No tiles to scan
    }

    // Pick a random tile as center
    const randomTile = allTiles[Math.floor(Math.random() * allTiles.length)]
    const centerPosition = randomTile.position

    // Apply enhanced Canary effect (3x3 area)
    const tilesToCheck: { x: number, y: number }[] = []
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        tilesToCheck.push({
          x: centerPosition.x + dx,
          y: centerPosition.y + dy
        })
      }
    }

    // Check each tile and add appropriate annotation
    for (const pos of tilesToCheck) {
      const key = `${pos.x},${pos.y}`
      const tile = currentState.board.tiles.get(key)

      // Only process unrevealed tiles that exist on the board
      if (tile && !tile.revealed && tile.owner !== 'empty') {
        if (tile.owner === 'mine') {
          // This is a mine - exclude everything else (only mine possible)
          const mineOnlySubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['mine'])
          currentState = addBusyCanaryOwnerSubsetAnnotation(currentState, pos, mineOnlySubset)
          mineFound = true
        } else {
          // This is not a mine - exclude mine from possibilities
          const noMineSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['player', 'rival', 'neutral'])
          currentState = addBusyCanaryOwnerSubsetAnnotation(currentState, pos, noMineSubset)
        }
      }
    }
  }

  return currentState
}
