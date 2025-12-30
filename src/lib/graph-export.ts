import { Effect } from "effect";
import { ExportError } from "./errors";

// Helper to inline computed styles into SVG elements
function inlineStyles(element: Element, clone: Element): void {
  const computedStyle = window.getComputedStyle(element);

  if (clone instanceof SVGElement || clone instanceof HTMLElement) {
    // Copy important style properties
    const stylesToCopy = [
      "fill",
      "stroke",
      "stroke-width",
      "stroke-opacity",
      "fill-opacity",
      "opacity",
      "font-family",
      "font-size",
      "font-weight",
      "text-anchor",
      "dominant-baseline",
      "visibility",
      "display",
    ];

    for (const prop of stylesToCopy) {
      const value = computedStyle.getPropertyValue(prop);
      if (value) {
        (clone as SVGElement | HTMLElement).style.setProperty(prop, value);
      }
    }
  }

  // Recursively process children
  const children = element.children;
  const cloneChildren = clone.children;
  for (let i = 0; i < children.length; i++) {
    if (cloneChildren[i]) {
      inlineStyles(children[i], cloneChildren[i]);
    }
  }
}

// Clone SVG and inline all styles
function prepareSvgForExport(svgElement: SVGSVGElement): SVGSVGElement {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  // Set explicit dimensions
  clone.setAttribute("width", String(svgElement.clientWidth));
  clone.setAttribute("height", String(svgElement.clientHeight));

  // Inline all computed styles
  inlineStyles(svgElement, clone);

  return clone;
}

// Effect-based SVG to PNG conversion
export const svgToPng = (svgElement: SVGSVGElement) =>
  Effect.async<Blob, ExportError>((resume) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resume(
        Effect.fail(
          new ExportError({ message: "Failed to get canvas context" }),
        ),
      );
      return;
    }

    // Prepare SVG with inlined styles
    const preparedSvg = prepareSvgForExport(svgElement);
    const svgData = new XMLSerializer().serializeToString(preparedSvg);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      // 2x resolution for retina displays
      canvas.width = svgElement.clientWidth * 2;
      canvas.height = svgElement.clientHeight * 2;
      ctx.scale(2, 2);

      // Draw background (use unscaled dimensions since we already scaled the context)
      ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
      ctx.fillRect(0, 0, svgElement.clientWidth, svgElement.clientHeight);

      // Draw SVG
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) {
          resume(Effect.succeed(blob));
        } else {
          resume(
            Effect.fail(new ExportError({ message: "Failed to create blob" })),
          );
        }
      }, "image/png");
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resume(Effect.fail(new ExportError({ message: "Failed to load SVG" })));
    };

    img.src = url;
  });

// Effect-based clipboard utility
export const copyToClipboard = (text: string) =>
  Effect.tryPromise({
    try: () => navigator.clipboard.writeText(text),
    catch: (error) =>
      new ExportError({ message: "Failed to copy to clipboard", cause: error }),
  });

// Legacy Promise-based API for backwards compatibility
export async function svgToPngLegacy(
  svgElement: SVGSVGElement,
): Promise<Blob | null> {
  return Effect.runPromise(
    svgToPng(svgElement).pipe(
      Effect.map((blob) => blob as Blob | null),
      Effect.catchAll(() => Effect.succeed(null)),
    ),
  );
}
