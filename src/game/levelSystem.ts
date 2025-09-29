import { LevelConfig } from '../types'
import levelsConfig from '../../levels-config.json'

interface LevelsConfig {
  levels: LevelConfig[]
}

const config = levelsConfig as LevelsConfig

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
  // Count unrevealed rival tiles
  const unrevealedRivalTiles = Array.from(state.board.tiles.values()).filter(tile =>
    tile.owner === 'rival' && !tile.revealed
  )
  return unrevealedRivalTiles.length // 1 copper per unrevealed rival tile
}

// No longer needed - we use proper empty tiles for holes