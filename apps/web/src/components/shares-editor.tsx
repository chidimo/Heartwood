import type { BeneficiaryDto } from '@heartwood/shared';
import { beneficiarySubtitle, formatTotal, totalHundredths } from '@heartwood/shared';
import { CONTROL } from './field';
import { cn } from '../lib/cn';

interface Props {
  beneficiaries: BeneficiaryDto[];
  /** beneficiary id -> percent as typed */
  shares: Record<string, string>;
  onChange: (shares: Record<string, string>) => void;
}

/** One percentage box per beneficiary, with a running total that turns green at exactly 100%. */
export const SharesEditor = ({ beneficiaries, shares, onChange }: Props) => {
  const complete = totalHundredths(shares) === 10000;
  return (
    <div className="flex flex-col gap-3">
      {beneficiaries.map(b => (
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
