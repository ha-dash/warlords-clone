/**
 * Map - Manages the game map with hexagonal grid system
 * TypeScript version adapted from js/core/Map.js
 */

import { Hex, TERRAIN_TYPES, type TerrainType } from './Hex'

export class Map {
  width: number
  height: number
  hexes: Hex[]

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
    this.hexes = new Array(width * height)
  }

  initializeTerrain() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = this.getIndex(x, y)
        this.hexes[index] = new Hex(x, y, TERRAIN_TYPES.PLAINS)
      }
    }
  }

  getIndex(x: number, y: number): number {
    return y * this.width + x
  }

  isValidCoordinate(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height
  }

  getHex(x: number, y: number): Hex | null {
    if (!this.isValidCoordinate(x, y)) {
      return null
    }

    const index = this.getIndex(x, y)
    const hex = this.hexes[index]
    // Проверяем, не удален ли гекс
    if (hex === null || hex === undefined) {
      return null
    }
    return hex
  }

  setHex(x: number, y: number, hex: Hex) {
    if (!this.isValidCoordinate(x, y)) {
      throw new Error(`Invalid coordinates: (${x}, ${y})`)
    }

    const index = this.getIndex(x, y)
    this.hexes[index] = hex
  }

  setTerrain(x: number, y: number, terrain: string) {
    const hex = this.getHex(x, y)
    if (hex) {
      hex.terrain = terrain as TerrainType
    }
  }

  removeHex(x: number, y: number) {
    if (!this.isValidCoordinate(x, y)) {
      return
    }
    const index = this.getIndex(x, y)
    // Устанавливаем гекс в null для обозначения удаленного
    this.hexes[index] = null as unknown as Hex
  }

  hasHex(x: number, y: number): boolean {
    if (!this.isValidCoordinate(x, y)) {
      return false
    }
    const index = this.getIndex(x, y)
    return this.hexes[index] !== null && this.hexes[index] !== undefined
  }
}
