import { Board, Position, Tile } from '../types'
import { getTile, hasSpecialTile } from './boardSystem'

/**
 * Taxonomy of tile targeting:
 *
 * 1. DIRECT_REVEAL: Click without card effect - only unrevealed, non-empty tiles
 * 2. SINGLE_UNREVEALED: Cards that target one unrevealed tile (Spritz)
 * 3. MULTI_UNREVEALED: Cards that target multiple unrevealed tiles sequentially (Easiest)
 * 4. SINGLE_FLEXIBLE: Cards that can target revealed tiles (Tryst enhanced, Brat, Eavesdropping - any tile including empty)
 * 5. SINGLE_SPECIAL: Cards with custom rules (Emanation - can target empty tiles with lairs)
 * 6. AREA_TARGET: Cards that target an area:
 *    - Brush (3x3): needs at least one unrevealed tile
 *    - Sweep (5x5/7x7): needs at least one tile
 *    - Horse (Manhattan-1, 5 tiles): needs at least one unrevealed non-empty tile
 *    - Canary (5 tiles basic, 3x3 enhanced): needs at least one unrevealed non-empty tile
 *    - Argument (3x3): needs at least one unrevealed non-empty tile
 *    All area cards can target empty tiles as center if area contains valid tiles
 */

export type TargetingType =
  | 'direct_reveal'
  | 'single_unrevealed'
  | 'multi_unrevealed'
  | 'single_flexible'
  | 'single_special'
  | 'area_target'

export interface TargetValidation {
  isValid: boolean
  reason?: string
}

/**
 * Check if a tile is valid for direct reveal (clicking without a card effect)
 */
export function canDirectRevealTile(tile: Tile | undefined): TargetValidation {
  if (!tile) {
    return { isValid: false, reason: 'Tile does not exist' }
  }

  if (tile.owner === 'empty') {
    return { isValid: false, reason: 'Cannot reveal empty tiles' }
  }

  if (tile.revealed) {
    return { isValid: false, reason: 'Tile already revealed' }
  }

  return { isValid: true }
}

/**
 * Check if a 3x3 area around a position contains at least one unrevealed tile
 */
export function hasValidBrushTargets(board: Board, center: Position): boolean {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const pos = { x: center.x + dx, y: center.y + dy }
      const tile = getTile(board, pos)
      if (tile && !tile.revealed) {
        return true
      }
    }
  }
  return false
}

/**
 * Check if an area around a position contains at least one tile
 * (for Sweep card - 5x5 normal, 7x7 enhanced)
 */
export function hasValidSweepTargets(board: Board, center: Position, enhanced: boolean): boolean {
  const range = enhanced ? 3 : 2
  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -range; dy <= range; dy++) {
      const pos = { x: center.x + dx, y: center.y + dy }
      const tile = getTile(board, pos)
      if (tile) {
        return true // Any tile is valid for Sweep
      }
    }
  }
  return false
}

/**
 * Check if Horse's Manhattan-1 area (5 tiles) contains at least one unrevealed non-empty tile
 */
export function hasValidHorseTargets(board: Board, center: Position): boolean {
  const area: Position[] = [
    center,
    { x: center.x - 1, y: center.y },
    { x: center.x + 1, y: center.y },
    { x: center.x, y: center.y - 1 },
    { x: center.x, y: center.y + 1 }
  ]

  for (const pos of area) {
    const tile = getTile(board, pos)
    if (tile && !tile.revealed && tile.owner !== 'empty') {
      return true
    }
  }
  return false
}

/**
 * Check if Canary's area contains at least one unrevealed non-empty tile
 * Basic: star pattern (5 tiles), Enhanced: 3x3 (9 tiles)
 */
export function hasValidCanaryTargets(board: Board, center: Position, enhanced: boolean): boolean {
  const tilesToCheck: Position[] = []

  if (enhanced) {
    // Enhanced: 3x3 area
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        tilesToCheck.push({ x: center.x + dx, y: center.y + dy })
      }
    }
  } else {
    // Basic: star pattern (Manhattan distance 1)
    tilesToCheck.push(center)
    tilesToCheck.push({ x: center.x, y: center.y - 1 })
    tilesToCheck.push({ x: center.x, y: center.y + 1 })
    tilesToCheck.push({ x: center.x - 1, y: center.y })
    tilesToCheck.push({ x: center.x + 1, y: center.y })
  }

  for (const pos of tilesToCheck) {
    const tile = getTile(board, pos)
    if (tile && !tile.revealed && tile.owner !== 'empty') {
      return true
    }
  }
  return false
}

/**
 * Check if Argument's 3x3 area contains at least one unrevealed non-empty tile
 */
export function hasValidArgumentTargets(board: Board, center: Position): boolean {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const pos = { x: center.x + dx, y: center.y + dy }
      const tile = getTile(board, pos)
      if (tile && !tile.revealed && tile.owner !== 'empty') {
        return true
      }
    }
  }
  return false
}

/**
 * Validate if a tile can be targeted by a specific card
 */
export function canTargetTile(
  tile: Tile | undefined,
  cardName: string | null,
  board: Board,
  position: Position,
  cardEnhanced: boolean = false
): TargetValidation {
  if (!tile) {
    return { isValid: false, reason: 'Tile does not exist' }
  }

  // Area-targeting cards
  if (cardName === 'Brush') {
    // Brush can target any position (including empty) as long as there's at least one unrevealed tile in 3x3 area
    if (!hasValidBrushTargets(board, position)) {
      return { isValid: false, reason: 'No unrevealed tiles in area' }
    }
    return { isValid: true }
  }

  if (cardName === 'Sweep') {
    // Sweep can target any position (including empty) as long as there's at least one tile in the area
    if (!hasValidSweepTargets(board, position, cardEnhanced)) {
      return { isValid: false, reason: 'No tiles in area' }
    }
    return { isValid: true }
  }

  if (cardName === 'Horse') {
    // Horse can target any position (including empty) as long as Manhattan-1 area has unrevealed non-empty tiles
    if (!hasValidHorseTargets(board, position)) {
      return { isValid: false, reason: 'No unrevealed tiles in area' }
    }
    return { isValid: true }
  }

  if (cardName === 'Canary') {
    // Canary can target any position (including empty) as long as area has unrevealed non-empty tiles
    if (!hasValidCanaryTargets(board, position, cardEnhanced)) {
      return { isValid: false, reason: 'No unrevealed tiles in area' }
    }
    return { isValid: true }
  }

  if (cardName === 'Argument') {
    // Argument can target any position (including empty) as long as 3x3 area has unrevealed non-empty tiles
    if (!hasValidArgumentTargets(board, position)) {
      return { isValid: false, reason: 'No unrevealed tiles in area' }
    }
    return { isValid: true }
  }

  // Emanation: special case - can target empty tiles with lairs, or any non-empty tile
  if (cardName === 'Emanation') {
    if (tile.owner === 'empty') {
      if (hasSpecialTile(tile, 'lair')) {
        return { isValid: true }
      }
      return { isValid: false, reason: 'Can only target empty tiles with lairs' }
    }
    // Any non-empty tile is valid for Emanation (can be revealed or unrevealed)
    return { isValid: true }
  }

  // Tryst (enhanced): can target revealed tiles
  if (cardName === 'Tryst' && cardEnhanced) {
    if (tile.owner === 'empty') {
      return { isValid: false, reason: 'Cannot target empty tiles' }
    }
    // Can target any non-empty tile (revealed or unrevealed)
    return { isValid: true }
  }

  // Brat: can target any non-empty tile (revealed or unrevealed)
  // Effect only happens on revealed tiles, but targeting unrevealed is allowed for exhaust/copper
  if (cardName === 'Brat') {
    if (tile.owner === 'empty') {
      return { isValid: false, reason: 'Cannot target empty tiles' }
    }
    // Can target any non-empty tile
    return { isValid: true }
  }

  // Eavesdropping: can target any tile (revealed, unrevealed, empty, or otherwise)
  if (cardName === 'Eavesdropping') {
    return { isValid: true }
  }

  // All other single-target cards: Spritz, Quantum, Tryst (basic)
  // These cards target one unrevealed, non-empty tile
  if (tile.owner === 'empty') {
    return { isValid: false, reason: 'Cannot target empty tiles' }
  }

  if (tile.revealed) {
    return { isValid: false, reason: 'Tile already revealed' }
  }

  return { isValid: true }
}
