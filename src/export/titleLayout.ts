import { measureCubeTextWidth } from '../engine/cubeGeometry';

/** Two explicit lines in the same 10.9-inch box at 16pt in preview and PPTX.
 * Conservative CJK-width fallback also works without browser font metrics. */
export const layoutDatasetTitle = (title: string): string => {
  const maxWidth = 10.9 * 72;
  const lines = [''];
  for (const char of Array.from(title.replace(/\s+/g, ' ').trim())) {
    const current = lines.length - 1;
    if (measureCubeTextWidth(lines[current] + char, {fontFamily:'Arial Unicode MS',fontSize:16}) > maxWidth) {
      if (lines.length === 2) {
        while (measureCubeTextWidth(lines[1] + '…', {fontFamily:'Arial Unicode MS',fontSize:16}) > maxWidth) lines[1] = Array.from(lines[1]).slice(0,-1).join('');
        lines[1] += '…';
        break;
      }
      // Prefer a word boundary for Latin text, while CJK can wrap per character.
      const boundary = lines[current].lastIndexOf(' ');
      if (/[A-Za-z0-9]/.test(char) && boundary > lines[current].length / 2) {
        const carry = lines[current].slice(boundary + 1);
        lines[current] = lines[current].slice(0, boundary + 1);
        lines.push(carry + char);
      } else lines.push(char);
    } else lines[current] += char;
  }
  return lines.join('\n');
};
