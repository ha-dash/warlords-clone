/**
 * Map - Manages the game map with hexagonal grid system
 * TypeScript version adapted from js/core/Map.js
 */

import { Hex, TERRAIN_TYPES, type TerrainType } from './Hex'

export class Map {
  width: number
  height: number
  hexes: (Hex[] | null)[] // Array of hex stacks (each position can have multiple hexes at different heights)

  constructor(width: number, height: number) {
    if (
      !width ||
      !height ||
      width <= 0 ||
      height <= 0 ||
      !Number.isInteger(width) ||
      !Number.isInteger(height)
    ) {
      throw new Error(
        `Invalid map dimensions: ${width}x${height}. Dimensions must be positive integers.`
      )
    }

    if (width * height > 1000000) {
      throw new Error(`Map too large: ${width}x${height}. Maximum size is 1000x1000.`)
    }

    this.width = width
    this.height = height
    this.hexes = new Array(width * height).fill(null)
  }

  initializeTerrain() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = this.getIndex(x, y)
        this.hexes[index] = [new Hex(x, y, TERRAIN_TYPES.PLAINS)]
      }
    }
  }

  getIndex(x: number, y: number): number {
    return y * this.width + x
  }

  isValidCoordinate(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height
  }

  // Get hex at specific height level (0-4)
  getHex(x: number, y: number, height?: number): Hex | null {
    if (!this.isValidCoordinate(x, y)) {
      return null
    }

    const index = this.getIndex(x, y)
    const hexStack = this.hexes[index]

    if (!hexStack || hexStack.length === 0) {
      return null
    }

    // If height specified, return hex at that height
    if (height !== undefined) {
      return hexStack.find(h => h.height === height) || null
    }

    // Otherwise return topmost hex
    return hexStack[hexStack.length - 1]
  }

  // Get all hexes at position (all height levels)
  getHexStack(x: number, y: number): Hex[] {
    if (!this.isValidCoordinate(x, y)) {
      return []
    }

    const index = this.getIndex(x, y)
    return this.hexes[index] || []
  }

  // Add or replace hex at specific position and height
  setHex(x: number, y: number, hex: Hex) {
    if (!this.isValidCoordinate(x, y)) {
      throw new Error(`Invalid coordinates: (${x}, ${y})`)
    }

    const index = this.getIndex(x, y)
    let hexStack = this.hexes[index]

    if (!hexStack) {
      hexStack = []
      this.hexes[index] = hexStack
    }

    // Remove any existing hex at same height
    const existingIndex = hexStack.findIndex(h => h.height === hex.height)
    if (existingIndex !== -1) {
      hexStack[existingIndex] = hex
    } else {
      hexStack.push(hex)
      // Keep sorted by height
      hexStack.sort((a, b) => a.height - b.height)
    }
  }

  setTerrain(x: number, y: number, terrain: string) {
    const hex = this.getHex(x, y)
    if (hex) {
      hex.terrain = terrain as TerrainType
    }
  }

  // Remove hex at specific height, or topmost if height not specified
  removeHex(x: number, y: number, height?: number) {
    if (!this.isValidCoordinate(x, y)) {
      return
    }

    const index = this.getIndex(x, y)
    const hexStack = this.hexes[index]

    if (!hexStack || hexStack.length === 0) {
      return
    }

    if (height !== undefined) {
      // Remove hex at specific height
      const hexIndex = hexStack.findIndex(h => h.height === height)
      if (hexIndex !== -1) {
        hexStack.splice(hexIndex, 1)
      }
    } else {
      // Remove topmost hex
      hexStack.pop()
    }

    // Clean up empty stacks
    if (hexStack.length === 0) {
      this.hexes[index] = null
    }
  }

  hasHex(x: number, y: number, height?: number): boolean {
    if (!this.isValidCoordinate(x, y)) {
      return false
    }

    const index = this.getIndex(x, y)
    const hexStack = this.hexes[index]

    if (!hexStack || hexStack.length === 0) {
      return false
    }

    if (height !== undefined) {
      return hexStack.some(h => h.height === height)
    }

    return true
  }

  // Get next available height level at position
  getNextHeight(x: number, y: number): number {
    const hexStack = this.getHexStack(x, y)
    if (hexStack.length === 0) {
      return 0
    }

    // Find highest hex and return next level
    const maxHeight = Math.max(...hexStack.map(h => h.height))
    return Math.min(4, maxHeight + 1) // Cap at level 4
  }

  // Get neighboring coordinates for hexagonal grid (odd-r offset coordinates)
  getNeighborCoordinates(x: number, y: number): Array<{ x: number; y: number }> {
    const neighbors: Array<{ x: number; y: number }> = []

    // Hexagonal grid neighbors (odd-r offset coordinates)
    let directions: Array<{ dx: number; dy: number }>
    if (y % 2 === 0) {
      // Even rows
      directions = [
        { dx: 1, dy: 0 },   // East
        { dx: 1, dy: -1 },  // North East
        { dx: 0, dy: -1 },  // North West
        { dx: -1, dy: 0 },  // West
        { dx: 0, dy: 1 },   // South West
        { dx: 1, dy: 1 },   // South East
      ]
    } else {
      // Odd rows
      directions = [
        { dx: 1, dy: 0 },    // East
        { dx: 0, dy: -1 },   // North East
        { dx: -1, dy: -1 },  // North West
        { dx: -1, dy: 0 },   // West
        { dx: -1, dy: 1 },   // South West
        { dx: 0, dy: 1 },    // South East
      ]
    }

    for (const dir of directions) {
      const nx = x + dir.dx
      const ny = y + dir.dy

      if (this.isValidCoordinate(nx, ny)) {
        neighbors.push({ x: nx, y: ny })
      }
    }

    return neighbors
  }
}
