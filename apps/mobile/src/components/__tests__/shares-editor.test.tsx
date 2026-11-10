import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BeneficiaryDto } from '@heartwood/shared';
import { SharesEditor } from '../shares-editor';

const person = (id: string, name: string): BeneficiaryDto => ({
  id,
  kind: 'person',
  name,
  institutionType: null,
  relationship: 'Child',
  contact: null,
  contingencyPlan: null,
  contingencyBeneficiaryId: null,
  createdAt: '',
  updatedAt: '',
});

const PEOPLE = [person('a', 'Ada'), person('b', 'Bola')];

const church: BeneficiaryDto = {
  ...person('c', 'Grace Chapel'),
  kind: 'institution',
  relationship: null,
  institutionType: 'church',
};

describe('SharesEditor', () => {
  it('shows an organisation with its type instead of a relationship', async () => {
    await render(<SharesEditor beneficiaries={[church]} shares={{}} onChange={jest.fn()} />);
    expect(screen.getByText('Grace Chapel')).toBeTruthy();
    expect(screen.getByText('Church')).toBeTruthy();
  });

  it('shows each person and the running total', async () => {
    await render(
      <SharesEditor beneficiaries={PEOPLE} shares={{ a: '60', b: '25' }} onChange={jest.fn()} />
    );
    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.getByText('Bola')).toBeTruthy();
    expect(screen.getByTestId('shares-total').props.children).toBe('85%');
  });

  it('reports a typed share without losing the others', async () => {
    const onChange = jest.fn();
    await render(<SharesEditor beneficiaries={PEOPLE} shares={{ a: '60' }} onChange={onChange} />);
    await fireEvent.changeText(screen.getByLabelText('Share for Bola'), '40');
    expect(onChange).toHaveBeenCalledWith({ a: '60', b: '40' });
  });
});
