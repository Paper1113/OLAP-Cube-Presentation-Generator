import { CubeRenderer } from "../cube/CubeRenderer";
import type { PresentationSlideModel } from "../../export/presentationModel";
import type { CubeAppearance } from "../../theme/cubeAppearance";

export interface SlidePreviewProps {
  slide: PresentationSlideModel;
  totalSlides: number;
  appearance: CubeAppearance;
}

/**
 * Browser approximation of one exported slide. It intentionally consumes the
 * same CubeViewModel as the PPTX exporter, keeping slide previews and exports
 * aligned without trying to emulate PowerPoint XML in the browser.
 */
export const SlidePreview = ({ slide, totalSlides, appearance }: SlidePreviewProps) => {
  if (slide.kind === "title") {
    return (
      <article className="slide-preview slide-preview--title" aria-label={`Slide ${slide.number} of ${totalSlides}: ${slide.title}`}>
        <p className="slide-preview__number">Slide {slide.number} / {totalSlides}</p>
        <div className="slide-preview__title-content">
          <h2>{slide.title}</h2>
          {slide.subtitle && <p className="slide-preview__subtitle">{slide.subtitle}</p>}
          {slide.details.map((detail) => <p className="slide-preview__credit" key={detail}>{detail}</p>)}
        </div>
      </article>
    );
  }

  return (
    <article className="slide-preview" aria-label={`Slide ${slide.number} of ${totalSlides}: ${slide.title}`}>
      <p className="slide-preview__number">Slide {slide.number} / {totalSlides}</p>
      <h2>{slide.title}</h2>
      <div className="slide-preview__content">
        <div className="slide-preview__diagram">
          {slide.view ? (
            <CubeRenderer
              view={slide.view}
              appearance={appearance}
              svgId={`presentation-slide-${slide.number}-cube`}
              compact
            />
          ) : (
            <p className="slide-preview__unavailable">Diagram unavailable</p>
          )}
        </div>
        <aside className="slide-preview__notes" aria-label="Slide explanation">
          {slide.details.length > 0 && (
            <ul>
              {slide.details.map((detail) => <li key={detail}>{detail}</li>)}
            </ul>
          )}
          {slide.description && <p>{slide.description}</p>}
          {slide.errors.length > 0 && (
            <div className="slide-preview__errors" role="alert">
              {slide.errors.map((error) => <p key={error}>{error}</p>)}
            </div>
          )}
        </aside>
      </div>
    </article>
  );
};
