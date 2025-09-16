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

export function isWinningLevel(levelId: string): boolean {
  const level = getLevelConfig(levelId)
  return level?.uponFinish.winTheGame || false
}

// Temporary helper: add neutral tiles to account for holes
export function adjustTileCountsForHoles(levelConfig: LevelConfig): LevelConfig['tileCounts'] {
  const holeCount = levelConfig.unusedLocations.length
  const totalTiles = levelConfig.dimensions.columns * levelConfig.dimensions.rows - holeCount
  const configuredTiles = levelConfig.tileCounts.player + levelConfig.tileCounts.enemy + 
                         levelConfig.tileCounts.neutral + levelConfig.tileCounts.mine
  
  // If we have holes, add neutral tiles to make up the difference
  if (holeCount > 0 && configuredTiles < totalTiles) {
    return {
      ...levelConfig.tileCounts,
      neutral: levelConfig.tileCounts.neutral + (totalTiles - configuredTiles)
    }
  }
  
  return levelConfig.tileCounts
}