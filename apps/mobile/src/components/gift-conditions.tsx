import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  type BeneficiaryDto,
  CONDITION_KIND_OPTIONS,
  type ConditionForm,
  conditionProblem,
  conditionSummary,
  EXECUTOR_KIND_OPTIONS,
  type ExecutorDto,
  IF_UNMET_OPTIONS,
  newCondition,
} from '@heartwood/shared';
import { Button } from './button';
import { Segmented } from './segmented';
import { Select } from './select';
import { TextField } from './text-field';

type Conditions = Record<string, ConditionForm>;

interface Props {
  /** The people who receive something in the form: the only ones a condition can apply to. */
  recipients: BeneficiaryDto[];
  /** Everyone, for choosing who receives a gift if its condition is never met. */
  beneficiaries: BeneficiaryDto[];
  executors: ExecutorDto[];
  conditions: Conditions;
  onChange: (conditions: Conditions) => void;
  onAddExecutor: () => void;
}

const executorLabel = (x: ExecutorDto) =>
  `${x.name} (${EXECUTOR_KIND_OPTIONS.find(o => o.value === x.kind)?.label ?? x.kind})`;

interface EditorProps {
  person: BeneficiaryDto;
  value: ConditionForm;
  beneficiaries: BeneficiaryDto[];
  executors: ExecutorDto[];
  onChange: (value: ConditionForm) => void;
  onDone: () => void;
  onAddExecutor: () => void;
}

const ConditionEditor = ({
  person,
  value,
  beneficiaries,
  executors,
  onChange,
  onDone,
  onAddExecutor,
}: EditorProps) => {
  const problem = conditionProblem(value, person.id);
  const fallbackOptions = beneficiaries
    .filter(b => b.id !== person.id)
    .map(b => ({ value: b.id, label: b.name }));

  return (
    <View className="gap-3 rounded-xl border border-primary-600/30 p-4">
      <Text className="text-base font-semibold text-ink dark:text-white">
        Condition for {person.name}
      </Text>
      <Segmented
        value={value.kind}
        options={CONDITION_KIND_OPTIONS}
        onChange={kind => onChange({ ...value, kind })}
      />
      {value.kind === 'min_age' && (
        <TextField
          label="They receive it at age"
          value={value.minAge}
          onChangeText={minAge => onChange({ ...value, minAge })}
          keyboardType="number-pad"
          placeholder="25"
        />
      )}
      {value.kind === 'other' && (
        <TextField
          label="What has to happen first?"
          value={value.text}
          onChangeText={text => onChange({ ...value, text })}
          multiline
          hint="For example: she finishes university. Your lawyer will check the wording."
        />
      )}

      {executors.length === 0 ? (
        <Pressable onPress={onAddExecutor} accessibilityRole="button">
          <Text className="text-primary-600 dark:text-primary-200">
            Add an executor or lawyer first: someone has to hold it until then.
          </Text>
        </Pressable>
      ) : (
        <Select
          label="Held by, until the condition is met"
          value={value.holderId}
          options={executors.map(x => ({ value: x.id, label: executorLabel(x) }))}
          onChange={holderId => onChange({ ...value, holderId })}
          testID="condition-holder"
        />
      )}

      <Select
        label="If the condition is never met"
        value={value.ifUnmet}
        options={IF_UNMET_OPTIONS}
        onChange={ifUnmet => onChange({ ...value, ifUnmet })}
        testID="condition-if-unmet"
      />
      {value.ifUnmet === 'named_beneficiary' && (
        <Select
          label="Who receives it instead?"
          value={value.fallbackId}
          options={fallbackOptions}
          onChange={fallbackId => onChange({ ...value, fallbackId })}
        />
      )}

      {problem && <Text className="text-sm text-danger">{problem}</Text>}
      <Button label="Done" onPress={onDone} disabled={problem !== null} testID="condition-done" />
    </View>
  );
};

/** Per-person conditions on a gift: add, summarise in plain words, edit, remove. */
export const GiftConditions = ({
  recipients,
  beneficiaries,
  executors,
  conditions,
  onChange,
  onAddExecutor,
}: Props) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (recipients.length === 0) return null;

  const nameOf = (id: string, list: { id: string; name: string }[]) =>
    list.find(x => x.id === id)?.name ?? '';

  const setCondition = (personId: string, condition: ConditionForm) =>
    onChange({ ...conditions, [personId]: condition });

  const handleAdd = (personId: string) => {
    setCondition(personId, newCondition(executors[0]?.id ?? ''));
    setEditingId(personId);
  };

  const handleRemove = (personId: string) => {
    const { [personId]: _removed, ...rest } = conditions;
    onChange(rest);
    if (editingId === personId) setEditingId(null);
  };

  return (
    <View className="gap-3">
      <Text className="mt-2 text-lg font-semibold text-ink dark:text-white">Conditions</Text>
      <Text className="text-ink/70 dark:text-white/70">
        Hold a gift back until someone reaches an age or does something.
      </Text>
      {recipients.map(person => {
        const condition = conditions[person.id];
        if (condition && editingId === person.id) {
          return (
            <ConditionEditor
              key={person.id}
              person={person}
              value={condition}
              beneficiaries={beneficiaries}
              executors={executors}
              onChange={next => setCondition(person.id, next)}
              onDone={() => setEditingId(null)}
              onAddExecutor={onAddExecutor}
            />
          );
        }
        return (
          <View
            key={person.id}
            className="gap-1 rounded-xl border border-primary-600/20 p-4"
            testID={`conditions-${person.id}`}
          >
            <Text className="text-base font-medium text-ink dark:text-white">{person.name}</Text>
            {condition ? (
              <>
                <Text className="text-ink/80 dark:text-white/80">
                  {conditionSummary(condition, {
                    holder: nameOf(condition.holderId, executors) || 'someone to be chosen',
                    fallback: nameOf(condition.fallbackId, beneficiaries) || 'someone to be chosen',
                  })}
                </Text>
                <View className="mt-1 flex-row gap-5">
                  <Pressable onPress={() => setEditingId(person.id)} accessibilityRole="button">
                    <Text className="text-primary-600 dark:text-primary-200">Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => handleRemove(person.id)} accessibilityRole="button">
                    <Text className="text-danger">Remove</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <Pressable onPress={() => handleAdd(person.id)} accessibilityRole="button">
                <Text className="text-primary-600 dark:text-primary-200">Add a condition</Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
};
