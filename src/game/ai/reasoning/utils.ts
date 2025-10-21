import { Position } from '../../../types'

/**
 * Convert position to string key for Map lookups
 */
export function positionToKey(position: Position): string {
  return `${position.x},${position.y}`
}

/**
 * Convert string key back to Position
 */
export function keyToPosition(key: string): Position {
  const [x, y] = key.split(',').map(Number)
  return { x, y }
}

/**
 * Check if two positions are equal
 */
export function positionsEqual(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y
}

/**
 * Fisher-Yates shuffle (in-place)
 */
export function shuffle<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
}

/**
 * Pick a random element from an array
 */
export function randomChoice<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined
  return array[Math.floor(Math.random() * array.length)]
}

/**
 * Count remaining tiles of each owner type in the board
 */
export function countRemainingTiles(
  tiles: Map<string, import('../../../types').Tile>
): {
  player: number
  rival: number
  neutral: number
  mine: number
  unrevealed: number
} {
  let player = 0
  let rival = 0
  let neutral = 0
  let mine = 0
  let unrevealed = 0

  for (const tile of tiles.values()) {
    if (tile.owner === 'empty') continue

    if (!tile.revealed) {
      unrevealed++
      if (tile.owner === 'player') player++
      else if (tile.owner === 'rival') rival++
      else if (tile.owner === 'neutral') neutral++
      else if (tile.owner === 'mine') mine++
    }
  }

  return { player, rival, neutral, mine, unrevealed }
}
