import { GameState, Position, StatusEffect } from '../../types'
import { positionToKey } from '../boardSystem'

/**
 * Generate description for a Taunt status effect based on current board state
 */
function generateTauntDescription(state: GameState, positions: Position[], requiredReveals: number): string {
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

  let description = `If rival reveals ${requiredReveals} taunted tile${requiredReveals > 1 ? 's' : ''}, her turn ends.\n`
  description += `\n${revealedByRival.length}/${requiredReveals} revealed`

  if (notRevealedByRival.length > 0) {
    description += `\n\nNot yet revealed by rival: ${notRevealedByRival.map(formatPos).join(', ')}`
  }

  if (revealedByRival.length > 0) {
    description += `\n\nRevealed by rival: ${revealedByRival.map(formatPos).join(', ')}`
  }

  return description
}

/**
 * Execute Taunt card effect
 * Marks the target tiles with taunt annotations and creates a status effect
 * If rival reveals the required number of tiles, her turn ends
 */
export function executeTauntEffect(state: GameState, targets: Position[]): GameState {
  if (targets.length === 0) return state

  // Determine required reveals based on number of targets
  // Base (4 targets): requires 3 reveals
  // Enhanced (3 targets): requires 2 reveals
  const requiredReveals = targets.length - 1

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
    description: generateTauntDescription(state, targets, requiredReveals),
    count: 0, // Count of revealed by rival so far
    tauntPositions: targets,
    tauntRequiredReveals: requiredReveals
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
  if (!statusEffect || !statusEffect.tauntPositions || !statusEffect.tauntRequiredReveals) return null

  // Count how many tiles have been revealed by rival
  const revealedCount = statusEffect.tauntPositions.filter(pos => {
    const tile = state.board.tiles.get(positionToKey(pos))
    return tile && tile.revealed && tile.revealedBy === 'rival'
  }).length

  // If we've reached the required number of reveals, trigger end turn
  return revealedCount >= statusEffect.tauntRequiredReveals ? tauntId : null
}

/**
 * Update Taunt status effect descriptions after a tile is revealed
 */
export function updateTauntStatusEffects(state: GameState): GameState {
  const updatedEffects = state.activeStatusEffects.map(effect => {
    if (effect.type !== 'taunt' || !effect.tauntPositions || !effect.tauntRequiredReveals) return effect

    // Count how many have been revealed by rival
    const revealedCount = effect.tauntPositions.filter(pos => {
      const tile = state.board.tiles.get(positionToKey(pos))
      return tile && tile.revealed && tile.revealedBy === 'rival'
    }).length

    return {
      ...effect,
      description: generateTauntDescription(state, effect.tauntPositions, effect.tauntRequiredReveals),
      count: revealedCount
    }
  })

  return {
    ...state,
    activeStatusEffects: updatedEffects
  }
}
