/**
 * Hex - Represents a single hexagon on the game map
 * TypeScript version adapted from js/core/Hex.js
 */

export const TERRAIN_TYPES = {
  PLAINS: 'PLAINS',
  FOREST: 'FOREST',
  MOUNTAIN: 'MOUNTAIN',
  WATER: 'WATER',
  ROAD: 'ROAD',
} as const

export type TerrainType = (typeof TERRAIN_TYPES)[keyof typeof TERRAIN_TYPES]

export const TERRAIN_CONFIG = {
  [TERRAIN_TYPES.PLAINS]: {
    movementCost: 1,
    defenseBonus: 0,
    passable: true,
    name: 'Plains',
    color: '#90EE90',
  },
  [TERRAIN_TYPES.FOREST]: {
    movementCost: 2,
    defenseBonus: 1,
    passable: true,
    name: 'Forest',
    color: '#228B22',
  },
  [TERRAIN_TYPES.MOUNTAIN]: {
    movementCost: 3,
    defenseBonus: 2,
    passable: true,
    name: 'Mountain',
    color: '#8B4513',
  },
  [TERRAIN_TYPES.WATER]: {
    movementCost: 999,
    defenseBonus: 0,
    passable: false,
    name: 'Water',
    color: '#4169E1',
  },
  [TERRAIN_TYPES.ROAD]: {
    movementCost: 0.5,
    defenseBonus: 0,
    passable: true,
    name: 'Road',
    color: '#D2B48C',
  },
}

export class Hex {
  x: number
  y: number
  terrain: TerrainType
  unit: unknown = null
  city: unknown = null
  hasRiver: boolean = false
  rotation: number = 0 // In radians

  constructor(x: number, y: number, terrain: TerrainType = TERRAIN_TYPES.PLAINS) {
    this.x = x
    this.y = y
    this.terrain = terrain

    if (!TERRAIN_CONFIG[terrain]) {
      throw new Error(`Invalid terrain type: ${terrain}`)
    }
  }

  getMovementCost(_unit: unknown = null): number {
    const config = TERRAIN_CONFIG[this.terrain]
    if (!config) {
      throw new Error(`Unknown terrain type: ${this.terrain}`)
    }
    return config.movementCost
  }

  getDefenseBonus(): number {
    const config = TERRAIN_CONFIG[this.terrain]
    if (!config) {
      throw new Error(`Unknown terrain type: ${this.terrain}`)
    }
    return config.defenseBonus
  }

  getTerrainName(): string {
    const config = TERRAIN_CONFIG[this.terrain]
    return config ? config.name : 'Unknown'
  }

  getTerrainColor(): string {
    const config = TERRAIN_CONFIG[this.terrain]
    return config ? config.color : '#FFFFFF'
  }
}
