import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AllocationDto, BeneficiaryDto, ExecutorDto } from '@heartwood/shared';
import { newCondition } from '@heartwood/shared';
import { DateField } from '../date-field';
import { Distribution } from '../distribution';
import { GiftConditions } from '../gift-conditions';
import { SharesEditor } from '../shares-editor';

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

describe('SharesEditor', () => {
  it('shows a running total and reports typed shares', async () => {
    const onChange = vi.fn();
    render(
      <SharesEditor beneficiaries={[ADA, CHIDI]} shares={{ ada: '60' }} onChange={onChange} />
    );
    expect(screen.getByTestId('shares-total')).toHaveTextContent('60%');
    await userEvent.type(screen.getByLabelText('Share for Chidi'), '4');
    expect(onChange).toHaveBeenCalledWith({ ada: '60', chidi: '4' });
  });

  it('marks exactly 100% as complete', () => {
    render(
      <SharesEditor
        beneficiaries={[ADA, CHIDI]}
        shares={{ ada: '50', chidi: '50' }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByTestId('shares-total')).toHaveClass('text-success');
  });
});

describe('GiftConditions', () => {
  const setup = (conditions = {}) => {
    const onChange = vi.fn();
    render(
      <GiftConditions
        recipients={[ADA, CHIDI]}
        beneficiaries={[ADA, CHIDI]}
        executors={[LAWYER]}
        conditions={conditions}
        onChange={onChange}
        addExecutorHref="/executors/new"
      />
    );
    return onChange;
  };

  it('adds a condition held by the first executor', async () => {
    const onChange = setup();
    await userEvent.click(screen.getAllByText('Add a condition')[0]);
    expect(onChange).toHaveBeenCalledWith({
      ada: expect.objectContaining({ holderId: 'lawyer', kind: 'min_age' }),
    });
  });

  it('summarises a condition in one sentence', () => {
    setup({ ada: { ...newCondition('lawyer'), minAge: '25' } });
    expect(
      screen.getByText(
        'Only at age 25. Held by Barr. Adeyemi. If it is not met, it is shared among my other beneficiaries.'
      )
    ).toBeInTheDocument();
  });

  it('blocks Done until the condition is complete', async () => {
    setup({ ada: { ...newCondition('lawyer'), minAge: '' } });
    await userEvent.click(screen.getByText('Edit'));
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter an age between 1 and 100.');
  });

  it('marriage needs nothing more, so Done is enabled', async () => {
    setup({ ada: { ...newCondition('lawyer'), kind: 'marriage' } });
    await userEvent.click(screen.getByText('Edit'));
    expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled();
  });

  it('a free-text condition needs its words', async () => {
    setup({ ada: { ...newCondition('lawyer'), kind: 'other', text: '' } });
    await userEvent.click(screen.getByText('Edit'));
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
  });

  it('removes only that person’s condition', async () => {
    const onChange = setup({
      ada: { ...newCondition('lawyer'), minAge: '25' },
      chidi: { ...newCondition('lawyer'), minAge: '30' },
    });
    await userEvent.click(screen.getAllByText('Remove')[0]);
    expect(onChange).toHaveBeenCalledWith({ chidi: expect.objectContaining({ minAge: '30' }) });
  });
});

describe('Distribution', () => {
  const share = (beneficiaryId: string, sharePercent: number): AllocationDto => ({
    beneficiaryId,
    sharePercent,
    specificBequest: null,
    condition: null,
  });
  const show = (allocations: AllocationDto[]) =>
    render(
      <Distribution allocations={allocations} beneficiaries={[ADA, CHIDI]} executors={[LAWYER]} />
    );

  it('says so when nothing is allocated', () => {
    show([]);
    expect(screen.getByText(/Not allocated yet/)).toBeInTheDocument();
  });

  it('shows percentages and specific bequests', () => {
    show([
      share('ada', 60),
      { ...share('chidi', 40), sharePercent: null, specificBequest: 'The red car' },
    ]);
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('The red car')).toBeInTheDocument();
  });
});

describe('DateField', () => {
  it('limits the picker to today and reports the chosen date', () => {
    const onChange = vi.fn();
    render(
      <DateField
        label="Date of birth"
        value={null}
        onChange={onChange}
        maxDate={new Date(2026, 10, 10)}
      />
    );
    const input = screen.getByLabelText('Date of birth');
    expect(input).toHaveAttribute('max', '2026-11-10');
    expect(input).toHaveAttribute('min', '1900-01-01');
  });
});
