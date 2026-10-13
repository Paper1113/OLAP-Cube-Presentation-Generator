import "@testing-library/jest-dom/vitest";

// Presentation slides call canvas APIs that jsdom does not implement.
HTMLCanvasElement.prototype.getContext = () => null;
