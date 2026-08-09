import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'

const TILT = Math.PI / 6
const BEAMS = [
  { color: '#2492e0', offsetY: 4.4, targetX: 1, delay: 0 },
  { color: '#e5352f', offsetY: 0.6, targetX: 6, delay: 0.15 },
  { color: '#31c93d', offsetY: -3.2, targetX: 1.5, delay: 0.3 },
]
const LENGTH = 60
const THICKNESS = 3.1
const CELL_PX = 64
const COLS = 40
const ROWS = 2
const FRUSTUM_HEIGHT = 12
const BLEED = 1.3
const REDRAW_INTERVAL = 0.08
const HOVER_DIM = 0.72

interface MosaicCell {
  brightness: number
  target: number
  wait: number
}

function randomTint(): number {
  return 0.86 + Math.random() * 0.26
}

class Mosaic {
  readonly texture: CanvasTexture
  private readonly ctx: CanvasRenderingContext2D
  private readonly cells: MosaicCell[]
  private readonly rgb: [number, number, number]
  private pending = 0
  private hovered: number | null = null

  constructor(colorHex: string) {
    const canvas = document.createElement('canvas')
    canvas.width = COLS * CELL_PX
    canvas.height = ROWS * CELL_PX
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('mosaic canvas context unavailable')
    this.ctx = ctx
    const value = parseInt(colorHex.slice(1), 16)
    this.rgb = [(value >> 16) & 255, (value >> 8) & 255, value & 255]
    this.cells = Array.from({ length: COLS * ROWS }, () => ({
      brightness: randomTint(),
      target: randomTint(),
      wait: Math.random() * 4,
    }))
    this.drawAll()
    this.texture = new CanvasTexture(canvas)
    this.texture.colorSpace = SRGBColorSpace
  }

  private drawCell(index: number): void {
    const cell = this.cells[index]
    if (!cell) return
    const [r, g, b] = this.rgb
    const f = cell.brightness * (index === this.hovered ? HOVER_DIM : 1)
    this.ctx.fillStyle = `rgb(${Math.min(r * f, 255) | 0} ${Math.min(g * f, 255) | 0} ${Math.min(b * f, 255) | 0})`
    this.ctx.fillRect((index % COLS) * CELL_PX, Math.floor(index / COLS) * CELL_PX, CELL_PX, CELL_PX)
  }

  setHovered(index: number | null): boolean {
    if (index === this.hovered) return false
    const previous = this.hovered
    this.hovered = index
    if (previous !== null) this.drawCell(previous)
    if (index !== null) this.drawCell(index)
    this.texture.needsUpdate = true
    return true
  }

  private drawAll(): void {
    for (let i = 0; i < this.cells.length; i++) this.drawCell(i)
  }

  step(dt: number): boolean {
    this.pending += dt
    if (this.pending < REDRAW_INTERVAL) return false
    const elapsed = this.pending
    this.pending = 0
    let changed = false
    this.cells.forEach((cell, i) => {
      cell.wait -= elapsed
      if (cell.wait <= 0) {
        cell.target = randomTint()
        cell.wait = 1.5 + Math.random() * 3.5
      }
      const next = cell.brightness + (cell.target - cell.brightness) * Math.min(elapsed * 1.4, 1)
      if (Math.abs(next - cell.brightness) > 0.0005) {
        cell.brightness = next
        this.drawCell(i)
        changed = true
      }
    })
    if (changed) this.texture.needsUpdate = true
    return changed
  }

  dispose(): void {
    this.texture.dispose()
  }
}

export class AccStripesScene {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new OrthographicCamera()
  private readonly geometry = new PlaneGeometry(LENGTH, THICKNESS)
  private readonly mosaics: Mosaic[]
  private readonly materials: MeshBasicMaterial[]
  private readonly beams: Mesh[]
  private progress = 0
  private offscreenX = -60
  private dirty = true
  private lastTime = 0
  private frame = 0
  private running = false

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    this.renderer.setClearColor('#000000', 0)
    this.camera.position.set(0, (FRUSTUM_HEIGHT * BLEED) / 2, 10)
    this.mosaics = BEAMS.map((beam) => new Mosaic(beam.color))
    this.materials = this.mosaics.map((mosaic) => new MeshBasicMaterial({ map: mosaic.texture }))
    this.beams = BEAMS.map((beam, i) => {
      const mesh = new Mesh(this.geometry, this.materials[i])
      mesh.position.set(this.offscreenX, beam.offsetY, 0)
      mesh.rotation.z = TILT
      return mesh
    })
    this.scene.add(...this.beams)
  }

  resize(width: number, height: number): void {
    const total = FRUSTUM_HEIGHT * (1 + BLEED)
    const aspect = width / height
    this.camera.left = (-total * aspect) / 2
    this.camera.right = (total * aspect) / 2
    this.camera.top = total / 2
    this.camera.bottom = -total / 2
    this.camera.updateProjectionMatrix()
    this.offscreenX = (this.camera.left - 4) / Math.cos(TILT) - LENGTH / 2
    this.renderer.setSize(width, height, false)
  }

  pointerAt(px: number, py: number, width: number, height: number): void {
    if (this.progress <= 0) return
    const worldX = this.camera.position.x + this.camera.left + (px / width) * (this.camera.right - this.camera.left)
    const worldY = this.camera.position.y + this.camera.top - (py / height) * (this.camera.top - this.camera.bottom)
    const hits: (number | null)[] = this.beams.map(() => null)
    for (let i = 0; i < this.beams.length; i++) {
      const mesh = this.beams[i]
      if (!mesh) continue
      const dx = worldX - mesh.position.x
      const dy = worldY - mesh.position.y
      const lx = dx * Math.cos(TILT) + dy * Math.sin(TILT)
      const ly = -dx * Math.sin(TILT) + dy * Math.cos(TILT)
      if (Math.abs(lx) > LENGTH / 2 || Math.abs(ly) > THICKNESS / 2) continue
      const col = Math.min(Math.floor(((lx + LENGTH / 2) / LENGTH) * COLS), COLS - 1)
      hits[i] = (ly > 0 ? 0 : 1) * COLS + col
      break
    }
    this.applyHover(hits)
  }

  clearPointer(): void {
    this.applyHover(this.beams.map(() => null))
  }

  private applyHover(hits: (number | null)[]): void {
    let changed = false
    this.mosaics.forEach((mosaic, i) => {
      changed = mosaic.setHovered(hits[i] ?? null) || changed
    })
    if (changed) this.dirty = true
  }

  setProgress(value: number): void {
    const clamped = Math.min(Math.max(value, 0), 1)
    if (clamped === this.progress) return
    this.progress = clamped
    this.dirty = true
  }

  setRunning(run: boolean): void {
    if (run === this.running) return
    this.running = run
    if (run) {
      this.lastTime = performance.now()
      this.frame = requestAnimationFrame(this.tick)
    } else {
      cancelAnimationFrame(this.frame)
    }
  }

  dispose(): void {
    this.setRunning(false)
    this.geometry.dispose()
    this.materials.forEach((material) => material.dispose())
    this.mosaics.forEach((mosaic) => mosaic.dispose())
    this.renderer.dispose()
  }

  private tick = (time: number): void => {
    if (!this.running) return
    this.frame = requestAnimationFrame(this.tick)
    const dt = Math.min((time - this.lastTime) / 1000, 1 / 30)
    this.lastTime = time
    let changed = this.dirty
    this.mosaics.forEach((mosaic) => {
      changed = mosaic.step(dt) || changed
    })
    if (!changed) return
    this.dirty = false
    this.updateBeams()
    this.renderer.render(this.scene, this.camera)
  }

  private updateBeams(): void {
    this.beams.forEach((mesh, i) => {
      const beam = BEAMS[i]
      if (!beam) return
      const p = Math.min(Math.max((this.progress - beam.delay) / 0.7, 0), 1)
      const along = this.offscreenX + (beam.targetX - this.offscreenX) * p
      mesh.position.set(
        along * Math.cos(TILT) - beam.offsetY * Math.sin(TILT) - 3,
        along * Math.sin(TILT) + beam.offsetY * Math.cos(TILT) + 1.5,
        0,
      )
    })
  }
}
