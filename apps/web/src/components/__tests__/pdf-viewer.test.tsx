import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PdfViewer } from '../pdf-viewer';

const destroy = vi.fn().mockResolvedValue(undefined);
const render2d = vi.fn(() => ({ promise: Promise.resolve() }));

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'worker.js' }));
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {},
  getDocument: () => ({
    destroy,
    promise: Promise.resolve({
      numPages: 3,
      getPage: async () => ({
        getViewport: ({ scale }: { scale: number }) => ({
          width: 100 * scale,
          height: 140 * scale,
        }),
        render: render2d,
      }),
    }),
  }),
}));

describe('PdfViewer', () => {
  it('draws every page of the document, one canvas each', async () => {
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({})) as never;
    const { unmount } = render(<PdfViewer data={new ArrayBuffer(8)} label="Draft will" />);
    await waitFor(() => expect(screen.getAllByRole('img')).toHaveLength(3));
    expect(screen.getByLabelText('Draft will, page 2 of 3')).toBeInTheDocument();
    expect(render2d).toHaveBeenCalledTimes(3);
    unmount();
    expect(destroy).toHaveBeenCalled();
  });
});
