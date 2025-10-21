import { GameState, Position } from '../../types'
import { getTile, positionToKey } from '../boardSystem'

export function executeBratEffect(state: GameState, target: Position, card?: import('../../types').Card): GameState {
  const targetTile = getTile(state.board, target)

  if (!targetTile) {
    return state
  }

  // Gain copper if enhanced (regardless of whether tile is revealed)
  const copperGain = card?.enhanced ? 2 : 0
  const newCopper = state.copper + copperGain

  // If tile is not revealed, just give copper and return
  if (!targetTile.revealed) {
    return {
      ...state,
      copper: newCopper
    }
  }

  // Unreveal the tile but keep its adjacency count visible
  const key = positionToKey(target)
  const newTiles = new Map(state.board.tiles)

  // Find existing adjacency_info annotation (from Eavesdropping, etc.)
  const existingAdjacencyAnnotation = targetTile.annotations.find(a => a.type === 'adjacency_info')
  const existingAdjacencyInfo = existingAdjacencyAnnotation?.adjacencyInfo || {}

  // Create adjacency_info based on who revealed the tile
  // The adjacencyCount represents adjacent tiles of the revealer's type
  const revealAdjacencyInfo: { player?: number; neutral?: number; rival?: number; mine?: number } = {}

  if (targetTile.revealedBy === 'player' && targetTile.adjacencyCount !== null) {
    revealAdjacencyInfo.player = targetTile.adjacencyCount
  } else if (targetTile.revealedBy === 'rival' && targetTile.adjacencyCount !== null) {
    revealAdjacencyInfo.rival = targetTile.adjacencyCount
  }

  // Merge existing adjacency info with reveal-based adjacency info
  // Existing info takes precedence (don't overwrite Eavesdropping data)
  const mergedAdjacencyInfo = {
    ...revealAdjacencyInfo,
    ...existingAdjacencyInfo // Existing info overwrites reveal info
  }

  // Remove any existing adjacency_info annotation and add the merged one
  const existingAnnotations = targetTile.annotations.filter(a => a.type !== 'adjacency_info')
  const newAnnotations = [
    ...existingAnnotations,
    {
      type: 'adjacency_info' as const,
      adjacencyInfo: mergedAdjacencyInfo
    }
  ]

  newTiles.set(key, {
    ...targetTile,
    revealed: false,
    revealedBy: null,
    annotations: newAnnotations
    // Keep adjacencyCount - stored as annotation now for display
  })

  // Remove this specific tile from all rival clue results
  // Keep the clues themselves, just remove this tile from their allAffectedTiles array
  const updatedRivalClues = state.rivalHiddenClues.map(clue => {
    const updatedAffectedTiles = clue.allAffectedTiles.filter(
      pos => !(pos.x === target.x && pos.y === target.y)
    )

    // Only update if the tile was actually affected by this clue
    if (updatedAffectedTiles.length === clue.allAffectedTiles.length) {
      return clue // No change needed
    }

    return {
      ...clue,
      allAffectedTiles: updatedAffectedTiles
    }
  })

  return {
    ...state,
    board: {
      ...state.board,
      tiles: newTiles
    },
    copper: newCopper,
    rivalHiddenClues: updatedRivalClues
  }
}
