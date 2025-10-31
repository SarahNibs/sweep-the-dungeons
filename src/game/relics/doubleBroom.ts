import { GameState } from '../../types'
import { getNeighbors } from '../boardSystem'
import { hasRelic } from './relicUtils'

function applySingleOwnerExclusion(state: GameState, position: { x: number, y: number }): GameState {
  const key = `${position.x},${position.y}`
  const tile = state.board.tiles.get(key)

  if (!tile || tile.revealed) {
    return state
  }

  // Find the actual owner of this tile
  const actualOwner = tile.owner

  // Pick a random owner from the OTHER three possible owners (exclude the actual owner)
  const allPossibleOwners: Array<'player' | 'rival' | 'neutral' | 'mine'> = ['player', 'rival', 'neutral', 'mine']
  const otherOwners = allPossibleOwners.filter(owner => owner !== actualOwner)

  const randomOwnerToExclude = otherOwners[Math.floor(Math.random() * otherOwners.length)]

  // Create subset that excludes the randomly chosen owner (but NOT the actual owner)
  const allOwners: Array<'player' | 'rival' | 'neutral' | 'mine'> = ['player', 'rival', 'neutral', 'mine']
  const newOwnerSubset = new Set(allOwners.filter(owner => owner !== randomOwnerToExclude))

  const existingSubsetAnnotation = tile.annotations.find(a => a.type === 'owner_subset')

  let newAnnotations
  if (existingSubsetAnnotation && existingSubsetAnnotation.ownerSubset) {
    // Intersect with existing subset
    const intersectedSubset = new Set(
      Array.from(newOwnerSubset).filter(owner => existingSubsetAnnotation.ownerSubset!.has(owner))
    )
    newAnnotations = tile.annotations.map(a =>
      a.type === 'owner_subset'
        ? { ...a, ownerSubset: intersectedSubset }
        : a
    )
  } else {
    // Create new subset annotation
    newAnnotations = [
      ...tile.annotations,
      {
        type: 'owner_subset' as const,
        ownerSubset: newOwnerSubset
      }
    ]
  }

  const newTiles = new Map(state.board.tiles)
  newTiles.set(key, {
    ...tile,
    annotations: newAnnotations
  })

  return {
    ...state,
    board: {
      ...state.board,
      tiles: newTiles
    }
  }
}

export function triggerDoubleBroomEffect(state: GameState, revealedPosition: { x: number, y: number }): GameState {
  if (!hasRelic(state, 'Double Broom')) {
    return state
  }

  // Find unrevealed adjacent tiles using the board's adjacency rule
  const adjacentPositions = getNeighbors(state.board, revealedPosition)

  const unrevealedAdjacent = adjacentPositions.filter(pos => {
    const key = `${pos.x},${pos.y}`
    const tile = state.board.tiles.get(key)
    return tile && !tile.revealed && tile.owner !== 'empty'
  })

  if (unrevealedAdjacent.length === 0) {
    return state
  }

  // Select up to 2 random adjacent tiles
  const shuffled = [...unrevealedAdjacent].sort(() => Math.random() - 0.5)
  const selectedTiles = shuffled.slice(0, Math.min(2, shuffled.length))

  // Apply single owner exclusion to each selected tile
  let newState = state
  selectedTiles.forEach(pos => {
    newState = applySingleOwnerExclusion(newState, pos)
  })

  return newState
}
