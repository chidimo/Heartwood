import { useState } from 'react';
import type { BeneficiaryDto, ExecutorDto } from '@heartwood/shared';
import {
  CONDITION_KIND_OPTIONS,
  EXECUTOR_KIND_OPTIONS,
  IF_UNMET_OPTIONS,
  conditionKindHint,
  conditionNoteLabel,
  conditionProblem,
  conditionSummary,
  newCondition,
  type ConditionForm,
} from '@heartwood/shared';
import { Button } from './button';
import { SelectField } from './select-field';
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
  /** Where to go to add an executor or lawyer when there are none. */
  addExecutorHref: string;
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
  addExecutorHref: string;
}

const ConditionEditor = ({
  person,
  value,
  beneficiaries,
  executors,
  onChange,
  onDone,
  addExecutorHref,
}: EditorProps) => {
  const problem = conditionProblem(value, person.id);
  const fallbackOptions = beneficiaries
    .filter(b => b.id !== person.id)
    .map(b => ({ value: b.id, label: b.name }));

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-primary-600/30 p-4">
      <h4 className="font-semibold">Condition for {person.name}</h4>
      <SelectField
        label="This gift is held back until"
        value={value.kind}
        options={CONDITION_KIND_OPTIONS}
        onChange={kind => onChange({ ...value, kind })}
        hint={conditionKindHint(value.kind) ?? undefined}
      />
      {value.kind === 'min_age' && (
        <TextField
          label="They receive it at age"
          value={value.minAge}
          onChange={minAge => onChange({ ...value, minAge })}
          inputMode="numeric"
          placeholder="25"
        />
      )}
      {value.kind === 'survives' && (
        <TextField
          label="Number of days"
          value={value.days}
          onChange={days => onChange({ ...value, days })}
          inputMode="numeric"
          placeholder="30"
        />
      )}
      <TextField
        label={conditionNoteLabel(value.kind)}
        value={value.text}
        onChange={text => onChange({ ...value, text })}
        multiline
      />

      {executors.length === 0 ? (
        <p>
          <a className="text-primary-600 underline dark:text-primary-200" href={addExecutorHref}>
            Add an executor or lawyer first
          </a>
          : someone has to hold it until then.
        </p>
      ) : (
        <SelectField
          label="Held by, until the condition is met"
          value={value.holderId}
          options={executors.map(x => ({ value: x.id, label: executorLabel(x) }))}
          onChange={holderId => onChange({ ...value, holderId })}
        />
      )}

      <SelectField
        label="If the condition is never met"
        value={value.ifUnmet}
        options={IF_UNMET_OPTIONS}
        onChange={ifUnmet => onChange({ ...value, ifUnmet })}
      />
      {value.ifUnmet === 'named_beneficiary' && (
        <SelectField
          label="Who receives it instead?"
          value={value.fallbackId}
          options={fallbackOptions}
          onChange={fallbackId => onChange({ ...value, fallbackId })}
        />
      )}

      {problem && (
        <p role="alert" className="text-sm text-danger">
          {problem}
        </p>
      )}
      <div>
        <Button onClick={onDone} disabled={problem !== null}>
          Done
        </Button>
      </div>
    </div>
  );
};

/** Per-person conditions on a gift: add, summarise in plain words, edit, remove. */
export const GiftConditions = ({
  recipients,
  beneficiaries,
  executors,
  conditions,
  onChange,
  addExecutorHref,
}: Props) => {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (recipients.length === 0) return null;

  const nameOf = (id: string, list: { id: string; name: string }[]) =>
    list.find(x => x.id === id)?.name ?? '';

  const handleAdd = (personId: string) => {
    onChange({ ...conditions, [personId]: newCondition(executors[0]?.id ?? '') });
    setEditingId(personId);
  };

  const handleRemove = (personId: string) => {
    onChange(Object.fromEntries(Object.entries(conditions).filter(([id]) => id !== personId)));
    if (editingId === personId) setEditingId(null);
  };

  return (
    <section className="flex flex-col gap-3">
      <h3 className="mt-2 text-lg font-semibold">Conditions</h3>
      <p className="text-ink/70 dark:text-white/70">
        Hold a gift back until someone reaches an age or does something.
      </p>
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
              onChange={next => onChange({ ...conditions, [person.id]: next })}
              onDone={() => setEditingId(null)}
              addExecutorHref={addExecutorHref}
            />
          );
        }
        return (
          <div key={person.id} className="rounded-xl border border-primary-600/20 p-4">
            <p className="font-medium">{person.name}</p>
            {condition ? (
              <>
                <p className="text-ink/80 dark:text-white/80">
                  {conditionSummary(condition, {
                    holder: nameOf(condition.holderId, executors) || 'someone to be chosen',
                    fallback: nameOf(condition.fallbackId, beneficiaries) || 'someone to be chosen',
                  })}
                </p>
                <div className="mt-1 flex gap-4">
                  <Button variant="link" onClick={() => setEditingId(person.id)}>
                    Edit
                  </Button>
                  <Button variant="danger-link" onClick={() => handleRemove(person.id)}>
                    Remove
                  </Button>
                </div>
              </>
            ) : (
              <Button variant="link" onClick={() => handleAdd(person.id)}>
                Add a condition
              </Button>
            )}
          </div>
        );
      })}
    </section>
  );
};
