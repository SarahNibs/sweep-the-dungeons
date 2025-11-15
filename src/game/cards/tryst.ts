import { GameState, Position, Tile } from '../../types'
import { revealTileWithEquipmentEffects, getUnrevealedTilesByOwner, addOwnerSubsetAnnotation } from '../cardEffects'

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
  if (state.debugFlags.debugLogging) {
  console.log(`\n[TRYST] ========== executeTrystEffect ==========`)
  }
  if (state.debugFlags.debugLogging) {
  console.log(`[TRYST] Enhanced: ${card?.enhanced}, Target: ${target ? `(${target.x},${target.y})` : 'none'}`)
  }

  const reveals = selectTrystTiles(state, target, card?.enhanced)

  if (state.debugFlags.debugLogging) {
  console.log(`[TRYST] Selected ${reveals.length} tiles to reveal:`)
  }
  reveals.forEach(({ tile, revealer }, i) => {
    if (state.debugFlags.debugLogging) {
    console.log(`  ${i + 1}. (${tile.position.x},${tile.position.y})[${tile.owner}] revealed by ${revealer}`)
    }
  })

  if (reveals.length === 0) {
    if (state.debugFlags.debugLogging) {
    console.log(`[TRYST] No tiles to reveal, returning unchanged state`)
    }
    return state
  }

  let currentState = state

  for (const { tile, revealer } of reveals) {
    if (state.debugFlags.debugLogging) {
    console.log(`[TRYST] Revealing tile (${tile.position.x},${tile.position.y}) with revealer=${revealer}`)
    }
    currentState = revealTileWithEquipmentEffects(currentState, tile.position, revealer, false)
  }

  // Enhanced: Annotate tiles closer to target as "not of the type revealed"
  if (card?.enhanced && target && reveals.length > 0) {
    if (state.debugFlags.debugLogging) {
    console.log(`[TRYST] Enhanced mode: Adding annotations for tiles closer to target (${target.x},${target.y})`)
    }

    // For each reveal, annotate closer unrevealed tiles
    for (const { tile } of reveals) {
      const revealedDistance = manhattanDistance(tile.position, target)
      const revealedOwner = tile.owner // What was revealed (player or rival)

      if (state.debugFlags.debugLogging) {
      console.log(`[TRYST] Processing reveal: (${tile.position.x},${tile.position.y})[${revealedOwner}] at distance ${revealedDistance}`)
      }

      // Determine "not of type" annotation
      let notOfTypeSubset: Set<'player' | 'rival' | 'neutral' | 'mine'>
      if (revealedOwner === 'rival') {
        // Revealed a rival tile, so closer tiles are "not rival"
        notOfTypeSubset = new Set(['player', 'neutral', 'mine'])
        if (state.debugFlags.debugLogging) {
        console.log(`[TRYST] Revealed rival at distance ${revealedDistance}, marking closer tiles as "not rival"`)
        }
      } else if (revealedOwner === 'player') {
        // Revealed a player tile, so closer tiles are "not player"
        notOfTypeSubset = new Set(['neutral', 'rival', 'mine'])
        if (state.debugFlags.debugLogging) {
        console.log(`[TRYST] Revealed player at distance ${revealedDistance}, marking closer tiles as "not player"`)
        }
      } else {
        // Shouldn't happen for Tryst, but handle gracefully
        if (state.debugFlags.debugLogging) {
        console.log(`[TRYST] WARNING: Revealed tile is neither player nor rival (${revealedOwner}), skipping annotations`)
        }
        continue
      }

      // Find all tiles strictly closer to target (distance < revealedDistance)
      let annotatedCount = 0
      for (const boardTile of currentState.board.tiles.values()) {
        if (boardTile.revealed || boardTile.owner === 'empty') {
          // Skip revealed tiles and empty spaces
          continue
        }

        const tileDistance = manhattanDistance(boardTile.position, target)
        if (tileDistance < revealedDistance) {
          // This tile is strictly closer, annotate it
          if (state.debugFlags.debugLogging) {
          console.log(`[TRYST] Annotating tile (${boardTile.position.x},${boardTile.position.y})[${boardTile.owner}] at distance ${tileDistance} < ${revealedDistance}`)
          }
          currentState = addOwnerSubsetAnnotation(currentState, boardTile.position, notOfTypeSubset)
          annotatedCount++
        }
      }
      if (state.debugFlags.debugLogging) {
      console.log(`[TRYST] Annotated ${annotatedCount} tiles closer than distance ${revealedDistance}`)
      }
    }
  } else {
    if (state.debugFlags.debugLogging) {
    console.log(`[TRYST] Not adding annotations: enhanced=${card?.enhanced}, target=${target ? 'present' : 'none'}, reveals=${reveals.length}`)
    }
  }

  if (state.debugFlags.debugLogging) {
  console.log(`[TRYST] Returning state with ${reveals.length} reveals and annotations applied`)
  }
  return currentState
}