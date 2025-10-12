import { RivalAI } from './AITypes'
import { NoGuessAI } from './implementations/NoGuessAI'
import { RandomAI } from './implementations/RandomAI'
import { ConservativeAI } from './implementations/ConservativeAI'

// Registry for all available AI implementations
class AIRegistryClass {
  private aiTypes = new Map<string, () => RivalAI>()

  register(name: string, factory: () => RivalAI): void {
    this.aiTypes.set(name, factory)
  }

  create(name: string): RivalAI {
    const factory = this.aiTypes.get(name)
    if (!factory) {
      throw new Error(`Unknown AI type: ${name}`)
    }
    return factory()
  }

  getAvailableTypes(): string[] {
    return Array.from(this.aiTypes.keys())
  }

  hasType(name: string): boolean {
    return this.aiTypes.has(name)
  }
}

// Singleton instance
export const AIRegistry = new AIRegistryClass()

// Register all available AI implementations
AIRegistry.register('noguess', () => new NoGuessAI())
AIRegistry.register('random', () => new RandomAI())
AIRegistry.register('conservative', () => new ConservativeAI())

// Default AI selection logic
export function getDefaultAIType(): string {
  return 'noguess' // Default to current algorithm
}

export function selectAIForLevel(specialBehaviors?: { rivalAI?: string; [key: string]: any }): string {
  // Check for rivalAI in specialBehaviors (new preferred method)
  if (specialBehaviors?.rivalAI && AIRegistry.hasType(specialBehaviors.rivalAI)) {
    return specialBehaviors.rivalAI
  }
  return getDefaultAIType()
}