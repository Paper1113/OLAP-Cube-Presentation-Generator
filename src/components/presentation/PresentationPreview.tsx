import { useEffect, useMemo, useState } from "react";
import {
  buildPresentationSlides,
  type PresentationInput,
} from "../../export/pptxExport";
import { SlidePreview } from "./SlidePreview";

export interface PresentationPreviewProps extends PresentationInput {
  /** One-based index, matching the slide number shown to users. */
  initialSlide?: number;
  className?: string;
  onClose?: () => void;
  onSlideChange?: (slideNumber: number) => void;
}

/** Six-slide, in-browser preview for the current dataset and operation settings. */
export const PresentationPreview = ({
  dataset,
  axisMapping,
  activeLevels,
  operations,
  initialSlide = 1,
  className = "",
  onClose,
  onSlideChange,
}: PresentationPreviewProps) => {
  const slides = useMemo(
    () => buildPresentationSlides({ dataset, axisMapping, activeLevels, operations }),
    [dataset, axisMapping, activeLevels, operations],
  );
  const firstIndex = Math.max(0, Math.min(slides.length - 1, initialSlide - 1));
  const [slideIndex, setSlideIndex] = useState(firstIndex);

  useEffect(() => {
    setSlideIndex((current) => Math.min(current, Math.max(0, slides.length - 1)));
  }, [slides.length]);

  useEffect(() => {
    onSlideChange?.(slideIndex + 1);
  }, [onSlideChange, slideIndex]);

  const slide = slides[slideIndex];
  if (!slide) return null;

  return (
    <section className={`presentation-preview ${className}`.trim()} aria-label="Presentation preview">
      <div className="presentation-preview__header">
        <h1>Presentation Preview</h1>
        {onClose && <button type="button" onClick={onClose}>Back to editor</button>}
      </div>
      <SlidePreview slide={slide} totalSlides={slides.length} />
      <nav className="presentation-preview__navigation" aria-label="Presentation slides">
        <button
          type="button"
          onClick={() => setSlideIndex((current) => Math.max(0, current - 1))}
          disabled={slideIndex === 0}
        >
          Previous
        </button>
        <span aria-live="polite">Slide {slideIndex + 1} of {slides.length}</span>
        <button
          type="button"
          onClick={() => setSlideIndex((current) => Math.min(slides.length - 1, current + 1))}
          disabled={slideIndex === slides.length - 1}
        >
          Next
        </button>
      </nav>
    </section>
  );
};
