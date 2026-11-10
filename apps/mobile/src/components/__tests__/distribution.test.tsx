import { render, screen } from '@testing-library/react-native';
import type { AllocationDto, BeneficiaryDto, ExecutorDto } from '@heartwood/shared';
import { Distribution } from '../distribution';

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

describe('Distribution', () => {
  it('says so when nothing is allocated', async () => {
    await show([]);
    expect(screen.getByText(/Not allocated yet/)).toBeTruthy();
  });

  it('shows each person with their percentage', async () => {
    await show([share('ada', 60), share('chidi', 40)]);
    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.getByText('60%')).toBeTruthy();
    expect(screen.getByText('Chidi')).toBeTruthy();
    expect(screen.getByText('40%')).toBeTruthy();
  });

  it('shows a specific bequest in place of a percentage', async () => {
    await show([{ ...share('ada', 100), sharePercent: null, specificBequest: 'The red car' }]);
    expect(screen.getByText('The red car')).toBeTruthy();
    expect(screen.queryByText('100%')).toBeNull();
  });

  it('spells out a condition with its holder', async () => {
    await show([
      {
        ...share('ada', 100),
        condition: {
          kind: 'min_age',
          minAge: 25,
          ifUnmet: 'redistribute',
          holderId: 'lawyer',
          fallbackBeneficiaryId: null,
          text: null,
        },
      },
    ]);
    expect(screen.getByText(/Only at age 25\. Held by Barr\. Adeyemi/)).toBeTruthy();
  });
});
