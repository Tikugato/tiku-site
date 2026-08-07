import {
  AmbientLight,
  Clock,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three'
import { Cloth } from './cloth'
import { EXTRUDE_DEPTH, MARK_SCALE, barGeometry, stemGeometry, toWorldPoint } from './markGeometry'
import { BANDANA, MARK_CENTER_X } from './markShape'

const LIGHTING = {
  dark: { ambient: 0.55, key: 1.6 },
  light: { ambient: 0.85, key: 1.1 },
}
const FLAT_AMBIENT = 1.1
const SCARF_FLOOR = EXTRUDE_DEPTH / 2 + 0.02

function cssColor(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function easeInOutCubic(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1)
  return clamped < 0.5 ? 4 * clamped ** 3 : 1 - (-2 * clamped + 2) ** 3 / 2
}

export class MarkScene {
  onMorphSettled: ((target: number) => void) | null = null

  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(38, 1, 0.1, 60)
  private readonly group = new Group()
  private readonly ribbonMaterial = new MeshStandardMaterial({ roughness: 0.85, metalness: 0 })
  private readonly scarfMaterial = new MeshStandardMaterial({
    roughness: 0.7,
    metalness: 0,
    side: DoubleSide,
  })
  private readonly ambient = new AmbientLight('#ffffff', FLAT_AMBIENT)
  private readonly key = new DirectionalLight('#ffffff', 0)
  private readonly rim = new DirectionalLight('#ffffff', 0)
  private readonly barMesh: Mesh
  private readonly stemMesh: Mesh
  private readonly cloth: Cloth
  private readonly clock = new Clock()
  private readonly tilt = { x: 0, y: 0, targetX: 0, targetY: 0, velX: 0, velY: 0 }
  private lighting = LIGHTING.dark
  private morph = 0
  private morphFrom = 0
  private morphTo = 0
  private morphT = 1
  private settled = true
  private gust = 0
  private windSway = 0
  private elapsed = 0
  private frame = 0
  private running = false

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    const frameCenterY = toWorldPoint(64, 64).y
    const distance = 6.4 / Math.tan(((this.camera.fov / 2) * Math.PI) / 180)
    this.camera.position.set(0, frameCenterY, distance)
    this.camera.lookAt(0, frameCenterY, 0)
    this.key.position.set(6, 9, 10)
    this.rim.position.set(-7, -3, -9)
    this.scene.add(this.ambient, this.key, this.rim, this.group)
    this.stemMesh = new Mesh(stemGeometry(), this.ribbonMaterial)
    this.barMesh = new Mesh(barGeometry(), this.ribbonMaterial)
    this.cloth = this.buildCloth()
    this.group.add(this.stemMesh, this.barMesh, new Mesh(this.cloth.geometry, this.scarfMaterial))
    this.setTheme(true)
  }

  private buildCloth(): Cloth {
    return new Cloth({
      cols: 13,
      rows: 10,
      topY: toWorldPoint(MARK_CENTER_X, BANDANA.top).y,
      topZ: SCARF_FLOOR + 0.05,
      halfTop: BANDANA.halfWidth * MARK_SCALE,
      halfBottom: 0.04,
      height: (BANDANA.tip - BANDANA.top) * MARK_SCALE,
      zFloor: SCARF_FLOOR,
    })
  }

  setTheme(dark: boolean): void {
    this.lighting = dark ? LIGHTING.dark : LIGHTING.light
    this.renderer.setClearColor(cssColor('--ground'))
    this.ribbonMaterial.color.set(cssColor('--figure'))
    this.scarfMaterial.color.set(cssColor('--accent'))
  }

  setMorphTarget(target: number): void {
    this.morphFrom = this.morph
    this.morphTo = target
    this.morphT = 0
    this.settled = false
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height, false)
  }

  pointerMove(nx: number, ny: number, speed: number): void {
    this.tilt.targetY = nx * 0.16
    this.tilt.targetX = -ny * 0.1
    this.gust = Math.min(this.gust + speed * 9, 14)
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.clock.start()
    this.frame = requestAnimationFrame(this.tick)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.frame)
  }

  dispose(): void {
    this.stop()
    this.barMesh.geometry.dispose()
    this.stemMesh.geometry.dispose()
    this.cloth.geometry.dispose()
    this.ribbonMaterial.dispose()
    this.scarfMaterial.dispose()
    this.renderer.dispose()
  }

  private tick = (): void => {
    if (!this.running) return
    this.frame = requestAnimationFrame(this.tick)
    const dt = Math.min(this.clock.getDelta(), 1 / 30)
    this.elapsed += dt
    this.updateMorph(dt)
    this.applyMorph()
    this.updateTilt(dt)
    this.updateCloth(dt)
    this.renderer.render(this.scene, this.camera)
  }

  private updateMorph(dt: number): void {
    if (this.settled) return
    this.morphT = Math.min(this.morphT + dt / 0.95, 1)
    this.morph = this.morphFrom + (this.morphTo - this.morphFrom) * easeInOutCubic(this.morphT)
    if (this.morphT >= 1) {
      this.morph = this.morphTo
      this.settled = true
      this.onMorphSettled?.(this.morphTo)
    }
  }

  private applyMorph(): void {
    const depth = Math.max(this.morph, 0.004)
    this.stemMesh.scale.z = depth
    this.barMesh.scale.z = depth
    this.key.intensity = this.lighting.key * this.morph
    this.rim.intensity = 0.35 * this.morph
    this.ambient.intensity = FLAT_AMBIENT + (this.lighting.ambient - FLAT_AMBIENT) * this.morph
  }

  private updateTilt(dt: number): void {
    const spring = (value: number, target: number, velocity: number): [number, number] => {
      const next = velocity + (target - value) * 14 * dt - velocity * 7 * dt
      return [value + next * dt * 14, next]
    }
    ;[this.tilt.x, this.tilt.velX] = spring(this.tilt.x, this.tilt.targetX * this.morph, this.tilt.velX)
    ;[this.tilt.y, this.tilt.velY] = spring(this.tilt.y, this.tilt.targetY * this.morph, this.tilt.velY)
    const swing = Math.sin(this.morph * Math.PI) * 0.22
    this.group.rotation.set(this.tilt.x, this.tilt.y + swing, 0)
    this.group.scale.setScalar(1 + Math.sin(this.elapsed * 1.1) * 0.006 * this.morph)
  }

  private updateCloth(dt: number): void {
    this.windSway += dt
    this.gust *= Math.exp(-dt * 2.8)
    const wind = {
      x: (Math.sin(this.windSway * 0.9) * 0.5 + this.tilt.targetY * 2) * this.morph,
      z: (1.4 + Math.sin(this.windSway * 0.7) * 0.7) * this.morph + this.gust * this.morph,
    }
    this.cloth.step(dt, wind, this.morph)
  }
}
