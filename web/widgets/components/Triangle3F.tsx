import { useRef, useCallback } from "react";
import type { Triangle3F as Triangle3FType } from "../../lib/types";
import { Badge } from "@/components/ui/badge";
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
  const width = 220;
  const height = 200;
  const geom = buildTriangle(width, height, 28);
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

  const trianglePath = `M ${geom.fuck.x},${geom.fuck.y} L ${geom.food.x},${geom.food.y} L ${geom.friends.x},${geom.friends.y} Z`;

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="touch-none cursor-crosshair"
        role="img"
        aria-label={`Trójkąt 3F: Fuck ${value.fuck}, Food ${value.food}, Friends ${value.friends}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          handlePointer(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons !== 0) handlePointer(e);
        }}
        onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
      >
        <path
          d={trianglePath}
          fill="hsl(var(--muted))"
          stroke="hsl(var(--border))"
          strokeWidth={1.5}
        />
        <text
          x={geom.fuck.x}
          y={geom.fuck.y - 8}
          fontSize={13}
          fontWeight={600}
          textAnchor="middle"
          fill="hsl(var(--foreground))"
        >
          Fuck
        </text>
        <text
          x={geom.food.x - 4}
          y={geom.food.y + 16}
          fontSize={13}
          fontWeight={600}
          textAnchor="end"
          fill="hsl(var(--foreground))"
        >
          Food
        </text>
        <text
          x={geom.friends.x + 4}
          y={geom.friends.y + 16}
          fontSize={13}
          fontWeight={600}
          textAnchor="start"
          fill="hsl(var(--foreground))"
        >
          Friends
        </text>
        <circle
          cx={dotPos.x}
          cy={dotPos.y}
          r={7}
          fill="hsl(var(--primary))"
          stroke="hsl(var(--primary-foreground))"
          strokeWidth={2}
        />
      </svg>

      <div className="flex gap-1.5 flex-wrap justify-center">
        <Badge variant="outline" className="font-mono tabular-nums">Fuck {value.fuck}</Badge>
        <Badge variant="outline" className="font-mono tabular-nums">Food {value.food}</Badge>
        <Badge variant="outline" className="font-mono tabular-nums">Friends {value.friends}</Badge>
      </div>
    </div>
  );
}
