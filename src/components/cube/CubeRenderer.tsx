import type { CubeViewModel } from "../../models/cube";
import { createCubeSvgMarkup } from "./CubeSvg";

interface CubeRendererProps {
  view: CubeViewModel;
  svgId?: string;
  className?: string;
  compact?: boolean;
}

export const CubeRenderer = ({ view, svgId, className = "", compact = false }: CubeRendererProps) => (
  <div
    className={`cube-renderer ${compact ? "cube-renderer--compact" : ""} ${className}`}
    dangerouslySetInnerHTML={{
      __html: createCubeSvgMarkup(view, {
        id: svgId,
        includeTitle: !compact,
        geometry: compact ? { cellWidth: 76, cellHeight: 52, fontSize: 11 } : undefined,
      }),
    }}
  />
);
