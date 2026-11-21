import {
  contingencyOptionsFor,
  contingencyQuestion,
  type BeneficiaryDto,
  type BeneficiaryKind,
  type ContingencyChoice,
} from '@heartwood/shared';
import { SelectField } from './select-field';

interface Props {
  kind: BeneficiaryKind;
  plan: ContingencyChoice;
  onPlanChange: (plan: ContingencyChoice) => void;
  fallbackId: string;
  onFallbackChange: (id: string) => void;
  /** Everyone else on the list: who can receive the share instead. */
  others: BeneficiaryDto[];
}

/** "What if they die before me?" and, when the answer names someone, who. */
export const ContingencyFields = ({
  kind,
  plan,
  onPlanChange,
  fallbackId,
  onFallbackChange,
  others,
}: Props) => (
  <>
    <SelectField
      label={contingencyQuestion(kind)}
      value={plan}
      options={contingencyOptionsFor(kind)}
      onChange={onPlanChange}
    />
    {plan === 'named_beneficiary' && (
      <SelectField
        label="Who should receive their share?"
        value={fallbackId}
        options={others.map(b => ({ value: b.id, label: b.name }))}
        onChange={onFallbackChange}
      />
    )}
  </>
);
