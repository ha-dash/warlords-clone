/**
 * MapSerializer - Serialization and deserialization for map files
 * Optimized JSON format for map editor saves
 */

import { Map as GameMap } from './Map'
import { Hex, TERRAIN_TYPES, type TerrainType } from './Hex'

export interface ModelData {
  obj: string
  mtl: string
  name: string
}

export interface HexData {
  x: number
  y: number
  terrain: TerrainType
  height: number
  rotation?: number
  modelData?: ModelData
  hasRiver?: boolean
}

export interface BuildingData {
  x: number
  y: number
  height?: number
  modelData: ModelData
}

export interface MapFileFormat {
  version: string
  format: 'warlords-map'
  metadata: {
    name?: string
    description?: string
    createdAt: number
    modifiedAt: number
    mapSize: 'small' | 'medium' | 'large' | 'very-large'
  }
  map: {
    width: number
    height: number
  }
  // Optimized: only store non-empty positions
  // Key format: "x,y" -> array of hexes at that position (sorted by height)
  hexes: Record<string, HexData[]>
  // Buildings stored separately (optional, for future use)
  buildings?: BuildingData[]
}

/**
 * Serialize map to optimized JSON format
 * 
 * Optimization strategies:
 * 1. Only store non-empty hex positions (sparse array)
 * 2. Store hex stacks as arrays (multiple hexes per position)
 * 3. Use short keys ("x,y" format)
 * 4. Omit default values (rotation=0, height=0, etc.)
 * 5. Buildings stored separately for clarity
 */
export class MapSerializer {
  private static readonly CURRENT_VERSION = '1.0'
  private static readonly FORMAT_ID = 'warlords-map'

  /**
   * Serialize map to JSON string
   */
  static serialize(
    map: GameMap,
    mapSize: 'small' | 'medium' | 'large' | 'very-large',
    options: {
      name?: string
      description?: string
      includeBuildings?: boolean
      buildingData?: Map<string, { obj: string; mtl: string; name: string }>
    } = {}
  ): string {
    const now = Date.now()
    const hexes: Record<string, HexData[]> = {}

    // Serialize all hex positions (only non-empty stacks)
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const hexStack = map.getHexStack(x, y)
        if (hexStack.length > 0) {
          const key = `${x},${y}`
          hexes[key] = hexStack.map(hex => {
            const hexData: HexData = {
              x: hex.x,
              y: hex.y,
              terrain: hex.terrain,
              height: hex.height ?? 0,
            }

            // Only include non-default values to save space
            if (hex.rotation && hex.rotation !== 0) {
              hexData.rotation = hex.rotation
            }

            if (hex.modelData) {
              hexData.modelData = {
                obj: hex.modelData.obj,
                mtl: hex.modelData.mtl,
                name: hex.modelData.name,
              }
            }

            if (hex.hasRiver) {
              hexData.hasRiver = true
            }

            return hexData
          })
        }
      }
    }

    // Serialize buildings if provided
    const buildings: BuildingData[] = []
    if (options.includeBuildings && options.buildingData) {
      for (const [key, modelData] of options.buildingData.entries()) {
        // Parse key format: "x,y" or "x,y_height"
        const [posPart, heightPart] = key.split('_')
        const [x, y] = posPart.split(',').map(Number)
        const height = heightPart ? Number(heightPart) : undefined

        buildings.push({
          x,
          y,
          height,
          modelData: {
            obj: modelData.obj,
            mtl: modelData.mtl,
            name: modelData.name,
          },
        })
      }
    }

    const mapFile: MapFileFormat = {
      version: this.CURRENT_VERSION,
      format: this.FORMAT_ID,
      metadata: {
        name: options.name,
        description: options.description,
        createdAt: now,
        modifiedAt: now,
        mapSize,
      },
      map: {
        width: map.width,
        height: map.height,
      },
      hexes,
      ...(buildings.length > 0 && { buildings }),
    }

    return JSON.stringify(mapFile, null, 2)
  }

  /**
   * Deserialize JSON string to map
   */
  static deserialize(jsonString: string): {
    map: GameMap
    mapSize: 'small' | 'medium' | 'large' | 'very-large'
    buildings?: BuildingData[]
    metadata?: MapFileFormat['metadata']
  } {
    const mapFile: MapFileFormat = JSON.parse(jsonString)

    // Validate format
    if (mapFile.format !== this.FORMAT_ID) {
      throw new Error(`Invalid map format: expected ${this.FORMAT_ID}, got ${mapFile.format}`)
    }

    // Version compatibility check
    if (mapFile.version !== this.CURRENT_VERSION) {
      console.warn(
        `Map version mismatch: file version ${mapFile.version}, current version ${this.CURRENT_VERSION}. Attempting to load anyway...`
      )
    }

    // Create map
    const map = new GameMap(mapFile.map.width, mapFile.map.height)

    // Deserialize hexes
    for (const [key, hexStack] of Object.entries(mapFile.hexes)) {
      const [x, y] = key.split(',').map(Number)

      for (const hexData of hexStack) {
        const hex = new Hex(hexData.x, hexData.y, hexData.terrain)
        hex.height = hexData.height ?? 0
        hex.rotation = hexData.rotation ?? 0

        if (hexData.modelData) {
          hex.modelData = {
            obj: hexData.modelData.obj,
            mtl: hexData.modelData.mtl,
            name: hexData.modelData.name,
          }
        }

        if (hexData.hasRiver) {
          hex.hasRiver = true
        }

        map.setHex(x, y, hex)
      }
    }

    return {
      map,
      mapSize: mapFile.metadata.mapSize,
      buildings: mapFile.buildings,
      metadata: mapFile.metadata,
    }
  }

  /**
   * Get file size estimate in bytes
   */
  static estimateSize(map: GameMap): number {
    // Rough estimate: ~200 bytes per hex (with model data)
    let hexCount = 0
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        hexCount += map.getHexStack(x, y).length
      }
    }
    return hexCount * 200 + 500 // Base overhead ~500 bytes
  }

  /**
   * Validate map file structure
   */
  static validate(mapFile: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!mapFile || typeof mapFile !== 'object') {
      return { valid: false, errors: ['Map file is not an object'] }
    }

    const file = mapFile as Partial<MapFileFormat>

    if (file.format !== this.FORMAT_ID) {
      errors.push(`Invalid format: expected ${this.FORMAT_ID}`)
    }

    if (!file.version) {
      errors.push('Missing version field')
    }

    if (!file.map) {
      errors.push('Missing map field')
    } else {
      if (typeof file.map.width !== 'number' || file.map.width <= 0) {
        errors.push('Invalid map width')
      }
      if (typeof file.map.height !== 'number' || file.map.height <= 0) {
        errors.push('Invalid map height')
      }
    }

    if (!file.hexes || typeof file.hexes !== 'object') {
      errors.push('Missing or invalid hexes field')
    }

    if (!file.metadata) {
      errors.push('Missing metadata field')
    } else {
      if (!file.metadata.mapSize) {
        errors.push('Missing mapSize in metadata')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

