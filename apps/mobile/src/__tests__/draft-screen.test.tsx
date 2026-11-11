import { Share } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import DraftScreen from '../../app/(app)/(drawer)/draft';

const draft = {
  preparedAt: 'Wednesday, 11 November 2026 at 2:32:09 pm',
  reference: 'C11BECD32B44',
  will: {
    title: 'DRAFT LAST WILL AND TESTAMENT OF NGOZI EZE',
    banner: 'DRAFT FOR LAWYER REVIEW. This is not a valid will.',
    sections: [
      {
        heading: 'Revocation',
        paragraphs: ['I revoke all earlier wills and codicils made by me.'],
      },
      {
        heading: 'Gifts of particular assets',
        paragraphs: [],
        subsections: [
          { heading: '3-bedroom flat, Surulere', paragraphs: ['I give the flat to Ada.'] },
        ],
      },
    ],
  },
  notes: {
    title: 'NOTES FOR THE REVIEWING LAWYER: DRAFT WILL OF NGOZI EZE',
    banner: 'NOT PART OF THE WILL.',
    sections: [{ heading: 'How this draft was made', paragraphs: ['State: Lagos only (Q1).'] }],
  },
};

jest.mock('../features/inventory/api', () => ({
  useDraftWill: () => ({ isPending: false, isError: false, data: draft }),
}));

describe('DraftScreen', () => {
  it('shows the will first: its warning, clear numbered headings and each asset under its own heading', async () => {
    await render(<DraftScreen />);
    expect(screen.getByText(draft.will.banner)).toBeTruthy();
    expect(screen.getByText(draft.will.title)).toBeTruthy();
    expect(screen.getByText('1. Revocation')).toBeTruthy();
    expect(screen.getByText('2.1 3-bedroom flat, Surulere')).toBeTruthy();
    expect(screen.getByText('I give the flat to Ada.')).toBeTruthy();
    expect(screen.getByText(/Reference C11BECD32B44/)).toBeTruthy();
    expect(screen.queryByText('State: Lagos only (Q1).')).toBeNull();
  });

  it('keeps the lawyer notes as a separate document', async () => {
    await render(<DraftScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Notes for the lawyer' }));
    expect(screen.getByText(draft.notes.title)).toBeTruthy();
    expect(screen.getByText('State: Lagos only (Q1).')).toBeTruthy();
    expect(screen.queryByText('1. Revocation')).toBeNull();
  });

  it('shares only the document on show, as text', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await render(<DraftScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Share draft will' }));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('I revoke all earlier wills') })
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Notes for the lawyer' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Share notes' }));
    const last = share.mock.calls[share.mock.calls.length - 1]?.[0] as { message: string };
    expect(last.message).toContain('State: Lagos only (Q1).');
    expect(last.message).not.toContain('I revoke all earlier wills');
  });
});
