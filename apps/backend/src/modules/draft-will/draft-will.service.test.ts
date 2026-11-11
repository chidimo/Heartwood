import type { DraftWill } from '@heartwood/shared';
import { referenceFor } from './draft-will.service';

const draft = (preparedAt: string, clause = 'I revoke all earlier wills.'): DraftWill => ({
  preparedAt,
  reference: null,
  will: {
    title: 'DRAFT LAST WILL',
    banner: `Prepared on ${preparedAt}.`,
    sections: [{ heading: 'Revocation', paragraphs: [clause] }],
  },
  notes: {
    title: 'NOTES',
    banner: `Prepared on ${preparedAt}.`,
    sections: [{ heading: 'Points', paragraphs: ['None.'] }],
  },
});

describe('referenceFor', () => {
  it('is 12 capital hex characters', () => {
    expect(referenceFor(draft('Wednesday, 11 November 2026 at 2:32:09 pm'))).toMatch(
      /^[0-9A-F]{12}$/
    );
  });

  it('is the same for the same words, whatever time the copy was made', () => {
    expect(referenceFor(draft('Wednesday, 11 November 2026 at 2:32:09 pm'))).toBe(
      referenceFor(draft('Thursday, 12 November 2026 at 09:01'))
    );
  });

  it('changes when a word changes', () => {
    const at = 'Wednesday, 11 November 2026 at 2:32:09 pm';
    expect(referenceFor(draft(at))).not.toBe(referenceFor(draft(at, 'I revoke all former wills.')));
  });
});
