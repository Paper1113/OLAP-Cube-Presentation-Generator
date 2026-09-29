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
}: CubeRendererProps) => (
  <div
    className={`cube-renderer ${compact ? "cube-renderer--compact" : ""} ${className}`}
    dangerouslySetInnerHTML={{
      __html: createCubeSvgMarkup(view, {
        id: svgId,
        appearance,
        includeTitle: !compact,
        geometry: compact ? { cellWidth: 76, cellHeight: 52, fontSize: 11 } : undefined,
      }),
    }}
  />
);
