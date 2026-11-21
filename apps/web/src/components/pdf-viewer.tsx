import { useEffect, useRef, useState } from 'react';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

/** Every page of a PDF, one under the other, drawn with pdf.js so the page looks the same everywhere. */
export const PdfViewer = ({ data, label }: { data: ArrayBuffer; label: string }) => {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const target = container.current;
    if (!target) return;
    let cancelled = false;
    // pdf.js hands the bytes to its worker, which empties the buffer: give it a copy.
    const loading = getDocument({ data: data.slice(0) });

    const draw = async () => {
      const pdf = await loading.promise;
      const width = target.clientWidth || 600;
      const outputScale = window.devicePixelRatio || 1;
      for (let number = 1; number <= pdf.numPages; number += 1) {
        const page = await pdf.getPage(number);
        if (cancelled) return;
        // Scale each page to the width of the column.
        const scale = width / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        canvas.className = 'bg-white shadow-md';
        canvas.setAttribute('role', 'img');
        canvas.setAttribute('aria-label', `${label}, page ${number} of ${pdf.numPages}`);
        target.appendChild(canvas);
        const canvasContext = canvas.getContext('2d');
        if (!canvasContext) continue;
        await page.render({
          canvasContext,
          viewport,
          transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
        }).promise;
      }
    };
    draw().catch(() => {
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
      target.replaceChildren();
      void loading.destroy();
    };
  }, [data, label]);

  if (failed) {
    return <p role="alert">Couldn't show this document. Download it instead.</p>;
  }
  return <div ref={container} className="flex flex-col items-center gap-4" />;
};
