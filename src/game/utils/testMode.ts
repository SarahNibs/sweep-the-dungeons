/**
 * Utility to check if running in test environment
 * Shared across all game systems to avoid duplication
 */
export function isTestMode(): boolean {
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'test'
}
