import type { CSSProperties } from "react";
import {
  cubeDrawingStyles,
  cubePalettes,
  randomCubeAppearance,
  resolveCubeVisualTheme,
  type CubeAppearance,
} from "../../theme/cubeAppearance";

interface CubeAppearancePanelProps {
  appearance: CubeAppearance;
  onChange: (appearance: CubeAppearance) => void;
}

/** Presentation-facing visual choices that apply consistently to every cube and export. */
export const CubeAppearancePanel = ({ appearance, onChange }: CubeAppearancePanelProps) => {
  const theme = resolveCubeVisualTheme(appearance);

  return (
    <section className="editor-section cube-appearance" aria-labelledby="cube-appearance-heading">
      <div className="cube-appearance__heading">
        <div>
          <h2 id="cube-appearance-heading">Cube Appearance</h2>
          <p className="hint">Applied to the live cube, SVG/PNG downloads, presentation preview, and PowerPoint export.</p>
        </div>
        <span className="cube-appearance__badge">{theme.palette.label} · {cubeDrawingStyles.find((style) => style.id === appearance.styleId)?.label}</span>
      </div>

      <button
        type="button"
        className="secondary-button"
        onClick={() => onChange(randomCubeAppearance(appearance))}
      >
        🎲 Random Appearance
      </button>

      <fieldset className="cube-appearance__fieldset">
        <legend>Colour palette</legend>
        <div className="cube-palette-grid">
          {cubePalettes.map((palette) => (
            <button
              key={palette.id}
              type="button"
              className="cube-palette-option"
              aria-pressed={appearance.paletteId === palette.id}
              title={palette.label}
              onClick={() => onChange({ ...appearance, paletteId: palette.id })}
              style={{ "--cube-swatch": palette.primary } as CSSProperties}
            >
              <span className="cube-palette-option__swatch" aria-hidden="true" />
              <span>{palette.label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="cube-appearance__fieldset">
        <legend>Drawing style</legend>
        <div className="cube-style-grid">
          {cubeDrawingStyles.map((style) => (
            <button
              key={style.id}
              type="button"
              className="cube-style-option"
              aria-pressed={appearance.styleId === style.id}
              onClick={() => onChange({ ...appearance, styleId: style.id })}
            >
              <strong>{style.label}</strong>
              <span>{style.description}</span>
            </button>
          ))}
        </div>
      </fieldset>
    </section>
  );
};
