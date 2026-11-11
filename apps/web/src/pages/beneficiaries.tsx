import { useState } from 'react';
import {
  beneficiarySubtitle,
  contingencyLabel,
  contingencyQuestion,
  type BeneficiaryDto,
} from '@heartwood/shared';
import { Button } from '../components/button';
import { Heading } from '../components/layout';
import { Modal } from '../components/modal';
import { OrganizationForm } from '../components/organization-form';
import { PersonForm } from '../components/person-form';
import { QueryState } from '../components/query-state';
import { useBeneficiaries } from '../features/api';

// What the dialog is doing: choosing between person and organisation, adding either, or editing one.
type Dialog =
  | { step: 'choose' }
  | { step: 'add'; kind: 'person' | 'institution' }
  | { step: 'edit'; beneficiary: BeneficiaryDto };

const BeneficiaryList = ({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: BeneficiaryDto[];
  onOpen: (item: BeneficiaryDto) => void;
}) => (
  <section className="flex flex-col gap-3">
    <h2 className="text-lg font-semibold">{title}</h2>
    <ul className="flex flex-col gap-3">
      {items.map(item => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="block w-full rounded-xl border border-primary-600/20 p-4 text-left hover:bg-primary-50 dark:hover:bg-primary-900"
          >
            <p className="font-medium">{item.name}</p>
            <p className="text-ink/60 dark:text-white/60">{beneficiarySubtitle(item)}</p>
            <p className="mt-1 text-xs text-ink/60 dark:text-white/60">
              {contingencyQuestion(item.kind)}: {contingencyLabel(item)}
            </p>
          </button>
        </li>
      ))}
    </ul>
  </section>
);

const Chooser = ({ onChoose }: { onChoose: (kind: 'person' | 'institution') => void }) => (
  <div className="flex flex-col gap-3">
    <Button onClick={() => onChoose('person')}>A person</Button>
    <Button variant="secondary" onClick={() => onChoose('institution')}>
      An organisation
    </Button>
  </div>
);

export const BeneficiariesPage = () => {
  const beneficiaries = useBeneficiaries();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const handleClose = () => setDialog(null);

  const modalTitle = (): string => {
    if (!dialog || dialog.step === 'choose') return 'Who are you adding?';
    if (dialog.step === 'add') {
      return dialog.kind === 'person' ? 'Add a person' : 'Add an organisation';
    }
    return dialog.beneficiary.kind === 'person' ? 'Edit person' : 'Edit organisation';
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Heading>Beneficiaries</Heading>
        <Button onClick={() => setDialog({ step: 'choose' })}>Add a beneficiary</Button>
      </div>
      <p className="text-ink/70 dark:text-white/70">
        The people and organisations you want to leave things to.
      </p>
      <QueryState
        query={beneficiaries}
        isEmpty={list => list.length === 0}
        empty={
          <p className="py-8 text-center text-ink/60 dark:text-white/60">
            No one yet. Add the first person or organisation.
          </p>
        }
      >
        {all => {
          const people = all.filter(b => b.kind === 'person');
          const organisations = all.filter(b => b.kind === 'institution');
          const open = (beneficiary: BeneficiaryDto) => setDialog({ step: 'edit', beneficiary });
          const editing = dialog?.step === 'edit' ? dialog.beneficiary : null;
          const others = all.filter(b => b.id !== editing?.id);
          return (
            <>
              {people.length > 0 && <BeneficiaryList title="People" items={people} onOpen={open} />}
              {organisations.length > 0 && (
                <BeneficiaryList title="Organisations" items={organisations} onOpen={open} />
              )}
              {dialog && (
                <Modal title={modalTitle()} onClose={handleClose}>
                  {dialog.step === 'choose' && (
                    <Chooser onChoose={kind => setDialog({ step: 'add', kind })} />
                  )}
                  {dialog.step === 'add' && dialog.kind === 'person' && (
                    <PersonForm existing={null} others={others} onDone={handleClose} />
                  )}
                  {dialog.step === 'add' && dialog.kind === 'institution' && (
                    <OrganizationForm existing={null} others={others} onDone={handleClose} />
                  )}
                  {dialog.step === 'edit' && dialog.beneficiary.kind === 'person' && (
                    <PersonForm
                      key={dialog.beneficiary.id}
                      existing={dialog.beneficiary}
                      others={others}
                      onDone={handleClose}
                    />
                  )}
                  {dialog.step === 'edit' && dialog.beneficiary.kind === 'institution' && (
                    <OrganizationForm
                      key={dialog.beneficiary.id}
                      existing={dialog.beneficiary}
                      others={others}
                      onDone={handleClose}
                    />
                  )}
                </Modal>
              )}
            </>
          );
        }}
      </QueryState>
    </>
  );
};
