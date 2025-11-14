import { GameState, Position, TileAnnotation } from '../../types'
import { getTile, positionToKey, removeSpecialTile, hasSpecialTile, calculateAdjacency, getNeighbors } from '../boardSystem'
import { updateNeighborAdjacencyInfo, addOwnerSubsetAnnotation } from '../cardEffects'

// Helper function to count adjacent mines
function countAdjacentMines(state: GameState, position: Position): number {
  const neighbors = getNeighbors(state.board, position)
  let mineCount = 0

  for (const neighborPos of neighbors) {
    const neighborTile = getTile(state.board, neighborPos)
    if (neighborTile && neighborTile.owner === 'mine') {
      mineCount++
    }
  }

  return mineCount
}

export function executeSnipSnipEffect(state: GameState, target: Position, card?: import('../../types').Card): GameState {
  const tile = getTile(state.board, target)
  if (!tile) return state

  let newState = state
  let mineDefused = false
  const key = positionToKey(target)
  const newTiles = new Map(newState.board.tiles)
  let currentTile = tile

  // Defuse surface mine if present
  if (hasSpecialTile(currentTile, 'surfaceMine')) {
    currentTile = removeSpecialTile(currentTile, 'surfaceMine')
    newTiles.set(key, currentTile)
    mineDefused = true
  }

  // Convert regular mine to neutral and reveal
  if (currentTile.owner === 'mine') {

    // Change owner to neutral
    currentTile = {
      ...currentTile,
      owner: 'neutral'
    }

    // Calculate adjacency based on player team (show adjacent player tiles)
    const playerAdjacency = calculateAdjacency(newState.board, target, 'player')

    // Reveal the tile with player adjacency info (revealedBy: 'player' for blue circle display)
    currentTile = {
      ...currentTile,
      revealed: true,
      revealedBy: 'player',
      adjacencyCount: playerAdjacency
    }

    // Enhanced: also show mine and player adjacency info as annotation
    if (card?.enhanced) {
      const mineAdjacency = countAdjacentMines(newState, target)

      // Remove existing adjacency_info annotations and add new one
      const existingAnnotations = currentTile.annotations.filter(a => a.type !== 'adjacency_info')
      const annotation: TileAnnotation = {
        type: 'adjacency_info',
        adjacencyInfo: { player: playerAdjacency, mine: mineAdjacency }
      }
      currentTile = {
        ...currentTile,
        annotations: [...existingAnnotations, annotation]
      }
    }

    newTiles.set(key, currentTile)
    mineDefused = true
  }
  // Enhanced: show mine and player adjacency regardless of whether we defused
  else if (card?.enhanced) {
    const mineAdjacency = countAdjacentMines(newState, target)
    const playerAdjacency = calculateAdjacency(newState.board, target, 'player')

    // Remove existing adjacency_info annotations and add new one
    const existingAnnotations = currentTile.annotations.filter(a => a.type !== 'adjacency_info')
    const annotation: TileAnnotation = {
      type: 'adjacency_info',
      adjacencyInfo: { player: playerAdjacency, mine: mineAdjacency }
    }
    currentTile = {
      ...currentTile,
      annotations: [...existingAnnotations, annotation]
    }
    newTiles.set(key, currentTile)
  }

  // Update board with changes BEFORE adding non-mine annotation
  // (so the annotation doesn't get overwritten)
  newState = {
    ...newState,
    board: {
      ...newState.board,
      tiles: newTiles
    }
  }

  // If tile is not a mine and has no surface mine, annotate as not-mine
  if (!mineDefused && !tile.revealed) {
    const possibleOwners = new Set<'player' | 'rival' | 'neutral' | 'mine'>([
      'player',
      'rival',
      'neutral'
    ])
    newState = addOwnerSubsetAnnotation(newState, target, possibleOwners)
  }

  // Update adjacency_info annotations on neighboring tiles if ownership changed
  if (mineDefused && tile.owner === 'mine') {
    newState = updateNeighborAdjacencyInfo(newState, target)
  }

  // Award copper if any mine was defused
  if (mineDefused) {
    newState = {
      ...newState,
      copper: newState.copper + 2
    }
  }

  return newState
}
