import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BeneficiaryDto, ExecutorDto } from '@heartwood/shared';
import { newCondition, type ConditionForm } from '../../features/inventory/allocation-form';
import { GiftConditions } from '../gift-conditions';

const person = (id: string, name: string): BeneficiaryDto => ({
  id,
  kind: 'person',
  name,
  relationship: 'son',
  relationshipOther: null,
  institutionType: null,
  contact: null,
  address: null,
  dateOfBirth: null,
  contingencyPlan: null,
  contingencyBeneficiaryId: null,
  createdAt: '',
  updatedAt: '',
});

const ADA = person('ada', 'Ada');
const CHIDI = person('chidi', 'Chidi');
const LAWYER: ExecutorDto = { id: 'lawyer', kind: 'lawyer', name: 'Barr. Adeyemi', contact: null };

const age25: ConditionForm = { ...newCondition(LAWYER.id), minAge: '25' };

const setup = async (props: Partial<React.ComponentProps<typeof GiftConditions>> = {}) => {
  const onChange = jest.fn();
  const onAddExecutor = jest.fn();
  await render(
    <GiftConditions
      recipients={[ADA, CHIDI]}
      beneficiaries={[ADA, CHIDI]}
      executors={[LAWYER]}
      conditions={{}}
      onChange={onChange}
      onAddExecutor={onAddExecutor}
      {...props}
    />
  );
  return { onChange, onAddExecutor };
};

describe('GiftConditions', () => {
  it('renders nothing when nobody receives anything yet', async () => {
    await setup({ recipients: [] });
    expect(screen.queryByText('Conditions')).toBeNull();
  });

  it('offers "Add a condition" for each person who receives something', async () => {
    await setup();
    expect(screen.getAllByText('Add a condition')).toHaveLength(2);
  });

  it('adding a condition starts with the first executor or lawyer as holder, and opens the editor', async () => {
    const { onChange } = await setup();
    await fireEvent.press(screen.getAllByText('Add a condition')[0]);
    expect(onChange).toHaveBeenCalledWith({
      ada: expect.objectContaining({ holderId: LAWYER.id, kind: 'min_age' }),
    });
  });

  it('summarises an existing condition in one plain sentence', async () => {
    await setup({ conditions: { ada: age25 } });
    expect(
      screen.getByText(
        'Only at age 25. Held by Barr. Adeyemi. If it is not met, it is shared among my other beneficiaries.'
      )
    ).toBeTruthy();
    expect(screen.getAllByText('Add a condition')).toHaveLength(1); // only Chidi still has none
  });

  it("removing a condition drops only that person's", async () => {
    const { onChange } = await setup({
      conditions: { ada: age25, chidi: { ...age25, minAge: '30' } },
    });
    await fireEvent.press(screen.getAllByText('Remove')[0]);
    expect(onChange).toHaveBeenCalledWith({ chidi: expect.objectContaining({ minAge: '30' }) });
  });

  it('the editor blocks Done until the age is valid, and says why', async () => {
    await setup({ conditions: { ada: { ...age25, minAge: '' } } });
    await fireEvent.press(screen.getByText('Edit'));
    expect(screen.getByText('Enter an age between 1 and 100.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Done' }).props.accessibilityState.disabled).toBe(
      true
    );
  });

  it('the editor lets you finish once the condition is complete', async () => {
    await setup({ conditions: { ada: age25 } });
    await fireEvent.press(screen.getByText('Edit'));
    expect(
      screen.getByRole('button', { name: 'Done' }).props.accessibilityState.disabled
    ).toBeFalsy();
  });

  it('with no executor or lawyer, says one is needed and offers to add one', async () => {
    const { onAddExecutor } = await setup({
      executors: [],
      conditions: { ada: { ...age25, holderId: '' } },
    });
    await fireEvent.press(screen.getByText('Edit'));
    await fireEvent.press(screen.getByText(/Add an executor or lawyer first/));
    expect(onAddExecutor).toHaveBeenCalledTimes(1);
  });
});
