import { beneficiarySubtitle, formatTotal, splitEvenly, totalHundredths } from '@heartwood/shared';
import type { BeneficiaryDto } from '@heartwood/shared';
import { cn } from '../lib/cn';
import { CONTROL } from './field';
import { Button } from './button';
import { SelectField } from './select-field';

interface Props {
  beneficiaries: BeneficiaryDto[];
  /** beneficiary id -> percent as typed. A key means the person is in the split, even with no number yet. */
  shares: Record<string, string>;
  onChange: (shares: Record<string, string>) => void;
}

/** The people in a split, added one at a time, with a running total that turns green at exactly 100%. */
export const SharesEditor = ({ beneficiaries, shares, onChange }: Props) => {
  const complete = totalHundredths(shares) === 10000;
  const added = Object.keys(shares)
    .map(id => beneficiaries.find(b => b.id === id))
    .filter((b): b is BeneficiaryDto => b !== undefined);
  const available = beneficiaries.filter(b => !(b.id in shares));

  const handleAdd = (id: string) => onChange({ ...shares, [id]: '' });
  const handleRemove = (id: string) =>
    onChange(Object.fromEntries(Object.entries(shares).filter(([key]) => key !== id)));

  return (
    <div className="flex flex-col gap-3">
      {available.length > 0 && (
        <SelectField
          label="Add a beneficiary"
          value=""
          placeholder="Choose someone…"
          options={available.map(b => ({ value: b.id, label: b.name }))}
          onChange={handleAdd}
        />
      )}
      {added.length > 1 && (
        <Button
          variant="secondary"
          onClick={() => onChange(splitEvenly(Object.keys(shares)))}
          aria-label="Split evenly between everyone added"
        >
          Split evenly
        </Button>
      )}
      {added.length === 0 && (
        <p className="text-ink/60 dark:text-white/60">No one yet. Add the first beneficiary.</p>
      )}
      {added.map(b => (
        <div key={b.id} className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate">{b.name}</p>
            <p className="text-xs text-ink/60 dark:text-white/60">{beneficiarySubtitle(b)}</p>
          </div>
          <div className="flex w-32 items-center gap-1">
            <input
              aria-label={`Share for ${b.name}`}
              inputMode="decimal"
              placeholder="0"
              value={shares[b.id] ?? ''}
              onChange={e => onChange({ ...shares, [b.id]: e.target.value })}
              className={cn(CONTROL, 'text-right')}
            />
            <span aria-hidden className="text-ink/60 dark:text-white/60">
              %
            </span>
          </div>
          <button
            type="button"
            aria-label={`Remove ${b.name}`}
            onClick={() => handleRemove(b.id)}
            className="rounded-lg px-2 py-1 text-sm text-danger hover:bg-danger/10"
          >
            Remove
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-primary-600/20 pt-3">
        <span className="text-sm text-ink/70 dark:text-white/70">Total</span>
        <span
          data-testid="shares-total"
          className={cn('font-semibold', complete && 'text-success')}
        >
          {formatTotal(shares)}
        </span>
      </div>
    </div>
  );
};
