import { LevelConfig } from '../types'
import levelsConfig from '../../levels-config.json'
import { hasRelic } from './relicSystem'

interface LevelsConfig {
  levels: LevelConfig[]
}

const config = levelsConfig as LevelsConfig

// Validate all level configurations on load
function validateLevelConfig(level: LevelConfig): void {
  const { dimensions, tileCounts, unusedLocations } = level
  const totalSpaces = dimensions.columns * dimensions.rows
  const unusedSpaces = unusedLocations.length
  const availableSpaces = totalSpaces - unusedSpaces
  const requiredSpaces = tileCounts.player + tileCounts.rival + tileCounts.neutral + tileCounts.mine

  if (availableSpaces !== requiredSpaces) {
    const error = `
❌ LEVEL CONFIGURATION ERROR: Level ${level.levelNumber} (${level.levelId})

Board dimensions: ${dimensions.columns} × ${dimensions.rows} = ${totalSpaces} total spaces
Unused locations: ${unusedSpaces} spaces
Available spaces: ${availableSpaces} spaces (${totalSpaces} - ${unusedSpaces})

Tile counts:
  - Player: ${tileCounts.player}
  - Rival: ${tileCounts.rival}
  - Neutral: ${tileCounts.neutral}
  - Mine: ${tileCounts.mine}
  - Total: ${requiredSpaces}

ERROR: Available spaces (${availableSpaces}) ≠ Required tiles (${requiredSpaces})
Difference: ${availableSpaces - requiredSpaces} ${availableSpaces > requiredSpaces ? 'extra spaces' : 'missing spaces'}

This will cause tiles with "undefined" owner!
Fix the level configuration in levels-config.json
    `.trim()

    throw new Error(error)
  }
}

// Validate all levels on module load
config.levels.forEach(validateLevelConfig)

export function getLevelConfig(levelId: string): LevelConfig | null {
  return config.levels.find(level => level.levelId === levelId) || null
}

export function getStartingLevelId(): string {
  return 'intro' // First level ID from config
}

export function getNextLevelId(currentLevelId: string): string | null {
  const currentLevel = getLevelConfig(currentLevelId)
  if (!currentLevel || currentLevel.uponFinish.nextLevel.length === 0) {
    return null
  }
  
  // Random selection from next level options
  const nextLevels = currentLevel.uponFinish.nextLevel
  const randomIndex = Math.floor(Math.random() * nextLevels.length)
  return nextLevels[randomIndex]
}

export function shouldShowCardReward(levelId: string): boolean {
  const level = getLevelConfig(levelId)
  return level?.uponFinish.cardReward || false
}

export function shouldShowUpgradeReward(levelId: string): boolean {
  const level = getLevelConfig(levelId)
  return level?.uponFinish.upgradeReward || false
}

export function shouldShowRelicReward(levelId: string): boolean {
  const level = getLevelConfig(levelId)
  return level?.uponFinish.relicReward || false
}

export function shouldShowShopReward(levelId: string): boolean {
  const level = getLevelConfig(levelId)
  return level?.uponFinish.shopReward || false
}

export function isWinningLevel(levelId: string): boolean {
  const level = getLevelConfig(levelId)
  return level?.uponFinish.winTheGame || false
}

export function calculateCopperReward(state: import('../types').GameState): number {
  // Count unrevealed rival tiles (excluding destroyed tiles)
  const unrevealedRivalTiles = Array.from(state.board.tiles.values()).filter(tile =>
    tile.owner === 'rival' && !tile.revealed && tile.specialTile !== 'destroyed'
  )

  let copperReward = unrevealedRivalTiles.length // 1 copper per unrevealed rival tile

  // Tiara relic: double copper rewards
  if (hasRelic(state, 'Tiara')) {
    copperReward *= 2
  }

  return copperReward
}

// No longer needed - we use proper empty tiles for holes