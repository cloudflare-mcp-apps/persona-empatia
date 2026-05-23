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

export function Triangle3F({ value, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 240;
  const height = 220;
  const geom = buildTriangle(width, height, 36);
  const dotPos = triangle3FToCartesian(value, geom);

  const handlePointer = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * width;
      const py = ((e.clientY - rect.top) / rect.height) * height;
      onChange(cartesianToTriangle3F({ x: px, y: py }, geom));
    },
    [geom, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<SVGSVGElement>) => {
      const STEP = 5;
      let next: Triangle3FType | null = null;
      if (e.key === "ArrowUp") {
        next = { fuck: Math.min(100, value.fuck + STEP), food: value.food, friends: value.friends };
      } else if (e.key === "ArrowDown") {
        next = { fuck: Math.max(0, value.fuck - STEP), food: value.food, friends: value.friends };
      } else if (e.key === "ArrowLeft") {
        next = { fuck: value.fuck, food: Math.min(100, value.food + STEP), friends: value.friends };
      } else if (e.key === "ArrowRight") {
        next = { fuck: value.fuck, food: value.food, friends: Math.min(100, value.friends + STEP) };
      }
      if (next) {
        e.preventDefault();
        const sum = next.fuck + next.food + next.friends;
        if (sum > 0) {
          onChange({
            fuck: Math.round((next.fuck / sum) * 100),
            food: Math.round((next.food / sum) * 100),
            friends: Math.round((next.friends / sum) * 100),
          });
        }
      }
    },
    [value, onChange],
  );

  const trianglePath = `M ${geom.fuck.x},${geom.fuck.y} L ${geom.food.x},${geom.food.y} L ${geom.friends.x},${geom.friends.y} Z`;

  return (
    <div className="flex flex-col items-center gap-1 w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="touch-none cursor-crosshair w-full max-w-[260px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
        role="img"
        tabIndex={0}
        aria-label={`Trójkąt 3F: Fuck ${value.fuck}, Food ${value.food}, Friends ${value.friends}. Strzałki nawigują.`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          handlePointer(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons !== 0) handlePointer(e);
        }}
        onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
        onKeyDown={handleKeyDown}
      >
        <path
          d={trianglePath}
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth={1.5}
        />
        <text
          x={geom.fuck.x}
          y={geom.fuck.y - 12}
          fontSize={13}
          fontWeight={600}
          textAnchor="middle"
          fill="hsl(var(--foreground))"
        >
          Fuck {value.fuck}
        </text>
        <text
          x={geom.food.x}
          y={geom.food.y + 18}
          fontSize={13}
          fontWeight={600}
          textAnchor="middle"
          fill="hsl(var(--foreground))"
        >
          Food {value.food}
        </text>
        <text
          x={geom.friends.x}
          y={geom.friends.y + 18}
          fontSize={13}
          fontWeight={600}
          textAnchor="middle"
          fill="hsl(var(--foreground))"
        >
          Friends {value.friends}
        </text>
        <circle
          cx={dotPos.x}
          cy={dotPos.y}
          r={8}
          fill="hsl(var(--primary))"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth={2}
        />
      </svg>
    </div>
  );
}
