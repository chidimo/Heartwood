import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  residuaryFormProblem,
  splitEvenly,
  toResiduaryEntries,
  type BeneficiaryDto,
} from '@heartwood/shared';
import { getErrorMessage } from '../api/client';
import { Button } from '../components/button';
import { Heading } from '../components/layout';
import { QueryState } from '../components/query-state';
import { SharesEditor } from '../components/shares-editor';
import { useBeneficiaries, useReplaceResiduary, useResiduary } from '../features/api';

const ResiduaryEditor = ({
  beneficiaries,
  initial,
}: {
  beneficiaries: BeneficiaryDto[];
  initial: Record<string, string>;
}) => {
  const navigate = useNavigate();
  const save = useReplaceResiduary();
  const [shares, setShares] = useState(initial);
  const problem = residuaryFormProblem(shares);

  const handleSave = () =>
    save.mutate(toResiduaryEntries(shares), {
      onSuccess: () => {
        toast.success('Saved');
        void navigate({ to: '/review' });
      },
      onError: error => toast.error(getErrorMessage(error, "Couldn't save. Try again.")),
    });

  return (
    <>
      <p className="text-ink/70 dark:text-white/70">
        Anything you haven't given to someone in particular, or forget to list, goes to these
        people.
      </p>
      <SharesEditor beneficiaries={beneficiaries} shares={shares} onChange={setShares} />
      <div>
        <Button variant="link" onClick={() => setShares(splitEvenly(beneficiaries.map(b => b.id)))}>
          Split evenly
        </Button>
      </div>
      {problem && (
        <p role="alert" className="text-sm text-danger">
          {problem}
        </p>
      )}
      <div>
        <Button onClick={handleSave} loading={save.isPending} disabled={problem !== null}>
          Save
        </Button>
      </div>
    </>
  );
};

export const ResiduaryPage = () => {
  const beneficiaries = useBeneficiaries();
  const residuary = useResiduary();
  return (
    <>
      <Heading>Everything else</Heading>
      <QueryState query={beneficiaries}>
        {people => (
          <QueryState query={residuary}>
            {current => {
              if (people.length === 0) {
                return (
                  <Link
                    to="/people/new"
                    className="text-primary-600 underline dark:text-primary-200"
                  >
                    Add a beneficiary first.
                  </Link>
                );
              }
              const initial = Object.fromEntries(
                current.map(r => [r.beneficiaryId, String(r.sharePercent)])
              );
              return (
                <ResiduaryEditor
                  key={JSON.stringify(current)}
                  beneficiaries={people}
                  initial={initial}
                />
              );
            }}
          </QueryState>
        )}
      </QueryState>
    </>
  );
};
