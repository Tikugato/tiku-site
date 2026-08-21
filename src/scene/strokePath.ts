export interface MarkPoint {
  x: number
  y: number
}

export function polyline(points: MarkPoint[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')
}
