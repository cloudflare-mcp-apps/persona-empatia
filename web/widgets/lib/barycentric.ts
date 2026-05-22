/**
 * Barycentric math for the 3F triangle.
 *
 * Triangle vertices (in SVG coords, top-left origin):
 *   - V0 (Fuck)    = top
 *   - V1 (Food)    = bottom-left
 *   - V2 (Friends) = bottom-right
 *
 * Pure functions, no React deps.
 */

import type { Triangle3F } from "../../lib/types";

export interface Point { x: number; y: number }

export interface TriangleGeometry {
  fuck: Point;
  food: Point;
  friends: Point;
}

/**
 * Cartesian point → barycentric weights normalized to sum 100.
 * Weights are clamped to the triangle interior (non-negative).
 */
export function cartesianToTriangle3F(p: Point, g: TriangleGeometry): Triangle3F {
  const w = barycentricWeights(p, g.fuck, g.food, g.friends);
  // Clamp to non-negative (point may be outside triangle)
  const safe = {
    fuck: Math.max(0, w[0]),
    food: Math.max(0, w[1]),
    friends: Math.max(0, w[2]),
  };
  const sum = safe.fuck + safe.food + safe.friends;
  if (sum <= 0) return { fuck: 33, food: 33, friends: 34 };
  return scaleAndRound({
    fuck: (safe.fuck / sum) * 100,
    food: (safe.food / sum) * 100,
    friends: (safe.friends / sum) * 100,
  });
}

/** Barycentric weights → cartesian point (interior of triangle). */
export function triangle3FToCartesian(w: Triangle3F, g: TriangleGeometry): Point {
  const sum = w.fuck + w.food + w.friends;
  if (sum <= 0) {
    return centroid(g);
  }
  const a = w.fuck / sum;
  const b = w.food / sum;
  const c = w.friends / sum;
  return {
    x: a * g.fuck.x + b * g.food.x + c * g.friends.x,
    y: a * g.fuck.y + b * g.food.y + c * g.friends.y,
  };
}

function barycentricWeights(p: Point, a: Point, b: Point, c: Point): [number, number, number] {
  // Standard barycentric formula via signed-area ratios.
  const detT = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  if (detT === 0) return [1 / 3, 1 / 3, 1 / 3];
  const wA = ((b.y - c.y) * (p.x - c.x) + (c.x - b.x) * (p.y - c.y)) / detT;
  const wB = ((c.y - a.y) * (p.x - c.x) + (a.x - c.x) * (p.y - c.y)) / detT;
  const wC = 1 - wA - wB;
  return [wA, wB, wC];
}

function centroid(g: TriangleGeometry): Point {
  return {
    x: (g.fuck.x + g.food.x + g.friends.x) / 3,
    y: (g.fuck.y + g.food.y + g.friends.y) / 3,
  };
}

/** Round to integers, fix rounding remainder by adjusting the largest. */
function scaleAndRound(w: Triangle3F): Triangle3F {
  const rounded = {
    fuck: Math.round(w.fuck),
    food: Math.round(w.food),
    friends: Math.round(w.friends),
  };
  const total = rounded.fuck + rounded.food + rounded.friends;
  const diff = 100 - total;
  if (diff !== 0) {
    const largest = (Object.keys(rounded) as Array<keyof Triangle3F>).reduce((a, b) =>
      rounded[a] >= rounded[b] ? a : b,
    );
    rounded[largest] += diff;
  }
  return rounded;
}

/** Build standard equilateral-triangle geometry inside given bounds. */
export function buildTriangle(width: number, height: number, padding = 10): TriangleGeometry {
  const cx = width / 2;
  return {
    fuck: { x: cx, y: padding },
    food: { x: padding, y: height - padding },
    friends: { x: width - padding, y: height - padding },
  };
}
