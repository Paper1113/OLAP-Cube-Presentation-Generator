import { useMemo } from "react";
import type { CubeViewModel } from "../../models/cube";
import type { CubeAppearance } from "../../theme/cubeAppearance";
import { createCubeSvgMarkup } from "./CubeSvg";

interface CubeRendererProps {
  view: CubeViewModel;
  appearance?: CubeAppearance;
  svgId?: string;
  className?: string;
  compact?: boolean;
}

export const CubeRenderer = ({
  view,
  appearance,
  svgId,
  className = "",
  compact = false,
}: CubeRendererProps) => {
  const markup = useMemo(() => createCubeSvgMarkup(view, {
    id: svgId, appearance, includeTitle: !compact,
    geometry: compact ? { cellWidth: 76, cellHeight: 52, fontSize: 11 } : undefined,
  }), [view, appearance, svgId, compact]);
  return (
  <div
    className={`cube-renderer ${compact ? "cube-renderer--compact" : ""} ${className}`}
    dangerouslySetInnerHTML={{
      __html: markup,
    }}
  />
);
};
