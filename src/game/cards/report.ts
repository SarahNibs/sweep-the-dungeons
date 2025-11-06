import { GameState, Position } from '../../types'
import { addOwnerSubsetAnnotation } from '../cardEffects'
import { getTile, getNeighbors } from '../boardSystem'
import { drawCards } from '../cardSystem'

function getUnrevealedTilesByOwner(state: GameState, owner: 'player' | 'rival' | 'neutral' | 'mine'): import('../../types').Tile[] {
  const unrevealed: import('../../types').Tile[] = []
  for (const tile of state.board.tiles.values()) {
    if (!tile.revealed && tile.owner === owner) {
      unrevealed.push(tile)
    }
  }
  return unrevealed
}

export function executeReportEffect(state: GameState): GameState {
  const rivalTiles = getUnrevealedTilesByOwner(state, 'rival')

  if (rivalTiles.length === 0) return state

  // Pick a random rival tile
  const randomIndex = Math.floor(Math.random() * rivalTiles.length)
  const targetTile = rivalTiles[randomIndex]

  const ownerSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['rival'])
  return addOwnerSubsetAnnotation(state, targetTile.position, ownerSubset)
}

export function executeTargetedReportEffect(state: GameState, targetPosition: Position): GameState {
  // First, add the rival owner subset annotation
  const ownerSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>(['rival'])
  let stateWithRivalAnnotation = addOwnerSubsetAnnotation(state, targetPosition, ownerSubset)

  // Then, add player adjacency information (like Eavesdropping)
  const targetTile = getTile(stateWithRivalAnnotation.board, targetPosition)

  if (!targetTile || targetTile.revealed) {
    // Can't add adjacency info to revealed tiles or empty spaces
    return stateWithRivalAnnotation
  }

  // Get all neighbor positions of the target tile
  const neighborPositions = getNeighbors(stateWithRivalAnnotation.board, targetPosition)

  // Count adjacent player tiles
  let playerCount = 0
  for (const neighborPos of neighborPositions) {
    const neighborTile = getTile(stateWithRivalAnnotation.board, neighborPos)
    if (neighborTile && neighborTile.owner === 'player') {
      playerCount++
    }
  }

  // Remove any existing adjacency info annotation
  const existingAnnotations = targetTile.annotations.filter(a => a.type !== 'adjacency_info')

  // Add the new adjacency info annotation
  const newAnnotations = [
    ...existingAnnotations,
    {
      type: 'adjacency_info' as const,
      adjacencyInfo: { player: playerCount }
    }
  ]

  // Update the tile with the new annotation
  const newTiles = new Map(stateWithRivalAnnotation.board.tiles)
  newTiles.set(`${targetPosition.x},${targetPosition.y}`, {
    ...targetTile,
    annotations: newAnnotations
  })

  return {
    ...stateWithRivalAnnotation,
    board: {
      ...stateWithRivalAnnotation.board,
      tiles: newTiles
    }
  }
}

export function executeTingleEffect(state: GameState, targetPosition: Position, isEnhanced: boolean): GameState {
  // Get the target tile to determine its owner
  const targetTile = getTile(state.board, targetPosition)

  if (!targetTile || targetTile.revealed || targetTile.owner === 'empty') {
    return state
  }

  // Add owner annotation based on the tile's actual owner
  const ownerSubset = new Set<'player' | 'rival' | 'neutral' | 'mine'>([targetTile.owner])
  let stateWithOwnerAnnotation = addOwnerSubsetAnnotation(state, targetPosition, ownerSubset)

  // For enhanced Tingle, also add player adjacency information
  if (!isEnhanced) {
    // Geode effect: Draw a card when Tingle is played
    if (stateWithOwnerAnnotation.equipment.some(r => r.name === 'Geode')) {
      stateWithOwnerAnnotation = drawCards(stateWithOwnerAnnotation, 1)
    }
    return stateWithOwnerAnnotation
  }

  const annotatedTile = getTile(stateWithOwnerAnnotation.board, targetPosition)
  if (!annotatedTile || annotatedTile.revealed) {
    return stateWithOwnerAnnotation
  }

  // Get all neighbor positions of the target tile
  const neighborPositions = getNeighbors(stateWithOwnerAnnotation.board, targetPosition)

  // Count adjacent player tiles
  let playerCount = 0
  for (const neighborPos of neighborPositions) {
    const neighborTile = getTile(stateWithOwnerAnnotation.board, neighborPos)
    if (neighborTile && neighborTile.owner === 'player') {
      playerCount++
    }
  }

  // Remove any existing adjacency info annotation
  const existingAnnotations = annotatedTile.annotations.filter(a => a.type !== 'adjacency_info')

  // Add the new adjacency info annotation
  const newAnnotations = [
    ...existingAnnotations,
    {
      type: 'adjacency_info' as const,
      adjacencyInfo: { player: playerCount }
    }
  ]

  // Update the tile with the new annotation
  const newTiles = new Map(stateWithOwnerAnnotation.board.tiles)
  newTiles.set(`${targetPosition.x},${targetPosition.y}`, {
    ...annotatedTile,
    annotations: newAnnotations
  })

  let finalState = {
    ...stateWithOwnerAnnotation,
    board: {
      ...stateWithOwnerAnnotation.board,
      tiles: newTiles
    }
  }

  // Geode effect: Draw a card when Tingle is played
  if (finalState.equipment.some(r => r.name === 'Geode')) {
    finalState = drawCards(finalState, 1)
  }

  return finalState
}