import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DraftWillPage } from '../draft-will';

const downloadDraft = vi.fn().mockResolvedValue(undefined);
const openDraftPdf = vi.fn().mockResolvedValue(undefined);
const useDraftPdf = vi.fn((document: string) => ({
  isPending: false,
  isError: false,
  data: new ArrayBuffer(document === 'will' ? 8 : 4),
}));

vi.mock('../../features/api', () => ({
  useDraftWill: () => ({
    data: {
      testatorName: 'Ngozi Eze',
      reference: 'C11BECD32B44',
      preparedAt: 'Wednesday, 11 November 2026 at 2:32:09 pm',
    },
  }),
  useDraftPdf: (document: string) => useDraftPdf(document),
  downloadDraft: (...args: unknown[]) => downloadDraft(...args),
  openDraftPdf: (...args: unknown[]) => openDraftPdf(...args),
}));

vi.mock('../../components/pdf-viewer', () => ({
  PdfViewer: ({ data, label }: { data: ArrayBuffer; label: string }) => (
    <div data-testid="pdf">{`${label}: ${data.byteLength} bytes`}</div>
  ),
}));

describe('DraftWillPage', () => {
  it('shows the will as a PDF, with the reference every page carries', () => {
    render(<DraftWillPage />);
    expect(screen.getByTestId('pdf')).toHaveTextContent('Draft will: 8 bytes');
    expect(screen.getByText(/Reference C11BECD32B44/)).toBeInTheDocument();
  });

  it('switches to the lawyer notes, a separate document', async () => {
    render(<DraftWillPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Notes for the lawyer' }));
    expect(screen.getByTestId('pdf')).toHaveTextContent('Notes for the lawyer: 4 bytes');
  });

  it('downloads the PDF or the Word file of the document on show', async () => {
    render(<DraftWillPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Notes for the lawyer' }));
    await userEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    await userEvent.click(screen.getByRole('button', { name: 'Download Word' }));
    expect(downloadDraft).toHaveBeenNthCalledWith(1, 'notes', 'pdf', 'Ngozi Eze');
    expect(downloadDraft).toHaveBeenNthCalledWith(2, 'notes', 'docx', 'Ngozi Eze');
  });

  it('opens the PDF to print', async () => {
    render(<DraftWillPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Open to print' }));
    expect(openDraftPdf).toHaveBeenCalledWith('will');
  });
});
