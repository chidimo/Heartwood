import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import {
  type AllocationDto,
  type AllocationForm,
  allocationFormProblem,
  type AllocationMode,
  ASSET_TYPE_LABELS,
  type AssetDto,
  type BeneficiaryDto,
  type ExecutorDto,
  formFromAllocations,
  recipientIds,
  toAllocationEntries,
} from '@heartwood/shared';
import { errorMessage } from '../../../../src/api/client';
import { Button } from '../../../../src/components/button';
import { GiftConditions } from '../../../../src/components/gift-conditions';
import { QueryState } from '../../../../src/components/query-state';
import { Screen } from '../../../../src/components/screen';
import { Segmented } from '../../../../src/components/segmented';
import { Select } from '../../../../src/components/select';
import { SharesEditor } from '../../../../src/components/shares-editor';
import { TextField } from '../../../../src/components/text-field';
import { useAssets } from '../../../../src/features/assets/api';
import {
  useAllocations,
  useBeneficiaries,
  useExecutors,
  useReplaceAllocations,
} from '../../../../src/features/inventory/api';
import { notify } from '../../../../src/notifications/notify';
import { confirmDestructive } from '../../../../src/utils/confirm';

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
    <Select
      label="Who receives it?"
      value={form.bequestBeneficiaryId ?? ''}
      options={beneficiaries.map(b => ({ value: b.id, label: b.name }))}
      onChange={bequestBeneficiaryId => onChange({ ...form, bequestBeneficiaryId })}
    />
    <TextField
      label="What exactly are you giving?"
      value={form.bequestText}
      onChangeText={bequestText => onChange({ ...form, bequestText })}
      hint="For example: the car, with all its documents."
    />
  </>
);

const AssetHeader = ({ asset }: { asset: AssetDto }) => (
  <>
    <View className="gap-1">
      <Text className="text-xs uppercase text-primary-600 dark:text-primary-200">
        {ASSET_TYPE_LABELS[asset.type]}
      </Text>
      <Text className="text-xl font-semibold text-ink dark:text-white">{asset.description}</Text>
    </View>
    <Text className="mt-2 text-lg font-semibold text-ink dark:text-white">Who gets it?</Text>
  </>
);

interface EditorProps {
  asset: AssetDto;
  beneficiaries: BeneficiaryDto[];
  executors: ExecutorDto[];
  current: AllocationDto[];
}

const AllocationEditor = ({ asset, beneficiaries, executors, current }: EditorProps) => {
  const router = useRouter();
  const save = useReplaceAllocations(asset.id);
  const [form, setForm] = useState<AllocationForm>(() => formFromAllocations(current));

  const problem = allocationFormProblem(form);
  const nothingChosen = toAllocationEntries(form).length === 0;

  const handleSave = () =>
    save.mutate(toAllocationEntries(form), {
      onSuccess: () => {
        notify.success(nothingChosen ? 'Allocation cleared' : 'Allocation saved');
        router.back();
      },
      onError: error => notify.error("Couldn't save", errorMessage(error, 'Try again.')),
    });

  return (
    <Screen
      footer={
        <Button
          label="Save allocation"
          onPress={handleSave}
          loading={save.isPending}
          disabled={problem !== null}
          testID="save-allocation"
        />
      }
    >
      <AssetHeader asset={asset} />
      <Segmented
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
        onAddExecutor={() => router.push('/executor')}
      />
      {problem && <Text className="text-sm text-danger">{problem}</Text>}
      {!problem && nothingChosen && (
        <Text className="text-sm text-ink/60 dark:text-white/60">
          Nothing chosen: this asset will pass under the “everything else” rule.
        </Text>
      )}
    </Screen>
  );
};

const AssetAllocations = ({
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
      <Screen>
        <AssetHeader asset={asset} />
        <Link href="/beneficiary" asChild>
          <Pressable accessibilityRole="link">
            <Text className="text-primary-600 dark:text-primary-200">
              Add a beneficiary first, then decide who gets this.
            </Text>
          </Pressable>
        </Link>
      </Screen>
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

const AssetEditBody = ({ asset }: { asset: AssetDto }) => {
  const beneficiaries = useBeneficiaries();

  return (
    <QueryState query={beneficiaries}>
      {people => <AssetAllocations asset={asset} beneficiaries={people} />}
    </QueryState>
  );
};

const Gone = () => (
  <Text className="p-6 text-ink/70 dark:text-white/70">This asset is no longer on your list.</Text>
);

const AssetEditScreen = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const assets = useAssets();

  return (
    <QueryState query={assets}>
      {list => {
        const asset = list.find(a => a.id === id);
        if (!asset) return <Gone />;
        return <AssetEditBody asset={asset} />;
      }}
    </QueryState>
  );
};
export default AssetEditScreen;
