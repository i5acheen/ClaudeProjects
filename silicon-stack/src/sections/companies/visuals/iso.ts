/** Tiny isometric helpers for drawing 3D slabs in SVG. */
export interface Slab {
  x: number // centre, model units
  y: number
  w: number // size along x
  d: number // size along y
  h: number // height
  z: number // base height
}

const COS = Math.cos(Math.PI / 6)
const SIN = 0.5

export function project(x: number, y: number, z: number, cx: number, cy: number): [number, number] {
  return [cx + (x - y) * COS, cy + (x + y) * SIN - z]
}

/** Returns polygon point strings for the top, front-left (+y) and front-right (+x) faces. */
export function slabFaces(s: Slab, cx: number, cy: number) {
  const x0 = s.x - s.w / 2
  const x1 = s.x + s.w / 2
  const y0 = s.y - s.d / 2
  const y1 = s.y + s.d / 2
  const zt = s.z + s.h
  const P = (x: number, y: number, z: number) => project(x, y, z, cx, cy).join(',')
  return {
    top: [P(x0, y0, zt), P(x1, y0, zt), P(x1, y1, zt), P(x0, y1, zt)].join(' '),
    left: [P(x0, y1, zt), P(x1, y1, zt), P(x1, y1, s.z), P(x0, y1, s.z)].join(' '),
    right: [P(x1, y0, zt), P(x1, y1, zt), P(x1, y1, s.z), P(x1, y0, s.z)].join(' '),
  }
}
