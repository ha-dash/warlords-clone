/**
 * TextureManager - Handles loading and serving of game textures
 */
export class TextureManager {
    constructor() {
        this.textures = new Map();
        this.loadingPromises = new Map();
        this.fallbackColors = {
            'plains': '#90EE90',
            'forest': '#228B22',
            'mountain': '#8B4513',
            'water': '#4169E1',
            'road': '#D2B48C'
        };
    }

    /**
     * Load a texture from a URL
     * @param {string} key - Unique key for the texture
     * @param {string} url - URL of the image
     * @returns {Promise<HTMLImageElement>}
     */
    loadTexture(key, url) {
        if (this.textures.has(key)) {
            return Promise.resolve(this.textures.get(key));
        }

        if (this.loadingPromises.has(key)) {
            return this.loadingPromises.get(key);
        }

        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.textures.set(key, img);
                this.loadingPromises.delete(key);
                console.log(`Texture loaded: ${key}`);
                resolve(img);
            };
            img.onerror = (e) => {
                console.error(`Failed to load texture: ${key} from ${url}`, e);
                this.loadingPromises.delete(key);
                // Don't reject, just resolve with null so game continues with fallback
                resolve(null);
            };
            img.src = url;
        });

        this.loadingPromises.set(key, promise);
        return promise;
    }

    /**
     * Get a loaded texture
     * @param {string} key - Texture key
     * @returns {HTMLImageElement|null}
     */
    getTexture(key) {
        return this.textures.get(key) || null;
    }

    /**
     * Get a texture variant based on coordinates
     * @param {string} type - Terrain type (e.g., 'plains', 'forest')
     * @param {number} x - Hex X coordinate
     * @param {number} y - Hex Y coordinate
     * @returns {HTMLImageElement|null}
     */
    getTextureVariant(type, x, y) {
        const baseKey = type.toLowerCase();

        // Count available variants for this type
        // This relies on naming convention: name_01, name_02, etc.
        let variants = [];
        let i = 1;
        while (true) {
            const key = `${baseKey}_0${i}`;
            if (this.textures.has(key)) {
                variants.push(key);
                i++;
            } else {
                break;
            }
        }

        // If no numbered variants found, try the base key
        if (variants.length === 0) {
            return this.getTexture(baseKey);
        }

        // Deterministic pseudo-random selection based on coordinates
        // Using a simple hash function
        const seed = (x * 73856093) ^ (y * 19349663);
        const index = Math.abs(seed) % variants.length;

        return this.getTexture(variants[index]);
    }

    /**
     * Get fallback color for a terrain type
     * @param {string} type - Terrain type
     * @returns {string} - Color hex code
     */
    getFallbackColor(type) {
        return this.fallbackColors[type.toLowerCase()] || '#ff00ff';
    }

    /**
     * Check if a texture is loaded
     * @param {string} key - Texture key
     * @returns {boolean}
     */
    isLoaded(key) {
        return this.textures.has(key);
    }
}
