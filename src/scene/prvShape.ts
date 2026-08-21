import { polyline } from './strokePath'

export const LETTER_WIDTH = 9
export const DIAGONAL_WIDTH = 8
export const BASELINE = 98

const CAP_TOP = 54
const BOWL_BOTTOM = 76
const HALF = LETTER_WIDTH / 2

export const CAP_TOP_EDGE = CAP_TOP - HALF

export const SPINE = { x: 49, top: CAP_TOP, bottom: BASELINE }
export const P_STEM_X = 13
export const PART_SHIFT = 56

const P_BOWL_RIGHT = 33
const R_BOWL_RIGHT = 69
const R_LEG_RIGHT = 72
const R_LEG_BOTTOM = 103
const V_LEFT = 82
const V_RIGHT = 117
const V_TOP = 44
const V_APEX_Y = BASELINE + 1
const V_APEX_LEFT = 98
const V_APEX_MID = 99.5
const APEX_OVERLAP = 0.75
const V_APEX_RIGHT = 101

function stem(x: number): string {
  return polyline([
    { x, y: CAP_TOP },
    { x, y: BASELINE },
  ])
}

function bowl(stemX: number, right: number): string {
  return polyline([
    { x: stemX - HALF, y: CAP_TOP },
    { x: right, y: CAP_TOP },
    { x: right, y: BOWL_BOTTOM },
    { x: stemX, y: BOWL_BOTTOM },
  ])
}

function vLeg(apexOuter: number, top: number): string {
  const inset = apexOuter > V_APEX_MID ? -APEX_OVERLAP : APEX_OVERLAP
  return polyline([
    { x: V_APEX_MID + inset, y: V_APEX_Y },
    { x: apexOuter, y: V_APEX_Y },
    { x: top, y: V_TOP },
  ])
}

export const P_STEM_PATH = stem(P_STEM_X)
export const P_BOWL_PATH = bowl(P_STEM_X, P_BOWL_RIGHT)
export const R_BOWL_PATH = bowl(SPINE.x, R_BOWL_RIGHT)

export const R_LEG_PATH = polyline([
  { x: SPINE.x, y: BOWL_BOTTOM },
  { x: R_LEG_RIGHT, y: R_LEG_BOTTOM },
])

export const V_LEFT_PATH = vLeg(V_APEX_LEFT, V_LEFT)
export const V_RIGHT_PATH = vLeg(V_APEX_RIGHT, V_RIGHT)
