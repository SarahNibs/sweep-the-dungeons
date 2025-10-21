import { GameState } from '../../../types'
import { positionToKey } from '../../boardSystem'
import { ExclusionAnalysis } from './types'

/**
 * Determine which owners are possible for each unrevealed tile
 *
 * Uses exclusion analysis flags to filter out impossible owners.
 * Revealed tiles and empty tiles are not included in the result.
 *
 * @param state Current game state
 * @param analysis Exclusion analysis with flags
 * @returns Map from position key to Set of possible owners
 */
export function determinePossibilities(
  state: GameState,
  analysis: ExclusionAnalysis
): Map<string, Set<'player' | 'rival' | 'neutral' | 'mine'>> {
  const possibilities = new Map<string, Set<'player' | 'rival' | 'neutral' | 'mine'>>()

  for (const tile of state.board.tiles.values()) {
    // Skip revealed tiles and empty tiles
    if (tile.revealed || tile.owner === 'empty') continue

    const key = positionToKey(tile.position)
    const flags = analysis.flags.get(key)

    if (!flags) continue

    // Build set of possible owners based on flags
    const possibleOwners = new Set<'player' | 'rival' | 'neutral' | 'mine'>()

    if (flags.player) possibleOwners.add('player')
    if (flags.rival) possibleOwners.add('rival')
    if (flags.neutral) possibleOwners.add('neutral')
    if (flags.mine) possibleOwners.add('mine')

    possibilities.set(key, possibleOwners)
  }

  return possibilities
}
