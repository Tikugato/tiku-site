import { ExtrudeGeometry, Shape } from 'three'
import { BAR_POINTS, BAR_WIDTH, MARK_CENTER_X, STEM, STEM_WIDTH } from './markShape'
import type { MarkPoint } from './strokePath'

export const EXTRUDE_DEPTH = 1.2
export const MARK_SCALE = 0.1

const CENTER_Y = 72
const STEM_LEFT = MARK_CENTER_X - STEM_WIDTH / 2
const STEM_RIGHT = MARK_CENTER_X + STEM_WIDTH / 2

export function toWorldPoint(x: number, y: number): MarkPoint {
  return { x: (x - MARK_CENTER_X) * MARK_SCALE, y: (CENTER_Y - y) * MARK_SCALE }
}

function segmentNormal(a: MarkPoint, b: MarkPoint): MarkPoint {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = Math.hypot(dx, dy)
  return { x: -dy / length, y: dx / length }
}

function miterPoint(prev: MarkPoint, point: MarkPoint, next: MarkPoint, half: number): MarkPoint {
  const n1 = segmentNormal(prev, point)
  const n2 = segmentNormal(point, next)
  const mx = n1.x + n2.x
  const my = n1.y + n2.y
  const length = Math.hypot(mx, my)
  const reach = half / ((mx / length) * n1.x + (my / length) * n1.y)
  return { x: point.x + (mx / length) * reach, y: point.y + (my / length) * reach }
}

function capPoint(point: MarkPoint, neighbor: MarkPoint, half: number, fromNeighbor: boolean): MarkPoint {
  const n = fromNeighbor ? segmentNormal(neighbor, point) : segmentNormal(point, neighbor)
  return { x: point.x + n.x * half, y: point.y + n.y * half }
}

function offsetSide(points: MarkPoint[], half: number): MarkPoint[] {
  return points.map((point, i) => {
    const prev = points[i - 1]
    const next = points[i + 1]
    if (prev && next) return miterPoint(prev, point, next, half)
    if (next) return capPoint(point, next, half, false)
    if (prev) return capPoint(point, prev, half, true)
    return point
  })
}

function shapeFromOutline(outline: MarkPoint[]): Shape {
  const shape = new Shape()
  outline.forEach((p, i) => {
    const w = toWorldPoint(p.x, p.y)
    if (i === 0) shape.moveTo(w.x, w.y)
    else shape.lineTo(w.x, w.y)
  })
  shape.closePath()
  return shape
}

function extrude(shape: Shape): ExtrudeGeometry {
  const geometry = new ExtrudeGeometry(shape, {
    depth: EXTRUDE_DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.05,
    bevelSegments: 2,
  })
  geometry.translate(0, 0, -EXTRUDE_DEPTH / 2)
  return geometry
}

export function barGeometry(): ExtrudeGeometry {
  const half = BAR_WIDTH / 2
  const left = offsetSide(BAR_POINTS, half)
  const right = offsetSide(BAR_POINTS, -half)
  return extrude(shapeFromOutline([...left, ...right.reverse()]))
}

export function stemGeometry(): ExtrudeGeometry {
  return extrude(
    shapeFromOutline([
      { x: STEM_LEFT, y: STEM.top },
      { x: STEM_RIGHT, y: STEM.top },
      { x: STEM_RIGHT, y: STEM.bottom },
      { x: STEM_LEFT, y: STEM.bottom },
    ]),
  )
}
