import { Share } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import DraftScreen from '../../app/(app)/(drawer)/draft';

const draft = {
  title: 'DRAFT LAST WILL AND TESTAMENT OF NGOZI EZE',
  banner: 'DRAFT FOR LAWYER REVIEW. This is not a valid will.',
  will: [
    { heading: 'Revocation', paragraphs: ['I revoke all earlier wills and codicils made by me.'] },
  ],
  notes: [{ heading: 'How this draft was made', paragraphs: ['State: Lagos only (Q1).'] }],
};

jest.mock('../features/inventory/api', () => ({
  useDraftWill: () => ({ isPending: false, isError: false, data: draft }),
}));

describe('DraftScreen', () => {
  it('shows the warning, the clauses and the lawyer notes', async () => {
    await render(<DraftScreen />);
    expect(screen.getByText(draft.banner)).toBeTruthy();
    expect(screen.getByText(draft.title)).toBeTruthy();
    expect(screen.getByText('1. Revocation')).toBeTruthy();
    expect(screen.getByText('State: Lagos only (Q1).')).toBeTruthy();
  });

  it('shares the whole draft as text', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await render(<DraftScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Share draft' }));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('I revoke all earlier wills') })
    );
  });
});
