import { BufferAttribute, BufferGeometry } from 'three'

export interface ClothParams {
  cols: number
  rows: number
  topY: number
  topZ: number
  halfTop: number
  halfBottom: number
  height: number
  zFloor: number
}

export interface Wind {
  x: number
  z: number
}

interface Constraint {
  a: number
  b: number
  length: number
}

const ITERATIONS = 4
const DAMPING = 0.985
const GRAVITY = -16

export class Cloth {
  readonly geometry = new BufferGeometry()
  private readonly params: ClothParams
  private readonly current: Float32Array
  private readonly previous: Float32Array
  private readonly constraints: Constraint[] = []

  constructor(params: ClothParams) {
    this.params = params
    const count = params.cols * params.rows
    this.current = new Float32Array(count * 3)
    this.previous = new Float32Array(count * 3)
    this.seedPositions()
    this.buildConstraints()
    this.buildGeometry()
  }

  private index(row: number, col: number): number {
    return row * this.params.cols + col
  }

  private seedPositions(): void {
    const { cols, rows, topY, topZ, halfTop, halfBottom, height } = this.params
    for (let row = 0; row < rows; row++) {
      const t = row / (rows - 1)
      const half = halfTop + (halfBottom - halfTop) * t
      for (let col = 0; col < cols; col++) {
        const u = (col / (cols - 1)) * 2 - 1
        const i = this.index(row, col) * 3
        this.current[i] = u * half
        this.current[i + 1] = topY - t * height
        this.current[i + 2] = topZ + t * 0.02
      }
    }
    this.previous.set(this.current)
  }

  private at(i: number): number {
    return this.current[i] ?? 0
  }

  private addConstraint(a: number, b: number): void {
    const ai = a * 3
    const bi = b * 3
    const length = Math.hypot(
      this.at(ai) - this.at(bi),
      this.at(ai + 1) - this.at(bi + 1),
      this.at(ai + 2) - this.at(bi + 2),
    )
    this.constraints.push({ a, b, length })
  }

  private buildConstraints(): void {
    const { cols, rows } = this.params
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (col < cols - 1) this.addConstraint(this.index(row, col), this.index(row, col + 1))
        if (row < rows - 1) this.addConstraint(this.index(row, col), this.index(row + 1, col))
        if (col < cols - 1 && row < rows - 1) {
          this.addConstraint(this.index(row, col), this.index(row + 1, col + 1))
          this.addConstraint(this.index(row, col + 1), this.index(row + 1, col))
        }
      }
    }
  }

  private buildGeometry(): void {
    const { cols, rows } = this.params
    const indices: number[] = []
    for (let row = 0; row < rows - 1; row++) {
      for (let col = 0; col < cols - 1; col++) {
        const a = this.index(row, col)
        const b = this.index(row, col + 1)
        const c = this.index(row + 1, col)
        const d = this.index(row + 1, col + 1)
        indices.push(a, c, b, b, c, d)
      }
    }
    this.geometry.setIndex(indices)
    this.geometry.setAttribute('position', new BufferAttribute(this.current, 3))
    this.geometry.computeVertexNormals()
  }

  private moveAxis(i: number, force: number): void {
    const value = this.at(i)
    const velocity = (value - (this.previous[i] ?? 0)) * DAMPING
    this.previous[i] = value
    this.current[i] = value + velocity + force
  }

  private integrate(dt: number, wind: Wind, gravityScale: number): void {
    const { cols, rows } = this.params
    const dt2 = dt * dt
    for (let row = 1; row < rows; row++) {
      const reach = row / (rows - 1)
      for (let col = 0; col < cols; col++) {
        const i = this.index(row, col) * 3
        this.moveAxis(i, wind.x * reach * dt2)
        this.moveAxis(i + 1, GRAVITY * gravityScale * dt2)
        this.moveAxis(i + 2, wind.z * reach * dt2)
      }
    }
  }

  private nudge(i: number, dx: number, dy: number, dz: number): void {
    this.current[i] = this.at(i) + dx
    this.current[i + 1] = this.at(i + 1) + dy
    this.current[i + 2] = this.at(i + 2) + dz
  }

  private satisfy(): void {
    for (const { a, b, length } of this.constraints) {
      const ai = a * 3
      const bi = b * 3
      const dx = this.at(bi) - this.at(ai)
      const dy = this.at(bi + 1) - this.at(ai + 1)
      const dz = this.at(bi + 2) - this.at(ai + 2)
      const distance = Math.hypot(dx, dy, dz) || length
      const push = ((distance - length) / distance) * 0.5
      const pinnedA = a < this.params.cols
      const pinnedB = b < this.params.cols
      if (!pinnedA) {
        const weight = push * (pinnedB ? 2 : 1)
        this.nudge(ai, dx * weight, dy * weight, dz * weight)
      }
      if (!pinnedB) {
        const weight = push * (pinnedA ? 2 : 1)
        this.nudge(bi, -dx * weight, -dy * weight, -dz * weight)
      }
    }
  }

  private collide(): void {
    const { cols, rows, zFloor } = this.params
    for (let point = cols; point < cols * rows; point++) {
      const zi = point * 3 + 2
      if (this.at(zi) < zFloor) this.current[zi] = zFloor
    }
  }

  step(dt: number, wind: Wind, gravityScale: number): void {
    this.integrate(dt, wind, gravityScale)
    for (let i = 0; i < ITERATIONS; i++) this.satisfy()
    this.collide()
    this.geometry.getAttribute('position').needsUpdate = true
    this.geometry.computeVertexNormals()
  }
}
