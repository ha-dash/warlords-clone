import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  MapTrifold,
  FloppyDisk,
  FolderOpen,
  Trash,
  CaretLeft,
  CaretUp,
  CaretDown,
  ArrowsInLineHorizontal,
  ArrowsInLineVertical,
  Info,
  Cube,
  SelectionPlus,
  Compass,
  List
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Hex, TERRAIN_CONFIG, TERRAIN_TYPES, type TerrainType } from '@/lib/game/Hex'
import { Map as GameMap } from '@/lib/game/Map'
import { modelLoader } from '@/lib/three/ModelLoader'
import { cn } from '@/lib/utils'

type EditMode = 'terrain' | 'building'

interface AssetModel {
  name: string
  obj: string
  mtl: string
}

interface AssetFolder {
  name: string
  models: AssetModel[]
}

interface AssetCategory {
  name: string
  folders: AssetFolder[]
}

// Глобальный рендерер и сцена для превью (чтобы не превышать лимит WebGL контекстов)
let sharedPreviewRenderer: THREE.WebGLRenderer | null = null
let sharedPreviewScene: THREE.Scene | null = null
let sharedPreviewCamera: THREE.PerspectiveCamera | null = null

const initSharedPreview = () => {
  if (typeof window === 'undefined') return null
  if (!sharedPreviewRenderer) {
    try {
      sharedPreviewRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true })
      sharedPreviewRenderer.setPixelRatio(1) // Для превью достаточно 1х для скорости
      sharedPreviewRenderer.setSize(120, 120)

      sharedPreviewScene = new THREE.Scene()
      // Улучшенное освещение: заполняющее + несколько направленных источников
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
      sharedPreviewScene.add(ambientLight)

      const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0)
      sharedPreviewScene.add(hemisphereLight)

      const mainLight = new THREE.DirectionalLight(0xffffff, 1.2)
      mainLight.position.set(5, 10, 7.5)
      sharedPreviewScene.add(mainLight)

      const fillLight = new THREE.DirectionalLight(0xffffff, 0.6)
      fillLight.position.set(-5, 5, -5)
      sharedPreviewScene.add(fillLight)

      sharedPreviewCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
      sharedPreviewCamera.position.set(4, 4, 4)
      sharedPreviewCamera.lookAt(0, 0, 0)
    } catch (e) {
      console.error('Failed to init shared preview renderer:', e)
      return null
    }
  }
  return { renderer: sharedPreviewRenderer, scene: sharedPreviewScene!, camera: sharedPreviewCamera! }
}

function ModelPreview({ obj, mtl }: { obj: string; mtl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hasImage, setHasImage] = useState(false)

  useEffect(() => {
    const shared = initSharedPreview()
    if (!shared || !canvasRef.current) return

    let isMounted = true
    const { renderer, scene, camera } = shared

    modelLoader.loadModel(`${obj}_preview`, obj, mtl).then(model => {
      if (!isMounted) return

      const modelInstance = model.clone()
      const box = new THREE.Box3().setFromObject(modelInstance)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = 3.8 / (maxDim || 1)

      modelInstance.scale.set(scale, scale, scale)
      modelInstance.position.sub(center.multiplyScalar(scale))
      modelInstance.rotation.y = Math.PI / 2

      // Очищаем сцену и добавляем модель
      const tempGroup = new THREE.Group()
      tempGroup.add(modelInstance)
      scene.add(tempGroup)

      // Рендерим один кадр
      renderer.setClearColor(0x000000, 0)
      renderer.render(scene, camera)

      // Копируем результат на 2D канвас компонента
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, 120, 120)
        ctx.drawImage(renderer.domElement, 0, 0, 120, 120)
        setHasImage(true)
      }

      // Убираем модель из общей сцены
      scene.remove(tempGroup)
    }).catch(err => console.error('Preview load error:', err))

    return () => { isMounted = false }
  }, [obj, mtl])

  return (
    <div className="relative w-full aspect-square bg-muted/20 rounded-lg overflow-hidden flex items-center justify-center">
      {!hasImage && <div className="absolute inset-0 flex items-center justify-center"><Cube className="animate-spin text-muted-foreground/30" size={24} /></div>}
      <canvas ref={canvasRef} width={120} height={120} className={cn("w-full h-full pointer-events-none transition-opacity duration-300", hasImage ? "opacity-100" : "opacity-0")} />
    </div>
  )
}

export default function MapEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<GameMap | null>(null)
  const hexMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const buildingObjectsRef = useRef<Map<string, THREE.Group>>(new Map())
  const selectionMeshRef = useRef<THREE.Mesh | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const draggedModelRef = useRef<{ obj: string; mtl: string; name: string } | null>(null)
  const tileHeightRef = useRef<number>(1.0) // Will be updated from first loaded model

  const [isLoading, setIsLoading] = useState(true)
  const [loadingText, setLoadingText] = useState('Initializing...')
  const [mapWidth, setMapWidth] = useState(10)
  const [mapHeight, setMapHeight] = useState(5)
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType>(TERRAIN_TYPES.PLAINS)
  const [editMode, setEditMode] = useState<EditMode>('terrain')
  const [selectedHex, setSelectedHex] = useState<{ x: number; y: number } | null>(null)
  const [currentHeightLevel, setCurrentHeightLevel] = useState(0) // Global height level 0-4
  const [selectedModel, setSelectedModel] = useState<{ obj: string; mtl: string; name: string } | null>(null)

  const isDraggingRef = useRef(false) // Left click + modifier (legacy)
  const isRotatingRef = useRef(false) // Right click rotate
  const isPanningRef = useRef(false)   // Middle click pan
  const lastMouseRef = useRef({ x: 0, y: 0 })
  const cameraDistanceRef = useRef(150)
  const cameraAngleXRef = useRef(Math.PI / 4)
  const cameraAngleYRef = useRef(Math.PI / 4)
  const cameraTargetRef = useRef(new THREE.Vector3(0, 0, 0))

  const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedFolder, setSelectedFolder] = useState<string>('')

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const response = await fetch('/api/assets')
        const data = await response.json()
        setAssetCategories(data.categories)
        if (data.categories.length > 0) {
          const tiles = data.categories.find((c: any) => c.name === 'tiles')
          if (tiles) {
            setSelectedCategory('tiles')
            if (tiles.folders.length > 0) setSelectedFolder(tiles.folders[0].name)
          } else {
            setSelectedCategory(data.categories[0].name)
            setSelectedFolder(data.categories[0].folders[0].name)
          }
        }
      } catch (error) {
        console.error('Failed to fetch assets:', error)
      }
    }
    fetchAssets()
  }, [])

  useEffect(() => {
    if (selectedCategory === 'tiles') {
      setEditMode('terrain')
    } else {
      setEditMode('building')
    }
  }, [selectedCategory])

  const currentCategory = assetCategories.find(c => c.name === selectedCategory)
  const currentFolder = currentCategory?.folders.find(f => f.name === selectedFolder)
  const availableModels = currentFolder?.models || []

  const hexToWorld = (x: number, y: number, mWidth?: number, mHeight?: number): [number, number] => {
    const scale = 3.5
    const r = 1.0 // inner radius in model
    const R = 2 / Math.sqrt(3) // outer radius in model (~1.1547)

    const width = mWidth ?? mapRef.current?.width ?? 10
    const height = mHeight ?? mapRef.current?.height ?? 5

    // Flat Topped Offset-X layout (matching user image)
    // Vertical spacing between centers: 2 * r * scale
    // Horizontal spacing between column centers: 1.5 * R * scale
    // Vertical shift for every other column: r * scale
    const spacingX = 1.5 * R * scale
    const spacingZ = 2.0 * r * scale
    const offsetZ = r * scale

    // Mapping: User X -> Three.js X, User Y -> Three.js Z, User Z (Height) -> Three.js Y
    const worldX = (x - width / 2) * spacingX
    const worldZ = (y - height / 2) * spacingZ + (x % 2) * offsetZ
    return [worldX, worldZ]
  }

  const createHexagonalGrid = (width: number, height: number, level: number): THREE.Group => {
    const getHexPoints = (cx: number, cy: number, radius: number, rotation: number): THREE.Vector3[] => {
      const points: THREE.Vector3[] = []
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60 + rotation) * (Math.PI / 180)
        const x = cx + radius * Math.cos(angle)
        const y = cy + radius * Math.sin(angle)
        points.push(new THREE.Vector3(x, 0, y))
      }
      return points
    }

    const group = new THREE.Group()
    group.name = `__hexGrid_level_${level}`
    const R = 2 / Math.sqrt(3)
    const scale = 3.5
    const LEVEL_HEIGHT = tileHeightRef.current || 0.7
    const gridY = level * LEVEL_HEIGHT + 0.001

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const [worldX, worldZ] = hexToWorld(x, y, width, height)
        const points = getHexPoints(worldX, worldZ, R * scale, 0)
        const linePoints: THREE.Vector3[] = []
        for (let i = 0; i < 6; i++) {
          linePoints.push(points[i], points[(i + 1) % 6])
        }
        const geometry = new THREE.BufferGeometry().setFromPoints(linePoints)
        const material = new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.3 })
        const segments = new THREE.LineSegments(geometry, material)
        segments.position.y = gridY
        segments.name = `grid_${x}_${y}_level_${level}`
        segments.renderOrder = -1
        group.add(segments)
      }
    }
    return group
  }

  const _worldToHex = (worldX: number, worldZ: number): { x: number; y: number } | null => {
    const scale = 3.5
    const R = 2 / Math.sqrt(3)
    const width = mapRef.current?.width ?? 10
    const height = mapRef.current?.height ?? 5
    const spacingX = 1.5 * R * scale
    const spacingY = 2.0 * scale
    const offsetX = -(width - 1) * spacingX / 2
    const offsetZ = -(height - 1) * spacingY / 2

    const relX = worldX - offsetX
    const relZ = worldZ - offsetZ

    const col = Math.round(relX / spacingX)
    const rowOffset = (col % 2 === 0) ? 0 : 0.5
    const row = Math.round((relZ / spacingY) - rowOffset)

    // Validate coordinates
    if (!Number.isFinite(col) || !Number.isFinite(row)) {
      return null
    }

    if (col < 0 || col >= width || row < 0 || row >= height) {
      return null
    }

    return { x: col, y: row }
  }

  const setupLighting = (scene: THREE.Scene) => {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(50, 100, 50)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)
  }


  const createHexMesh = async (hex: Hex): Promise<THREE.Group | null> => {
    const [worldX, worldZ] = hexToWorld(hex.x, hex.y, mapRef.current?.width, mapRef.current?.height)
    try {
      const model = hex.modelData || selectedModel || availableModels[0]
      if (model) {
        // If hex didn't have modelData, save it now to ensure persistence
        if (!hex.modelData) hex.modelData = model

        const key = `terrain_${hex.terrain}_${model.name}_${hex.x}_${hex.y}`

        // Try to get from cache synchronously first
        let loadedModel = modelLoader.getCachedModel(key)

        // If not in cache, wait for it
        if (!loadedModel) {
          loadedModel = await modelLoader.loadModel(key, model.obj, model.mtl)
        }

        if (loadedModel) {
          const clone = loadedModel.clone()

          // Important: we scale the group BEFORE measuring so we get the actual scaled height
          clone.rotation.y = Math.PI / 2 + (hex.rotation || 0)
          clone.scale.set(3.5, 3.5, 3.5)

          // Measure tile height AFTER scaling to get actual scaled height
          const realBox = new THREE.Box3().setFromObject(clone)
          const actualHeight = realBox.max.y - realBox.min.y
          
          // Calibrate LEVEL_HEIGHT constant from first model if not set
          // LEVEL_HEIGHT is CONSTANT (height of base tile after scaling)
          if (tileHeightRef.current === 1.0 && actualHeight > 0) {
            tileHeightRef.current = actualHeight
          }

          // LEVEL_HEIGHT is CONSTANT (height of base tile)
          const LEVEL_HEIGHT = tileHeightRef.current

          // Position: each level stands on top of the previous level
          // Level 0: Y = 0 - minY (bottom of tile at ground level)
          // Level 1: Y = LEVEL_HEIGHT - minY (bottom of tile at top of level 0)
          // Level 2: Y = 2 * LEVEL_HEIGHT - minY (bottom of tile at top of level 1)
          const minY = realBox.min.y
          const levelBaseY = (hex.height || 0) * LEVEL_HEIGHT
          clone.position.set(worldX, levelBaseY - minY, worldZ)

          clone.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true
              child.receiveShadow = true
            }
          })

          // Update individual grid height
          const grid = sceneRef.current?.getObjectByName('__hexGrid')?.getObjectByName(`grid_${hex.x}_${hex.y}`)
          if (grid) {
            const LEVEL_HEIGHT = tileHeightRef.current
            grid.position.y = (hex.height || 0) * LEVEL_HEIGHT + 0.001
            grid.visible = true // Grid is always visible under tiles
          }

          return clone
        }
      }
    } catch (error) {
      console.warn(`Failed to load model for hex ${hex.x},${hex.y}:`, error)
    }
    return null
  }

  const handleInitializeMap = async () => {
    if (!sceneRef.current) return

    // Fill only if a tile is selected
    if (!selectedModel) {
      console.warn('Please select a tile in the preview first.')
      return
    }

    setLoadingText('Заполнение карты...')
    const map = new GameMap(mapWidth, mapHeight)

    // Determine terrain type based on current selection
    let terrain: TerrainType = TERRAIN_TYPES.PLAINS
    if (selectedFolder === 'roads') terrain = TERRAIN_TYPES.ROAD
    else if (selectedFolder === 'coast') terrain = TERRAIN_TYPES.WATER
    else if (selectedFolder === 'forest') terrain = TERRAIN_TYPES.FOREST
    else if (selectedFolder === 'mountains') terrain = TERRAIN_TYPES.MOUNTAIN

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const h = new Hex(x, y, terrain)
        h.modelData = selectedModel
        map.setHex(x, y, h)
      }
    }

    mapRef.current = map
    await buildMap()
    setSelectedHex(null)
  }

  const buildMap = async () => {
    if (!sceneRef.current || !mapRef.current) return
    setLoadingText('Построение карты...')

    // Clear hexes
    hexMeshesRef.current.forEach((mesh) => {
      sceneRef.current?.remove(mesh)
    })
    hexMeshesRef.current.clear()

    // Clear buildings
    buildingObjectsRef.current.forEach((obj) => {
      sceneRef.current?.remove(obj)
    })
    buildingObjectsRef.current.clear()

    // Build meshes for all hexes in all stacks
    const promises: Promise<void>[] = []

    mapRef.current.hexes.forEach((hexStack, i) => {
      if (hexStack && hexStack.length > 0) {
        hexStack.forEach(hex => {
          const promise = (async () => {
            const mesh = await createHexMesh(hex)
            if (mesh && sceneRef.current) {
              sceneRef.current.add(mesh)
              hexMeshesRef.current.set(`${hex.x},${hex.y}_${hex.height}`, mesh as any)
            }
          })()
          promises.push(promise)
        })
      }
    })

    await Promise.all(promises)
  }

  const updateHexMesh = async (x: number, y: number, height?: number) => {
    if (!mapRef.current || !sceneRef.current) return

    // If height specified, update only that hex. Otherwise update all hexes at position
    const hexStack = mapRef.current.getHexStack(x, y)
    const hexesToUpdate = height !== undefined
      ? hexStack.filter(h => h.height === height)
      : hexStack

    for (const hex of hexesToUpdate) {
      const hexKey = `${x},${y}_${hex.height}`
      const oldMesh = hexMeshesRef.current.get(hexKey)

      // Remove old mesh
      if (oldMesh) {
        sceneRef.current.remove(oldMesh)
        hexMeshesRef.current.delete(hexKey)
      }

      // Create new mesh
      const model = hex.modelData || selectedModel || availableModels[0]

      if (model) {
        if (!hex.modelData) hex.modelData = model
        const key = `terrain_${hex.terrain}_${model.name}_${hex.x}_${hex.y}_${hex.height}`
        const cached = modelLoader.getCachedModel(key)

        if (cached) {
          const [wX, wZ] = hexToWorld(x, y)
          const clone = cached.clone()
          clone.rotation.y = Math.PI / 2 + (hex.rotation || 0)
          clone.scale.set(3.5, 3.5, 3.5)

          // Calculate position using CONSTANT level height
          const box = new THREE.Box3().setFromObject(clone)
          const minY = box.min.y // Bottom of the model

          // Level height is CONSTANT (height of base tile)
          const LEVEL_HEIGHT = tileHeightRef.current || 0.7

          // Position: level * LEVEL_HEIGHT, adjusted so bottom aligns with level top
          const levelTop = hex.height * LEVEL_HEIGHT
          clone.position.set(wX, levelTop - minY, wZ)

          sceneRef.current.add(clone)
          hexMeshesRef.current.set(hexKey, clone as any)

          // Force selection highlight update if this is the selected hex
          if (selectedHex && selectedHex.x === x && selectedHex.y === y) {
            setSelectedHex({ ...selectedHex })
          }
        } else {
          // Load asynchronously if not cached
          const mesh = await createHexMesh(hex)
          if (mesh && sceneRef.current) {
            sceneRef.current.add(mesh)
            hexMeshesRef.current.set(hexKey, mesh as any)
          }
        }
      }
    }
  }

  const removeHex = async (x: number, y: number) => {
    if (!sceneRef.current || !mapRef.current) return

    // Always remove topmost hex
    const hexStack = mapRef.current.getHexStack(x, y)
    const targetHex = hexStack.length > 0 ? hexStack[hexStack.length - 1] : null

    if (!targetHex) return

    const hexKey = `${x},${y}_${targetHex.height}`
    const obj = hexMeshesRef.current.get(hexKey)

    if (obj) {
      sceneRef.current.remove(obj)
      hexMeshesRef.current.delete(hexKey)
    }

    // Remove hex from map
    mapRef.current.removeHex(x, y, targetHex.height)

    // Update grid visibility - show grid for this level if no hex at this level
    if (!mapRef.current.hasHex(x, y, targetHex.height)) {
      const grid = sceneRef.current.getObjectByName(`__hexGrid_level_${targetHex.height}`)?.getObjectByName(`grid_${x}_${y}_level_${targetHex.height}`)
      if (grid) {
        grid.visible = true
      }
    }

    const building = buildingObjectsRef.current.get(hexKey)
    if (building) {
      sceneRef.current.remove(building)
      buildingObjectsRef.current.delete(hexKey)
    }
  }

  const placeBuilding = async (x: number, y: number, building: AssetModel) => {
    if (!sceneRef.current) return
    const hexKey = `${x},${y}`
    const [worldX, worldZ] = hexToWorld(x, y, mapRef.current?.width, mapRef.current?.height)
    const oldBuilding = buildingObjectsRef.current.get(hexKey)
    if (oldBuilding) sceneRef.current.remove(oldBuilding)
    try {
      const key = `building_${building.name}_${x}_${y}`
      const loadedModel = await modelLoader.loadModel(key, building.obj, building.mtl)
      loadedModel.position.set(worldX, 0, worldZ)
      loadedModel.rotation.y = Math.PI / 2
      loadedModel.scale.set(3.5, 3.5, 3.5)
      sceneRef.current.add(loadedModel)
      buildingObjectsRef.current.set(hexKey, loadedModel)
    } catch (error) {
      console.error(`Failed to place building ${building.name}:`, error)
    }
  }

  const initialize = async () => {
    if (!canvasRef.current) return
    try {
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x1a1a1a)
      sceneRef.current = scene

      // Create a hit plane for clicking on empty spaces
      const hitPlaneGeom = new THREE.PlaneGeometry(1000, 1000)
      const hitPlaneMat = new THREE.MeshBasicMaterial({ visible: false })
      const hitPlane = new THREE.Mesh(hitPlaneGeom, hitPlaneMat)
      hitPlane.rotation.x = -Math.PI / 2
      hitPlane.name = '__hitPlane'
      scene.add(hitPlane)

      // Add hexagonal grids for all levels (initially only current level visible)
      for (let level = 0; level <= 4; level++) {
        const hexGrid = createHexagonalGrid(mapWidth, mapHeight, level)
        hexGrid.visible = (level === currentHeightLevel)
        scene.add(hexGrid)
      }

      // Initialize Selection Highlight here to ensure it exists in the scene
      const scale = 3.5
      const R = 2 / Math.sqrt(3)
      const outerR = R * scale * 1.05
      const innerR = R * scale * 0.95

      const selectionShape = new THREE.Shape()
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60) * (Math.PI / 180)
        const x = outerR * Math.cos(angle)
        const y = outerR * Math.sin(angle)
        if (i === 0) selectionShape.moveTo(x, y)
        else selectionShape.lineTo(x, y)
      }
      selectionShape.closePath()

      const selectionHole = new THREE.Path()
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60) * (Math.PI / 180)
        const x = innerR * Math.cos(angle)
        const y = innerR * Math.sin(angle)
        if (i === 0) selectionHole.moveTo(x, y)
        else selectionHole.lineTo(x, y)
      }
      selectionHole.closePath()
      selectionShape.holes.push(selectionHole)

      const selectionGeom = new THREE.ShapeGeometry(selectionShape)
      selectionGeom.rotateX(-Math.PI / 2)
      selectionGeom.rotateY(Math.PI / 2)

      const selectionMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff, // Bright Cyan (Primary)
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false
      })
      const sMesh = new THREE.Mesh(selectionGeom, selectionMat)
      sMesh.name = '__selectionHighlight'
      sMesh.renderOrder = 2000
      sMesh.visible = false
      scene.add(sMesh)
      selectionMeshRef.current = sMesh

      const container = containerRef.current
      if (!container) return
      const width = container.clientWidth
      const height = container.clientHeight

      const aspect = width / height
      const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 10000)
      cameraRef.current = camera
      const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true })
      renderer.setSize(width, height)
      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.shadowMap.enabled = true
      rendererRef.current = renderer
      setupLighting(scene)
      const map = new GameMap(mapWidth, mapHeight)
      mapRef.current = map
      await buildMap()
      animate()
      setIsLoading(false)
    } catch (error) {
      console.error('Init failed:', error)
      setLoadingText(`Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const animate = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return
    const camera = cameraRef.current
    const dist = cameraDistanceRef.current
    const ax = cameraAngleXRef.current
    const ay = cameraAngleYRef.current
    const target = cameraTargetRef.current
    camera.position.x = target.x + Math.cos(ay) * Math.cos(ax) * dist
    camera.position.y = target.y + Math.sin(ax) * dist
    camera.position.z = target.z + Math.sin(ay) * Math.cos(ax) * dist
    camera.lookAt(target)
    rendererRef.current.render(sceneRef.current, camera)
    animationFrameRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    initialize()
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      // WASD Panning
      const moveSpeed = 5
      const yaw = cameraAngleYRef.current
      const forward = new THREE.Vector3(-Math.cos(yaw), 0, -Math.sin(yaw))
      const right = new THREE.Vector3(-Math.sin(yaw), 0, Math.cos(yaw))

      if (e.code === 'KeyW') cameraTargetRef.current.add(forward.multiplyScalar(moveSpeed))
      if (e.code === 'KeyS') cameraTargetRef.current.add(forward.multiplyScalar(-moveSpeed))
      if (e.code === 'KeyA') cameraTargetRef.current.add(right.multiplyScalar(-moveSpeed))
      if (e.code === 'KeyD') cameraTargetRef.current.add(right.multiplyScalar(moveSpeed))

      // Q/E Rotating, R/F Height change for selected hex
      if (selectedHex && mapRef.current) {
        // Always work with topmost hex
        const hexStack = mapRef.current.getHexStack(selectedHex.x, selectedHex.y)
        const hex = hexStack.length > 0 ? hexStack[hexStack.length - 1] : null

        if (hex) {
          const oldHeight = hex.height

          if (e.code === 'KeyQ') {
            hex.rotation = (hex.rotation || 0) - Math.PI / 3
            updateHexMesh(selectedHex.x, selectedHex.y, hex.height)
          }
          if (e.code === 'KeyE') {
            hex.rotation = (hex.rotation || 0) + Math.PI / 3
            updateHexMesh(selectedHex.x, selectedHex.y, hex.height)
          }
          if (e.code === 'KeyR') {
            const newHeight = Math.min(4, (hex.height || 0) + 1)
            if (newHeight !== oldHeight && !mapRef.current.hasHex(selectedHex.x, selectedHex.y, newHeight)) {
              // Remove from old height
              mapRef.current.removeHex(selectedHex.x, selectedHex.y, oldHeight)
              const oldMeshKey = `${selectedHex.x},${selectedHex.y}_${oldHeight}`
              const oldMesh = hexMeshesRef.current.get(oldMeshKey)
              if (oldMesh && sceneRef.current) {
                sceneRef.current.remove(oldMesh)
                hexMeshesRef.current.delete(oldMeshKey)
              }

              // Add at new height
              hex.height = newHeight
              mapRef.current.setHex(selectedHex.x, selectedHex.y, hex)
              await updateHexMesh(selectedHex.x, selectedHex.y, newHeight)
            }
          }
          if (e.code === 'KeyF') {
            const newHeight = Math.max(0, (hex.height || 0) - 1)
            if (newHeight !== oldHeight && !mapRef.current.hasHex(selectedHex.x, selectedHex.y, newHeight)) {
              // Remove from old height
              mapRef.current.removeHex(selectedHex.x, selectedHex.y, oldHeight)
              const oldMeshKey = `${selectedHex.x},${selectedHex.y}_${oldHeight}`
              const oldMesh = hexMeshesRef.current.get(oldMeshKey)
              if (oldMesh && sceneRef.current) {
                sceneRef.current.remove(oldMesh)
                hexMeshesRef.current.delete(oldMeshKey)
              }

              // Add at new height
              hex.height = newHeight
              mapRef.current.setHex(selectedHex.x, selectedHex.y, hex)
              await updateHexMesh(selectedHex.x, selectedHex.y, newHeight)
            }
          }
        }
      }

      // Delete key deletes selected hex (topmost)
      if (e.code === 'Delete' && selectedHex) {
        await removeHex(selectedHex.x, selectedHex.y)
        setSelectedHex(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedHex])

  // Selection Highlight Update Effect
  useEffect(() => {
    if (!selectionMeshRef.current || !mapRef.current) return

    if (selectedHex) {
      // Always get the topmost hex at this position
      const hex = mapRef.current.getHex(selectedHex.x, selectedHex.y)
      if (!hex) {
        selectionMeshRef.current.visible = false
        return
      }

      const [wX, wZ] = hexToWorld(selectedHex.x, selectedHex.y)

      let hValue = 0
      const hexKey = `${selectedHex.x},${selectedHex.y}`
      const hexStack = mapRef.current.getHexStack(selectedHex.x, selectedHex.y)
      const topmostHex = hexStack.length > 0 ? hexStack[hexStack.length - 1] : hex
      const meshKey = topmostHex ? `${selectedHex.x},${selectedHex.y}_${topmostHex.height}` : hexKey
      const meshObj = hexMeshesRef.current.get(meshKey)

      if (meshObj) {
        meshObj.updateMatrixWorld(true)
        const box = new THREE.Box3().setFromObject(meshObj)
        if (!box.isEmpty()) {
          hValue = box.max.y
        } else {
          const LEVEL_HEIGHT = tileHeightRef.current || 0.7
          hValue = (topmostHex?.height || 0) * LEVEL_HEIGHT + (LEVEL_HEIGHT / 2)
        }
      } else {
        const LEVEL_HEIGHT = tileHeightRef.current || 0.7
        const h = topmostHex ? (topmostHex.height || 0) : 0
        hValue = h * LEVEL_HEIGHT + (LEVEL_HEIGHT / 2)
      }

      selectionMeshRef.current.position.set(wX, hValue + 0.1, wZ)
      // Mirror the tile's rotation: constant offset PI/2 + hex state rotation
      selectionMeshRef.current.rotation.y = Math.PI / 2 + (topmostHex?.rotation || 0)
      selectionMeshRef.current.visible = true
      // Force update
      selectionMeshRef.current.updateMatrixWorld()
    } else {
      selectionMeshRef.current.visible = false
    }
  }, [selectedHex, mapRef.current?.hexes])

  useEffect(() => {
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current && containerRef.current) {
        const width = containerRef.current.clientWidth
        const height = containerRef.current.clientHeight
        cameraRef.current.aspect = width / height
        cameraRef.current.updateProjectionMatrix()
        rendererRef.current.setSize(width, height)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!cameraRef.current || !mapRef.current || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, cameraRef.current)

    // Raycast against hexes - always get the topmost (first) intersection
    const intersects = raycaster.intersectObjects(Array.from(hexMeshesRef.current.values()), true)
    if (intersects.length > 0) {
      let hitMesh: THREE.Object3D | null = intersects[0].object
      // Traverse up to find the entry in hexMeshesRef (since models are Groups)
      let hexKey: string | null = null
      while (hitMesh && !hexKey) {
        const found = Array.from(hexMeshesRef.current.entries()).find(([_, m]) => m === hitMesh)
        if (found) hexKey = found[0]
        else hitMesh = hitMesh.parent
      }

      if (hexKey) {
        // Parse key format: "x,y_height"
        const parts = hexKey.split('_')
        const [x, y] = parts[0].split(',').map(Number)
        // Always select the topmost hex (no height in selectedHex)
        setSelectedHex({ x, y })
        return
      }
    }

    // Raycast against the hit plane if no hex was hit
    const planeIntersects = raycaster.intersectObjects(
      sceneRef.current?.children.filter((c) => c.name === '__hitPlane') || []
    )
    if (planeIntersects.length > 0) {
      const pt = planeIntersects[0].point
      const coords = _worldToHex(pt.x, pt.z)
      if (coords) {
        const { x, y } = coords
        if (mapRef.current.hasHex(x, y)) {
          setSelectedHex({ x, y })
        } else {
          // Deselect if clicking on empty spot of the grid
          setSelectedHex(null)
        }
      } else {
        setSelectedHex(null)
      }
    } else {
      // Didn't even hit the plane
      setSelectedHex(null)
    }
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const dx = event.clientX - lastMouseRef.current.x
    const dy = event.clientY - lastMouseRef.current.y

    if (isRotatingRef.current) {
      cameraAngleYRef.current += dx * 0.01
      cameraAngleXRef.current = Math.max(0.1, Math.min(Math.PI / 2, cameraAngleXRef.current + dy * 0.01))
    } else if (isPanningRef.current) {
      const yaw = cameraAngleYRef.current
      const forward = new THREE.Vector3(-Math.cos(yaw), 0, -Math.sin(yaw))
      const right = new THREE.Vector3(-Math.sin(yaw), 0, Math.cos(yaw))
      const panFactor = cameraDistanceRef.current * 0.001
      cameraTargetRef.current.add(right.multiplyScalar(dx * panFactor))
      cameraTargetRef.current.add(forward.multiplyScalar(dy * panFactor))
    } else if (isDraggingRef.current) {
      cameraAngleYRef.current += dx * 0.01
      cameraAngleXRef.current = Math.max(0.1, Math.min(Math.PI / 2, cameraAngleXRef.current + dy * 0.01))
    }
    lastMouseRef.current = { x: event.clientX, y: event.clientY }
  }

  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    cameraDistanceRef.current = Math.max(50, Math.min(500, cameraDistanceRef.current + event.deltaY * 0.1))
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground selection:bg-primary/20">
      <aside className="w-80 border-r border-border bg-card/50 backdrop-blur-md flex flex-col z-20">
        <div className="p-6 border-b border-border flex items-center justify-between bg-card/80">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <MapTrifold size={24} className="text-primary" weight="fill" />
              Editor
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Warlords Clone</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => window.location.href = '/'}>
            <CaretLeft size={20} />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 flex flex-col h-full gap-6 min-h-0">
            <section className="space-y-4">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Map Config</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" value={mapWidth} onChange={(e) => setMapWidth(parseInt(e.target.value) || 10)} />
                <Input type="number" value={mapHeight} onChange={(e) => setMapHeight(parseInt(e.target.value) || 5)} />
              </div>
              <Button
                className="w-full"
                onClick={handleInitializeMap}
                disabled={!selectedModel}
              >
                {selectedModel ? 'Fill' : 'Select Tile to Fill'}
              </Button>
            </section>
            <Separator />
            <section className="space-y-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {assetCategories.map(c => <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currentCategory?.folders.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2 h-full content-start">
                {availableModels.map((m, i) => (
                  <div
                    key={i}
                    draggable={true}
                    onDragStart={() => {
                      draggedModelRef.current = m
                      setSelectedModel(m)
                    }}
                    onClick={() => setSelectedModel(m)}
                    className={cn("p-1 rounded-xl border-2 transition-all cursor-pointer group hover:bg-muted/30", selectedModel?.name === m.name ? "border-primary bg-primary/5" : "border-transparent bg-muted/10")}
                  >
                    <ModelPreview obj={m.obj} mtl={m.mtl} />
                    <p className="text-[11px] font-bold text-center mt-1 truncate px-1 py-1 uppercase tracking-tight">{m.name}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>
        <div className="p-4 border-t border-border flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="flex-1 font-bold">Open</Button>
            <Button className="flex-1 font-bold shadow-lg shadow-primary/20">Save</Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 relative flex flex-col overflow-hidden bg-[#050505]" ref={containerRef}>
        {/* TOP CENTER: CAMERA MODE */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 p-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-full flex items-center gap-3 px-4 py-2 shadow-2xl transition-all hover:bg-card/95">
          <Compass size={18} className="text-primary animate-pulse" />
          <span className="text-xs font-bold tracking-tight uppercase">3D PERSPECTIVE</span>
          <Separator orientation="vertical" className="h-4 bg-border/50" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-primary/20 text-primary transition-colors" onClick={() => { cameraDistanceRef.current = 150; cameraAngleXRef.current = Math.PI / 4; cameraAngleYRef.current = Math.PI / 4; }}>
                <ArrowsInLineHorizontal size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset View</TooltipContent>
          </Tooltip>
        </div>

        {/* TOP LEFT: GRID INFO */}
        <div className="absolute top-4 left-4 z-30 p-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-full flex items-center gap-3 px-4 py-2 shadow-2xl">
          <MapTrifold size={18} className="text-primary" weight="bold" />
          <span className="text-xs font-bold tracking-tight uppercase">GRID: {mapWidth}×{mapHeight}</span>
        </div>

        {/* TOP RIGHT: CURRENT SELECTION FROM PREVIEW */}
        {selectedModel && (
          <div className="absolute top-4 right-4 z-30 p-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-full flex items-center gap-3 pl-4 pr-2 py-1.5 shadow-2xl">
            <Cube size={18} className="text-primary" weight="bold" />
            <div className="flex flex-col leading-none">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold leading-tight">Placing</span>
              <span className="text-xs font-bold tracking-tight uppercase">{selectedModel.name}</span>
            </div>
            <div className="w-8 h-8 rounded-full border border-primary/20 bg-muted/20 overflow-hidden ml-1">
              <ModelPreview obj={selectedModel.obj} mtl={selectedModel.mtl} />
            </div>
          </div>
        )}

        {/* LEFT CENTER: GLOBAL HEIGHT LEVEL SELECTOR */}
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-card/80 backdrop-blur-xl border border-border/50 hover:bg-primary/20 text-primary transition-all shadow-xl"
            onClick={() => setCurrentHeightLevel(prev => Math.min(4, prev + 1))}
            disabled={currentHeightLevel >= 4}
          >
            <CaretUp size={20} weight="bold" />
          </Button>
          <div className="p-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl px-4 py-3 shadow-2xl">
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Level</span>
              <span className="text-2xl font-black text-primary tracking-tighter tabular-nums">{currentHeightLevel + 1}</span>
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none">of 5</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-card/80 backdrop-blur-xl border border-border/50 hover:bg-primary/20 text-primary transition-all shadow-xl"
            onClick={() => setCurrentHeightLevel(prev => Math.max(0, prev - 1))}
            disabled={currentHeightLevel <= 0}
          >
            <CaretDown size={20} weight="bold" />
          </Button>
        </div>

        {/* BOTTOM LEFT: SELECTION INFO */}
        {selectedHex && mapRef.current?.getHex(selectedHex.x, selectedHex.y) && (
          <div className="absolute bottom-6 left-6 z-30 p-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-full flex items-center gap-4 px-6 py-3 shadow-2xl pointer-events-auto animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hex</span>
              <span className="text-sm font-black text-primary tracking-tighter tabular-nums">{selectedHex.x}, {selectedHex.y}</span>
            </div>
            <Separator orientation="vertical" className="h-5 bg-border/50" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Level</span>
              <span className="text-sm font-black text-primary tracking-tighter tabular-nums">{(mapRef.current.getHex(selectedHex.x, selectedHex.y)?.height || 0) + 1}/5</span>
            </div>
            <Separator orientation="vertical" className="h-5 bg-border/50" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Type</span>
              <span className="text-xs font-bold text-primary tracking-tight uppercase">{mapRef.current.getHex(selectedHex.x, selectedHex.y)?.modelData?.name || mapRef.current.getHex(selectedHex.x, selectedHex.y)?.terrain || 'Standard'}</span>
            </div>
          </div>
        )}

        {/* BOTTOM RIGHT: CONTROLS */}
        <div className="absolute bottom-6 right-6 z-30 p-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-full flex items-center gap-4 px-6 py-3 shadow-2xl pointer-events-auto">
          <span className="text-[11px] font-bold text-primary tracking-widest uppercase flex items-center gap-2">
            <span className="bg-primary/20 px-2 py-0.5 rounded border border-primary/30 text-primary">WASD</span> Pan
          </span>
          <Separator orientation="vertical" className="h-4 bg-border/50" />
          <span className="text-[11px] font-bold text-primary tracking-widest uppercase flex items-center gap-2">
            <span className="bg-primary/20 px-2 py-0.5 rounded border border-primary/30 text-primary">Q / E</span> Rotate
          </span>
          <Separator orientation="vertical" className="h-4 bg-border/50" />
          <span className="text-[11px] font-bold text-primary tracking-widest uppercase flex items-center gap-2">
            <span className="bg-primary/20 px-2 py-0.5 rounded border border-primary/30 text-primary">R / F</span> Height
          </span>
          <Separator orientation="vertical" className="h-4 bg-border/50" />
          <span className="text-[11px] font-bold text-destructive tracking-widest uppercase flex items-center gap-2">
            <span className="bg-destructive/20 px-2 py-0.5 rounded border border-destructive/30 text-destructive">DEL</span> Clear
          </span>
        </div>

        <div className="flex-1 relative">
          {isLoading && <div className="absolute inset-0 bg-background/90 z-50 flex items-center justify-center font-bold uppercase tracking-widest">{loadingText}</div>}
          <canvas
            ref={canvasRef}
            className="w-full h-full outline-none cursor-crosshair"
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'copy'
            }}
            onDrop={async (e) => {
              e.preventDefault()
              if (!draggedModelRef.current || !mapRef.current || !canvasRef.current || !cameraRef.current) return
              const rect = canvasRef.current.getBoundingClientRect()
              const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
              )
              const raycaster = new THREE.Raycaster()
              raycaster.setFromCamera(mouse, cameraRef.current)
              const intersects = raycaster.intersectObjects(Array.from(hexMeshesRef.current.values()), true)
              let targetCoords: { x: number; y: number } | null = null

              if (intersects.length > 0) {
                let hitMesh: THREE.Object3D | null = intersects[0].object
                let hexKey: string | null = null
                while (hitMesh && !hexKey) {
                  const found = Array.from(hexMeshesRef.current.entries()).find(([_, m]) => m === hitMesh)
                  if (found) hexKey = found[0]
                  else hitMesh = hitMesh.parent
                }
                if (hexKey) {
                  // Parse key format: "x,y_height"
                  const parts = hexKey.split('_')
                  const [x, y] = parts[0].split(',').map(Number)
                  targetCoords = { x, y }
                }
              }

              if (!targetCoords) {
                const planeIntersects = raycaster.intersectObjects(
                  sceneRef.current?.children.filter((c) => c.name === '__hitPlane') || []
                )
                if (planeIntersects.length > 0) {
                  targetCoords = _worldToHex(planeIntersects[0].point.x, planeIntersects[0].point.z)
                }
              }

              if (targetCoords) {
                const { x, y } = targetCoords
                setSelectedModel(draggedModelRef.current)

                if (selectedCategory === 'tiles') {
                  let t = selectedTerrain
                  if (selectedFolder === 'roads') t = TERRAIN_TYPES.ROAD
                  else if (selectedFolder === 'coast') t = TERRAIN_TYPES.WATER

                  // Validate coordinates before proceeding
                  if (!Number.isFinite(x) || !Number.isFinite(y)) {
                    console.error('Invalid coordinates from drop:', x, y)
                    return
                  }

                  // Find next available level starting from current global level
                  let targetLevel = currentHeightLevel
                  while (targetLevel <= 4 && mapRef.current.hasHex(x, y, targetLevel)) {
                    targetLevel++
                  }

                  // Only place if we found a free level
                  if (targetLevel <= 4) {
                    const h = new Hex(x, y, t)
                    h.modelData = draggedModelRef.current
                    h.height = targetLevel
                    mapRef.current.setHex(x, y, h)
                    await updateHexMesh(x, y, targetLevel)
                  }
                } else {
                  // For buildings, same logic
                  let targetLevel = currentHeightLevel
                  while (targetLevel <= 4 && mapRef.current.hasHex(x, y, targetLevel)) {
                    targetLevel++
                  }

                  if (targetLevel <= 4) {
                    const h = new Hex(x, y, TERRAIN_TYPES.PLAINS)
                    h.modelData = draggedModelRef.current
                    h.height = targetLevel
                    mapRef.current.setHex(x, y, h)
                    await updateHexMesh(x, y, targetLevel)
                  }
                }
              }
              draggedModelRef.current = null
            }}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseDown={(e) => {
              if (e.button === 0) {
                if (e.altKey || e.shiftKey) isDraggingRef.current = true
              } else if (e.button === 2) {
                isRotatingRef.current = true
              } else if (e.button === 1) {
                isPanningRef.current = true
              }
            }}
            onMouseUp={() => {
              isDraggingRef.current = false
              isRotatingRef.current = false
              isPanningRef.current = false
            }}
            onMouseLeave={() => {
              isDraggingRef.current = false
              isRotatingRef.current = false
              isPanningRef.current = false
            }}
            onWheel={handleWheel}
            onContextMenu={e => e.preventDefault()}
          />
        </div>
      </main>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
      `}</style>
    </div>
  )
}
