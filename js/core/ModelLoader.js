/**
 * ModelLoader - Handles loading and caching of 3D models (OBJ/MTL)
 * Uses Three.js loaders to load OBJ and MTL files
 */

import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import * as THREE from 'three';

export class ModelLoader {
    constructor() {
        this.models = new Map(); // Cache for loaded models
        this.loadingPromises = new Map(); // Track loading promises to avoid duplicate loads
        this.objLoader = new OBJLoader();
        this.mtlLoader = new MTLLoader();
        
        console.log('ModelLoader initialized');
    }

    /**
     * Load a 3D model from OBJ/MTL files
     * @param {string} key - Unique key for the model
     * @param {string} objPath - Path to OBJ file
     * @param {string|null} mtlPath - Path to MTL file (optional)
     * @returns {Promise<THREE.Group>} - Loaded 3D model
     */
    async loadModel(key, objPath, mtlPath = null) {
        // Return cached model if available
        if (this.models.has(key)) {
            return this.models.get(key).clone();
        }

        // Return existing loading promise if already loading
        if (this.loadingPromises.has(key)) {
            const model = await this.loadingPromises.get(key);
            return model.clone();
        }

        // Start loading
        const loadingPromise = this._loadModelInternal(key, objPath, mtlPath);
        this.loadingPromises.set(key, loadingPromise);

        try {
            const model = await loadingPromise;
            this.loadingPromises.delete(key);
            return model.clone();
        } catch (error) {
            this.loadingPromises.delete(key);
            throw error;
        }
    }

    /**
     * Internal method to load a model
     * @private
     */
    async _loadModelInternal(key, objPath, mtlPath) {
        try {
            let materials = null;

            // Load MTL file if provided
            if (mtlPath) {
                materials = await new Promise((resolve, reject) => {
                    this.mtlLoader.load(
                        mtlPath,
                        (materials) => {
                            materials.preload();
                            resolve(materials);
                        },
                        undefined,
                        reject
                    );
                });

                // Set material path for texture loading
                this.objLoader.setMaterials(materials);
            }

            // Load OBJ file
            const model = await new Promise((resolve, reject) => {
                this.objLoader.load(
                    objPath,
                    (object) => {
                        // Ensure object is a Group
                        const group = object instanceof THREE.Group 
                            ? object 
                            : new THREE.Group().add(object);
                        
                        // Store original for cloning
                        this.models.set(key, group);
                        resolve(group);
                    },
                    undefined,
                    reject
                );
            });

            console.log(`Model loaded: ${key} from ${objPath}`);
            return model;

        } catch (error) {
            console.error(`Failed to load model ${key}:`, error);
            throw new Error(`Failed to load model ${key}: ${error.message}`);
        }
    }

    /**
     * Get a cached model (returns clone)
     * @param {string} key - Model key
     * @returns {THREE.Group|null} - Cloned model or null if not loaded
     */
    getModel(key) {
        const model = this.models.get(key);
        return model ? model.clone() : null;
    }

    /**
     * Check if a model is loaded
     * @param {string} key - Model key
     * @returns {boolean} - True if loaded
     */
    isLoaded(key) {
        return this.models.has(key);
    }

    /**
     * Preload a set of models
     * @param {Array<{key: string, obj: string, mtl?: string}>} models - Array of model definitions
     * @returns {Promise<void>}
     */
    async preloadModels(models) {
        const loadPromises = models.map(async ({ key, obj, mtl }) => {
            try {
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`Timeout loading ${key}`)), 5000)
                );
                
                const model = await Promise.race([
                    this.loadModel(key, obj, mtl),
                    timeoutPromise
                ]);
                
                return model ? 1 : 0; // Count success
            } catch (error) {
                console.warn(`Failed to preload model ${key}:`, error.message || error);
                return 0; // Count failure
            }
        });

        const results = await Promise.all(loadPromises);
        const successCount = results.reduce((sum, result) => sum + result, 0);
        console.log(`Preloaded models: ${successCount}/${models.length} successful`);
    }

    /**
     * Clear model cache
     */
    clearCache() {
        this.models.clear();
        this.loadingPromises.clear();
    }

    /**
     * Get cache statistics
     * @returns {Object} - Cache stats
     */
    getCacheStats() {
        return {
            loadedModels: this.models.size,
            loadingModels: this.loadingPromises.size
        };
    }
}

// Export singleton instance
export const modelLoader = new ModelLoader();

