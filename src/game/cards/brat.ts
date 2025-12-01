import { GameState, Position } from '../../types'
import { getTile, positionToKey, getNeighbors } from '../boardSystem'

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
  const existingAnnotations = targetTile.annotations.filter(a => a.type !== 'adjacency_info' && a.type !== 'owner_subset')

  // Create owner_subset annotation so player knows the tile's owner
  const ownerSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>()
  if (targetTile.owner === 'player' || targetTile.owner === 'rival' || targetTile.owner === 'neutral' || targetTile.owner === 'mine') {
    ownerSubset.add(targetTile.owner)
  }

  const newAnnotations = [
    ...existingAnnotations,
    {
      type: 'adjacency_info' as const,
      adjacencyInfo: mergedAdjacencyInfo
    },
    {
      type: 'owner_subset' as const,
      ownerSubset
    }
  ]

  newTiles.set(key, {
    ...targetTile,
    revealed: false,
    revealedBy: null,
    annotations: newAnnotations
    // Keep adjacencyCount - stored as annotation now for display
  })

  // Update player-annotations on neighboring tiles based on adjacency info
  if (targetTile.revealedBy && targetTile.adjacencyCount !== null) {
    const neighbors = getNeighbors(state.board, target)
    const revealerType = targetTile.revealedBy // 'player' or 'rival'

    // Count revealed neighbors of the revealer's type
    let revealedMatchingCount = 0
    for (const neighborPos of neighbors) {
      const neighbor = getTile(state.board, neighborPos)
      if (neighbor && neighbor.revealed && neighbor.owner === revealerType) {
        revealedMatchingCount++
      }
    }

    // Determine what we can deduce about neighbors
    const isSaturated = revealedMatchingCount === targetTile.adjacencyCount
    const hasNone = targetTile.adjacencyCount === 0

    // If adjacency is 0 or saturated, we know unrevealed neighbors aren't the revealer's type
    if (hasNone || isSaturated) {
      for (const neighborPos of neighbors) {
        const neighborKey = positionToKey(neighborPos)
        const neighbor = newTiles.get(neighborKey)

        // Only update unrevealed neighbors
        if (neighbor && !neighbor.revealed) {
          // Find existing player_owner_possibility annotation
          const existingPossibility = neighbor.annotations.find(a => a.type === 'player_owner_possibility')
          const currentPossibility = existingPossibility?.playerOwnerPossibility
            ? new Set(existingPossibility.playerOwnerPossibility)
            : new Set<'player' | 'rival' | 'neutral' | 'mine'>(['player', 'rival', 'neutral', 'mine'])

          // Remove the revealer's type from possibilities
          currentPossibility.delete(revealerType)

          // Update annotations
          const otherAnnotations = neighbor.annotations.filter(a => a.type !== 'player_owner_possibility')

          newTiles.set(neighborKey, {
            ...neighbor,
            annotations: [
              ...otherAnnotations,
              {
                type: 'player_owner_possibility' as const,
                playerOwnerPossibility: currentPossibility
              }
            ]
          })
        }
      }
    }
  }

  // Remove this specific tile from all rival clue results
  // Keep the clues themselves, just remove this tile from their allAffectedTiles array
  const updatedRivalClues = state.rivalHiddenClues.map(({ clueResult, targetPosition }) => {
    const updatedAffectedTiles = clueResult.allAffectedTiles.filter(
      pos => !(pos.x === target.x && pos.y === target.y)
    )

    // Only update if the tile was actually affected by this clue
    if (updatedAffectedTiles.length === clueResult.allAffectedTiles.length) {
      return { clueResult, targetPosition } // No change needed
    }

    return {
      clueResult: {
        ...clueResult,
        allAffectedTiles: updatedAffectedTiles
      },
      targetPosition
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
