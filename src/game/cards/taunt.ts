import { GameState, Position, StatusEffect } from '../../types'
import { positionToKey } from '../boardSystem'

/**
 * Generate description for a Taunt status effect based on current board state
 */
function generateTauntDescription(state: GameState, positions: Position[]): string {
  const revealedByRival: Position[] = []
  const notRevealedByRival: Position[] = []

  for (const pos of positions) {
    const tile = state.board.tiles.get(positionToKey(pos))
    if (tile && tile.revealed && tile.revealedBy === 'rival') {
      revealedByRival.push(pos)
    } else {
      notRevealedByRival.push(pos)
    }
  }

  const formatPos = (p: Position) => `(${p.x},${p.y})`

  let description = `If rival reveals all taunted tiles, her turn ends.\n`

  if (notRevealedByRival.length > 0) {
    description += `\nNot yet revealed by rival: ${notRevealedByRival.map(formatPos).join(', ')}`
  }

  if (revealedByRival.length > 0) {
    description += `\nRevealed by rival: ${revealedByRival.map(formatPos).join(', ')}`
  }

  return description
}

/**
 * Execute Taunt card effect
 * Marks the target tiles with taunt annotations and creates a status effect
 * If rival reveals all of them, her turn ends when she reveals the last one
 */
export function executeTauntEffect(state: GameState, targets: Position[]): GameState {
  if (targets.length === 0) return state

  // Create unique ID for this Taunt effect
  const tauntId = crypto.randomUUID()

  // Mark all target tiles with taunt annotations
  const newTiles = new Map(state.board.tiles)

  for (const target of targets) {
    const key = positionToKey(target)
    const tile = newTiles.get(key)

    if (tile && !tile.revealed) {
      const updatedTile = {
        ...tile,
        annotations: [
          ...tile.annotations,
          { type: 'taunt_target' as const, tauntId }
        ]
      }
      newTiles.set(key, updatedTile)
    }
  }

  // Create status effect
  const statusEffect: StatusEffect = {
    id: tauntId,
    type: 'taunt',
    icon: '✋',
    name: 'Taunt',
    description: generateTauntDescription(state, targets),
    count: targets.length, // Count of unrevealed by rival
    tauntPositions: targets
  }

  return {
    ...state,
    board: {
      ...state.board,
      tiles: newTiles
    },
    activeStatusEffects: [...state.activeStatusEffects, statusEffect]
  }
}

/**
 * Check if the rival revealing this tile triggers a taunt end-turn
 * Called during rival turn reveals
 * Returns the taunt ID if triggered, null otherwise
 */
export function checkTauntTrigger(state: GameState, revealedPosition: Position): string | null {
  const key = positionToKey(revealedPosition)
  const revealedTile = state.board.tiles.get(key)

  // Find the taunt annotation on this tile
  const tauntAnnotation = revealedTile?.annotations.find(a => a.type === 'taunt_target')
  if (!tauntAnnotation || !tauntAnnotation.tauntId) return null

  const tauntId = tauntAnnotation.tauntId

  // Find the status effect for this taunt
  const statusEffect = state.activeStatusEffects.find(e => e.id === tauntId)
  if (!statusEffect || !statusEffect.tauntPositions) return null

  // Check if all tiles for this specific taunt have been revealed by rival
  const allRevealedByRival = statusEffect.tauntPositions.every(pos => {
    const tile = state.board.tiles.get(positionToKey(pos))
    return tile && tile.revealed && tile.revealedBy === 'rival'
  })

  // If this was the last taunt target to be revealed by rival, trigger end turn
  return allRevealedByRival ? tauntId : null
}

/**
 * Update Taunt status effect descriptions after a tile is revealed
 */
export function updateTauntStatusEffects(state: GameState): GameState {
  const updatedEffects = state.activeStatusEffects.map(effect => {
    if (effect.type !== 'taunt' || !effect.tauntPositions) return effect

    // Count how many are not yet revealed by rival
    const notRevealedCount = effect.tauntPositions.filter(pos => {
      const tile = state.board.tiles.get(positionToKey(pos))
      return !(tile && tile.revealed && tile.revealedBy === 'rival')
    }).length

    return {
      ...effect,
      description: generateTauntDescription(state, effect.tauntPositions),
      count: notRevealedCount
    }
  })

  return {
    ...state,
    activeStatusEffects: updatedEffects
  }
}
