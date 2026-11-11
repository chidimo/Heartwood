import { useState } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  allocationFormProblem,
  formFromAllocations,
  recipientIds,
  toAllocationEntries,
  type AllocationDto,
  type AllocationForm,
  type AllocationMode,
  type AssetDto,
  type BeneficiaryDto,
  type ExecutorDto,
} from '@heartwood/shared';
import { getErrorMessage } from '../api/client';
import { Button } from '../components/button';
import { GiftConditions } from '../components/gift-conditions';
import { Heading } from '../components/layout';
import { QueryState } from '../components/query-state';
import { Segmented } from '../components/segmented';
import { SelectField } from '../components/select-field';
import { SharesEditor } from '../components/shares-editor';
import { TextField } from '../components/text-field';
import {
  useAllocations,
  useAssets,
  useBeneficiaries,
  useExecutors,
  useReplaceAllocations,
} from '../features/api';

const MODES = [
  { value: 'split', label: 'Split by percent' },
  { value: 'bequest', label: 'Give to one person' },
] as const;

interface FieldsProps {
  beneficiaries: BeneficiaryDto[];
  form: AllocationForm;
  onChange: (form: AllocationForm) => void;
}

const SplitFields = ({ beneficiaries, form, onChange }: FieldsProps) => (
  <>
    <SharesEditor
      beneficiaries={beneficiaries}
      shares={form.shares}
      onChange={shares => onChange({ ...form, shares })}
    />
  </>
);

const BequestFields = ({ beneficiaries, form, onChange }: FieldsProps) => (
  <>
    <SelectField
      label="Who receives it?"
      value={form.bequestBeneficiaryId ?? ''}
      options={beneficiaries.map(b => ({ value: b.id, label: b.name }))}
      onChange={bequestBeneficiaryId => onChange({ ...form, bequestBeneficiaryId })}
    />
    <TextField
      label="What exactly are you giving?"
      value={form.bequestText}
      onChange={bequestText => onChange({ ...form, bequestText })}
      hint="For example: the car, with all its documents."
    />
  </>
);

interface EditorProps {
  asset: AssetDto;
  beneficiaries: BeneficiaryDto[];
  executors: ExecutorDto[];
  current: AllocationDto[];
}

const AllocationEditor = ({ asset, beneficiaries, executors, current }: EditorProps) => {
  const navigate = useNavigate();
  const save = useReplaceAllocations(asset.id);
  const [form, setForm] = useState<AllocationForm>(() => formFromAllocations(current));

  const problem = allocationFormProblem(form);
  const nothingChosen = toAllocationEntries(form).length === 0;

  const handleSave = () =>
    save.mutate(toAllocationEntries(form), {
      onSuccess: () => {
        toast.success(nothingChosen ? 'Allocation cleared' : 'Allocation saved');
        void navigate({ to: '/assets/$id', params: { id: asset.id } });
      },
      onError: error => toast.error(getErrorMessage(error, "Couldn't save. Try again.")),
    });

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        label="How to give it"
        value={form.mode}
        options={MODES}
        onChange={(mode: AllocationMode) => setForm({ ...form, mode })}
      />
      {form.mode === 'split' && (
        <SplitFields beneficiaries={beneficiaries} form={form} onChange={setForm} />
      )}
      {form.mode === 'bequest' && (
        <BequestFields beneficiaries={beneficiaries} form={form} onChange={setForm} />
      )}
      <GiftConditions
        recipients={recipientIds(form)
          .map(id => beneficiaries.find(b => b.id === id))
          .filter((b): b is BeneficiaryDto => b !== undefined)}
        beneficiaries={beneficiaries}
        executors={executors}
        conditions={form.conditions}
        onChange={conditions => setForm({ ...form, conditions })}
        addExecutorHref="/executors/new"
      />
      {problem && (
        <p role="alert" className="text-sm text-danger">
          {problem}
        </p>
      )}
      {!problem && nothingChosen && (
        <p className="text-sm text-ink/60 dark:text-white/60">
          Nothing chosen: this asset will pass under the “everything else” rule.
        </p>
      )}
      <div>
        <Button onClick={handleSave} loading={save.isPending} disabled={problem !== null}>
          Save allocation
        </Button>
      </div>
    </div>
  );
};

const EditorLoader = ({
  asset,
  beneficiaries,
}: {
  asset: AssetDto;
  beneficiaries: BeneficiaryDto[];
}) => {
  const allocations = useAllocations(asset.id);
  const executors = useExecutors();

  if (beneficiaries.length === 0) {
    return (
      <Link to="/people/new" className="text-primary-600 underline dark:text-primary-200">
        Add a beneficiary first, then decide who gets this.
      </Link>
    );
  }
  return (
    <QueryState query={allocations}>
      {current => (
        <QueryState query={executors}>
          {holders => (
            // key re-initialises the editor once the saved allocation has loaded.
            <AllocationEditor
              key={JSON.stringify(current)}
              asset={asset}
              beneficiaries={beneficiaries}
              executors={holders}
              current={current}
            />
          )}
        </QueryState>
      )}
    </QueryState>
  );
};

export const AssetEditPage = () => {
  const { id } = useParams({ strict: false }) as { id: string };
  const assets = useAssets();
  const beneficiaries = useBeneficiaries();

  return (
    <QueryState query={assets}>
      {list => {
        const asset = list.find(a => a.id === id);
        if (!asset) return <p>This asset is no longer on your list.</p>;
        return (
          <>
            <Heading>Edit distribution</Heading>
            <p className="text-ink/70 dark:text-white/70">{asset.description}</p>
            <QueryState query={beneficiaries}>
              {people => <EditorLoader asset={asset} beneficiaries={people} />}
            </QueryState>
          </>
        );
      }}
    </QueryState>
  );
};
