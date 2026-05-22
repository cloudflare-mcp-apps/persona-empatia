import { useRef, useCallback } from "react";
import type { Triangle3F as Triangle3FType } from "../../lib/types";
import {
  buildTriangle,
  cartesianToTriangle3F,
  triangle3FToCartesian,
} from "../lib/barycentric";

interface Props {
  value: Triangle3FType;
  onChange: (next: Triangle3FType) => void;
}

/**
 * SVG equilateral triangle with a draggable dot. Vertices:
 *   - Fuck (top)
 *   - Food (bottom-left)
 *   - Friends (bottom-right)
 *
 * Drag the dot inside the triangle — barycentric coords become {fuck, food, friends}
 * weights summing to 100.
 */
export function Triangle3F({ value, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 110;
  const height = 110;
  const geom = buildTriangle(width, height, 12);
  const dotPos = triangle3FToCartesian(value, geom);

  const handlePointer = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // Map screen coords to SVG viewBox coords (width/height match viewBox here).
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const py = ((e.clientY - rect.top) / rect.height) * height;
    onChange(cartesianToTriangle3F({ x: px, y: py }, geom));
  }, [geom, onChange]);

  const trianglePath = `M ${geom.fuck.x},${geom.fuck.y} L ${geom.food.x},${geom.food.y} L ${geom.friends.x},${geom.friends.y} Z`;

  return (
    <div className="flex flex-col items-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Trójkąt 3F</div>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="touch-none cursor-crosshair"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); handlePointer(e); }}
        onPointerMove={(e) => { if (e.buttons !== 0) handlePointer(e); }}
        onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
      >
        <path d={trianglePath} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth={1} />
        {/* Vertex labels */}
        <text x={geom.fuck.x} y={geom.fuck.y - 2} fontSize={9} textAnchor="middle" fill="hsl(var(--foreground))">Fuck</text>
        <text x={geom.food.x - 2} y={geom.food.y + 9} fontSize={9} textAnchor="end" fill="hsl(var(--foreground))">Food</text>
        <text x={geom.friends.x + 2} y={geom.friends.y + 9} fontSize={9} textAnchor="start" fill="hsl(var(--foreground))">Friends</text>
        {/* Active dot */}
        <circle cx={dotPos.x} cy={dotPos.y} r={5} fill="hsl(var(--primary))" stroke="hsl(var(--primary-foreground))" strokeWidth={1.5} />
      </svg>
      <div className="text-[10px] text-center text-muted-foreground mt-1 leading-tight">
        F:{value.fuck} · Fo:{value.food} · Fr:{value.friends}
      </div>
    </div>
  );
}
