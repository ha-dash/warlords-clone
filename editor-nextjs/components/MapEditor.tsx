import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  MapTrifold,
  FloppyDisk,
  FolderOpen,
  Trash,
  CaretLeft,
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
  const mapRef = useRef<GameMap | null>(null)
  const hexMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const buildingObjectsRef = useRef<Map<string, THREE.Group>>(new Map())
  const selectionMeshRef = useRef<THREE.Mesh | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const draggedModelRef = useRef<{ obj: string; mtl: string; name: string } | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [loadingText, setLoadingText] = useState('Инициализация редактора...')
  const [mapWidth, setMapWidth] = useState(10)
  const [mapHeight, setMapHeight] = useState(5)
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType>(TERRAIN_TYPES.PLAINS)
  const [editMode, setEditMode] = useState<EditMode>('terrain')
  const [selectedHex, setSelectedHex] = useState<{ x: number; y: number } | null>(null)
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

  const createHexagonalGrid = (width: number, height: number): THREE.LineSegments => {
    const scale = 3.5
    const r = 1.0
    const R = 2 / Math.sqrt(3)
    const points: THREE.Vector3[] = []

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        const [cX, cZ] = hexToWorld(x, y, width, height)
        const hexPoints: THREE.Vector3[] = []

        for (let i = 0; i < 6; i++) {
          const angle = (i * 60) * (Math.PI / 180)
          const px = cX + R * scale * Math.cos(angle)
          const pz = cZ + R * scale * Math.sin(angle)
          // Grid exactly at Z=0 (Three.js Y=0)
          hexPoints.push(new THREE.Vector3(px, 0, pz))
        }

        for (let i = 0; i < 6; i++) {
          points.push(hexPoints[i])
          points.push(hexPoints[(i + 1) % 6])
        }
      }
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({
      color: 0x444444,
      transparent: true,
      opacity: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: 1, // Push it slightly "back"
      polygonOffsetUnits: 1
    })
    const segments = new THREE.LineSegments(geometry, material)
    segments.renderOrder = -1 // Render before other objects
    return segments
  }

  const _worldToHex = (worldX: number, worldZ: number): { x: number; y: number } | null => {
    if (!mapRef.current) return null
    const scale = 3.5
    const r = 1.0
    const R = 2 / Math.sqrt(3)

    const spacingX = 1.5 * R * scale
    const spacingZ = 2.0 * r * scale

    // Invert Flat Topped Offset-X coordinates
    const x = Math.round(worldX / spacingX + mapRef.current.width / 2)
    const y = Math.round((worldZ - (x % 2) * (spacingZ / 2)) / spacingZ + mapRef.current.height / 2)

    if (mapRef.current.isValidCoordinate(x, y)) {
      return { x, y }
    }
    return null
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
      const model = selectedModel || availableModels[0]
      if (model && availableModels.length > 0) {
        const key = `terrain_${hex.terrain}_${model.name}_${hex.x}_${hex.y}`

        // Try to get from cache synchronously first
        let loadedModel = modelLoader.getCachedModel(key)

        // If not in cache, wait for it
        if (!loadedModel) {
          loadedModel = await modelLoader.loadModel(key, model.obj, model.mtl)
        }

        if (loadedModel) {
          const clone = loadedModel.clone()
          clone.position.set(worldX, 0, worldZ)
          // Base rotation for flat topped + custom rotation from hex state
          clone.rotation.y = Math.PI / 2 + (hex.rotation || 0)
          clone.scale.set(3.5, 3.5, 3.5)

          // Ensure bottom is at Z=0 (Three.js Y=0)
          const box = new THREE.Box3().setFromObject(clone)
          const minY = box.min.y
          // Adjust position so that box.min.y is 0
          clone.position.y -= minY

          clone.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true
              child.receiveShadow = true
            }
          })
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
        map.setHex(x, y, new Hex(x, y, terrain))
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

    const promises = mapRef.current.hexes
      .filter(hex => hex)
      .map(async (hex) => {
        const mesh = await createHexMesh(hex!)
        if (mesh && sceneRef.current) {
          sceneRef.current.add(mesh)
          hexMeshesRef.current.set(`${hex!.x},${hex!.y}`, mesh as any)
        }
      })

    await Promise.all(promises)
  }

  const updateHexMesh = async (x: number, y: number) => {
    if (!mapRef.current || !sceneRef.current) return
    const hexKey = `${x},${y}`
    const hex = mapRef.current.getHex(x, y)
    const oldMesh = hexMeshesRef.current.get(hexKey)

    // Мгновенное удаление старого меша
    if (oldMesh) {
      sceneRef.current.remove(oldMesh)
      hexMeshesRef.current.delete(hexKey)
    }

    if (hex) {
      // Попытка синхронного получения меша для мгновенного отображения
      const model = selectedModel || availableModels[0]
      const key = `terrain_${hex.terrain}_${model.name}_${hex.x}_${hex.y}`
      const cached = modelLoader.getCachedModel(key)

      if (cached) {
        const [wX, wZ] = hexToWorld(x, y)
        const clone = cached.clone()
        clone.position.set(wX, 0, wZ)
        clone.rotation.y = Math.PI / 2 + (hex.rotation || 0)
        clone.scale.set(3.5, 3.5, 3.5)

        // Ensure bottom is at Z=0 (Three.js Y=0) if not already
        const box = new THREE.Box3().setFromObject(clone)
        const minY = box.min.y
        if (Math.abs(minY) > 0.001) {
          clone.position.y -= minY
        }

        sceneRef.current.add(clone)
        hexMeshesRef.current.set(hexKey, clone as any)
      } else {
        // Если нет в кэше, загружаем асинхронно
        const mesh = await createHexMesh(hex)
        if (mesh && sceneRef.current) {
          sceneRef.current.add(mesh)
          hexMeshesRef.current.set(hexKey, mesh as any)
        }
      }
    }
  }

  const removeHex = async (x: number, y: number) => {
    if (!sceneRef.current || !mapRef.current) return
    const hexKey = `${x},${y}`
    const obj = hexMeshesRef.current.get(hexKey)
    if (obj) {
      sceneRef.current.remove(obj)
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
      hexMeshesRef.current.delete(hexKey)
    }
    mapRef.current.removeHex(x, y)
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

      // Add a hexagonal grid helper instead of rectangular
      const hexGrid = createHexagonalGrid(mapWidth, mapHeight)
      hexGrid.name = '__hexGrid'
      scene.add(hexGrid)

      const aspect = (window.innerWidth - 400) / (window.innerHeight - 150)
      const camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 10000)
      cameraRef.current = camera
      const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true })
      renderer.setSize(window.innerWidth - 400, window.innerHeight - 150)
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
    const handleKeyDown = (e: KeyboardEvent) => {
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

      // Q/E Rotating selected hex
      if (selectedHex && mapRef.current) {
        const hex = mapRef.current.getHex(selectedHex.x, selectedHex.y)
        if (hex) {
          if (e.code === 'KeyQ') {
            hex.rotation = (hex.rotation || 0) - Math.PI / 3
            updateHexMesh(selectedHex.x, selectedHex.y)
          }
          if (e.code === 'KeyE') {
            hex.rotation = (hex.rotation || 0) + Math.PI / 3
            updateHexMesh(selectedHex.x, selectedHex.y)
          }
        }
      }

      // Delete key deletes selected hex
      if (e.code === 'Delete' && selectedHex) {
        removeHex(selectedHex.x, selectedHex.y)
        setSelectedHex(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedHex])

  // Selection Highlight
  useEffect(() => {
    if (!sceneRef.current) return

    if (!selectionMeshRef.current) {
      const geom = new THREE.RingGeometry(3.6, 3.8, 6)
      geom.rotateX(-Math.PI / 2)
      geom.rotateY(Math.PI / 2) // Orient for flat topped
      const mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
      const mesh = new THREE.Mesh(geom, mat)
      mesh.name = '__selectionHighlight'
      sceneRef.current.add(mesh)
      selectionMeshRef.current = mesh
    }

    if (selectedHex) {
      const [wX, wZ] = hexToWorld(selectedHex.x, selectedHex.y)
      // Highlight at Z=0.01 (Three.js Y=0.01) to be slightly above the tile bottom surface
      selectionMeshRef.current.position.set(wX, 0.01, wZ)
      selectionMeshRef.current.visible = true
    } else {
      selectionMeshRef.current.visible = false
    }
  }, [selectedHex])

  useEffect(() => {
    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        const aspect = (window.innerWidth - 400) / (window.innerHeight - 150)
        cameraRef.current.aspect = aspect
        cameraRef.current.updateProjectionMatrix()
        rendererRef.current.setSize(window.innerWidth - 400, window.innerHeight - 150)
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

    // Raycast against hexes first
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
        const [x, y] = hexKey.split(',').map(Number)
        setSelectedHex({ x, y })
        if (event.button === 2 || event.ctrlKey) {
          removeHex(x, y)
        }
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
        setSelectedHex({ x, y })
      }
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
                    <p className="text-[9px] font-bold text-center mt-1 truncate px-1 py-0.5">{m.name}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>
        <div className="p-4 border-t border-border flex gap-2">
          <Button variant="outline" className="flex-1">Open</Button>
          <Button className="flex-1">Save</Button>
        </div>
      </aside>

      <main className="flex-1 relative flex flex-col overflow-hidden">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 p-1 bg-card/80 backdrop-blur-xl border border-border/50 rounded-full flex items-center gap-3 px-4 py-2 shadow-2xl">
          <Compass size={18} className="text-primary animate-pulse" />
          <span className="text-xs font-bold tracking-tight">3D PERSPECTIVE</span>
          <Separator orientation="vertical" className="h-4 bg-border" />
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => { cameraDistanceRef.current = 150; cameraAngleXRef.current = Math.PI / 4; cameraAngleYRef.current = Math.PI / 4; }}>
            <ArrowsInLineHorizontal size={16} />
          </Button>
        </div>

        <div className="flex-1 bg-[#0a0a0a] relative">
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
                  const [x, y] = hexKey.split(',').map(Number)
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
                  mapRef.current.setTerrain(x, y, t)
                  await updateHexMesh(x, y)
                } else {
                  await placeBuilding(x, y, draggedModelRef.current)
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
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between pointer-events-none">
            <div className="pointer-events-auto">
              {selectedHex ? (
                <Card className="w-64 bg-card/80 backdrop-blur-xl border-primary/20 p-4 shadow-2xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-primary italic">HEX: {selectedHex.x}, {selectedHex.y}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 h-8 text-[11px]" onClick={() => updateHexMesh(selectedHex.x, selectedHex.y)}>Apply</Button>
                    <Button size="sm" variant="destructive" className="h-8 w-8" onClick={() => removeHex(selectedHex.x, selectedHex.y)}><Trash size={14} /></Button>
                  </div>
                </Card>
              ) : (
                <Badge variant="outline" className="bg-card/40 backdrop-blur-md px-3 py-1 font-bold text-[10px] tracking-widest uppercase">No Selection</Badge>
              )}
            </div>
            <div className="flex flex-col gap-1 items-end opacity-50">
              <span className="text-[10px] font-bold uppercase tracking-tighter">Grid: {mapWidth}x{mapHeight}</span>
              <span className="text-[9px] uppercase tracking-tighter">WASD/Drag to Rotate · Right Click to Remove</span>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
      `}</style>
    </div>
  )
}
