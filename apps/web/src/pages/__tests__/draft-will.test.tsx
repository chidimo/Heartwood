import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DraftWillPage } from '../draft-will';

const draft = {
  title: 'DRAFT LAST WILL AND TESTAMENT OF NGOZI EZE',
  banner: 'DRAFT FOR LAWYER REVIEW. This is not a valid will.',
  will: [
    { heading: 'Revocation', paragraphs: ['I revoke all earlier wills and codicils made by me.'] },
  ],
  notes: [{ heading: 'How this draft was made', paragraphs: ['State: Lagos only (Q1).'] }],
};

const downloadDraftWord = vi.fn().mockResolvedValue(undefined);

vi.mock('../../features/api', () => ({
  useDraftWill: () => ({ isPending: false, isError: false, data: draft }),
  downloadDraftWord: () => downloadDraftWord(),
}));

describe('DraftWillPage', () => {
  it('shows the warning, the numbered clauses and the notes for the lawyer', () => {
    render(<DraftWillPage />);
    expect(screen.getByText(draft.banner)).toBeInTheDocument();
    expect(screen.getByText(draft.title)).toBeInTheDocument();
    expect(screen.getByText('1. Revocation')).toBeInTheDocument();
    expect(screen.getByText('State: Lagos only (Q1).')).toBeInTheDocument();
  });

  it('downloads the Word version', async () => {
    render(<DraftWillPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Download Word document' }));
    expect(downloadDraftWord).toHaveBeenCalled();
  });
});
