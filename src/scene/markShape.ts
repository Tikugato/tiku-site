export interface MarkPoint {
  x: number
  y: number
}

export const MARK_CENTER_X = 64
export const BAR_WIDTH = 10
export const STEM_WIDTH = 15
export const STEM = { top: 44, bottom: 114 }
export const BANDANA = { top: 45, tip: 60, halfWidth: STEM_WIDTH / 2 }

const BAR_Y = 40
const EAR_PEAK_Y = 30
const BAR_TIP_Y = 46
const JOIN_OVERLAP = 0.5

export const BAR_TOP_EDGE = BAR_Y - BAR_WIDTH / 2

export const BAR_POINTS: MarkPoint[] = [
  { x: 10, y: BAR_TIP_Y },
  { x: 22, y: EAR_PEAK_Y },
  { x: 32, y: BAR_Y },
  { x: 96, y: BAR_Y },
  { x: 106, y: EAR_PEAK_Y },
  { x: 118, y: BAR_TIP_Y },
]

function polyline(points: MarkPoint[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')
}

export const BAR_LEFT_PATH = polyline([
  ...BAR_POINTS.slice(0, 3),
  { x: MARK_CENTER_X + JOIN_OVERLAP, y: BAR_Y },
])

export const BAR_RIGHT_PATH = polyline([
  ...BAR_POINTS.slice(3).reverse(),
  { x: MARK_CENTER_X - JOIN_OVERLAP, y: BAR_Y },
])

export const STEM_PATH = `M${MARK_CENTER_X} ${STEM.top} L${MARK_CENTER_X} ${STEM.bottom}`

export const BANDANA_PATH =
  `M${MARK_CENTER_X - BANDANA.halfWidth} ${BANDANA.top} ` +
  `L${MARK_CENTER_X + BANDANA.halfWidth} ${BANDANA.top} ` +
  `L${MARK_CENTER_X} ${BANDANA.tip} Z`
