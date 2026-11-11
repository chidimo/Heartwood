import { useLocalSearchParams } from 'expo-router';
import { OrganizationForm } from '../../src/components/organization-form';
import { PersonForm } from '../../src/components/person-form';
import { QueryState } from '../../src/components/query-state';
import { useBeneficiaries } from '../../src/features/inventory/api';

/** Add (no `id`, with `kind`) or edit (`id`) one beneficiary: a person or an organisation. */
const BeneficiaryScreen = () => {
  const { id, kind } = useLocalSearchParams<{ id?: string; kind?: string }>();
  const beneficiaries = useBeneficiaries();

  return (
    <QueryState query={beneficiaries}>
      {list => {
        const existing = id ? (list.find(b => b.id === id) ?? null) : null;
        const others = list.filter(b => b.id !== id);
        // key resets the form's state when a different one is opened.
        const key = existing?.id ?? 'new';
        const isOrganisation = existing ? existing.kind === 'institution' : kind === 'institution';
        if (isOrganisation)
          return <OrganizationForm key={key} existing={existing} others={others} />;
        return <PersonForm key={key} existing={existing} others={others} />;
      }}
    </QueryState>
  );
};
export default BeneficiaryScreen;
