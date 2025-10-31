import { GameState, Position, Tile } from '../../types'
import { revealTileWithRelicEffects, getUnrevealedTilesByOwner } from '../cardEffects'

function manhattanDistance(pos1: Position, pos2: Position): number {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y)
}

export interface TrystSelection {
  tile: Tile
  revealer: 'player' | 'rival'
}

/**
 * Selects which tiles Tryst will reveal, without actually revealing them.
 * Used by both immediate execution and animation system.
 */
export function selectTrystTiles(state: GameState, target?: Position, enhanced?: boolean): TrystSelection[] {
  const rivalTiles = getUnrevealedTilesByOwner(state, 'rival')
  const playerTiles = getUnrevealedTilesByOwner(state, 'player')
  const reveals: TrystSelection[] = []

  // First, select a rival tile to reveal with PLAYER adjacency
  if (rivalTiles.length > 0) {
    let chosenRivalTile: Tile

    if (enhanced && target) {
      const tilesWithDistance = rivalTiles.map(tile => ({
        tile,
        distance: manhattanDistance(tile.position, target)
      }))
      const minDistance = Math.min(...tilesWithDistance.map(t => t.distance))
      const closestTiles = tilesWithDistance.filter(t => t.distance === minDistance)
      chosenRivalTile = closestTiles[Math.floor(Math.random() * closestTiles.length)].tile
    } else {
      chosenRivalTile = rivalTiles[Math.floor(Math.random() * rivalTiles.length)]
    }

    reveals.push({ tile: chosenRivalTile, revealer: 'player' })
  }

  // Then, select a player tile to reveal with RIVAL adjacency
  if (playerTiles.length > 0) {
    let chosenPlayerTile: Tile

    if (enhanced && target) {
      const tilesWithDistance = playerTiles.map(tile => ({
        tile,
        distance: manhattanDistance(tile.position, target)
      }))
      const minDistance = Math.min(...tilesWithDistance.map(t => t.distance))
      const closestTiles = tilesWithDistance.filter(t => t.distance === minDistance)
      chosenPlayerTile = closestTiles[Math.floor(Math.random() * closestTiles.length)].tile
    } else {
      chosenPlayerTile = playerTiles[Math.floor(Math.random() * playerTiles.length)]
    }

    reveals.push({ tile: chosenPlayerTile, revealer: 'rival' })
  }

  return reveals
}

export function executeTrystEffect(state: GameState, target?: Position, card?: import('../../types').Card): GameState {
  console.log('💑 TRYST EFFECT DEBUG - Starting')

  const reveals = selectTrystTiles(state, target, card?.enhanced)

  if (reveals.length === 0) {
    console.log('💑 TRYST - No tiles to reveal')
    return state
  }

  let currentState = state

  for (const { tile, revealer } of reveals) {
    console.log(`💑 TRYST - Revealing ${tile.owner} tile at (${tile.position.x}, ${tile.position.y}) with revealer='${revealer}'`)
    currentState = revealTileWithRelicEffects(currentState, tile.position, revealer, false)

    const revealedTile = currentState.board.tiles.get(`${tile.position.x},${tile.position.y}`)
    console.log(`💑 TRYST - After reveal: adjacencyCount=${revealedTile?.adjacencyCount}`)
  }

  console.log('💑 TRYST EFFECT DEBUG - Complete')
  return currentState
}