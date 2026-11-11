import { useState } from 'react';
import { Share, Text, View } from 'react-native';
import { documentToText, type DraftDocumentKey, type DraftSection } from '@heartwood/shared';
import { Button } from '../../../src/components/button';
import { QueryState } from '../../../src/components/query-state';
import { Screen } from '../../../src/components/screen';
import { Segmented } from '../../../src/components/segmented';
import { useDraftWill } from '../../../src/features/inventory/api';

const DOCUMENTS = [
  { value: 'will', label: 'Draft will' },
  { value: 'notes', label: 'Notes for the lawyer' },
] as const;

/** A clear heading with room above it and a rule beneath, so each part of the document stands out. */
const SectionHeading = ({ children }: { children: string }) => (
  <View className="mt-6 gap-2 border-b border-primary-600/30 pb-2">
    <Text className="text-xl font-bold text-ink dark:text-white">{children}</Text>
  </View>
);

const AssetHeading = ({ children }: { children: string }) => (
  <Text className="mt-4 text-base font-semibold italic text-primary-700 dark:text-primary-200">
    {children}
  </Text>
);

const Paragraphs = ({ items }: { items: string[] }) => (
  <>
    {items.map((text, i) => (
      <Text key={`${i}-${text}`} className="text-base leading-7 text-ink/90 dark:text-white/90">
        {text}
      </Text>
    ))}
  </>
);

const Sections = ({ sections, numbered }: { sections: DraftSection[]; numbered: boolean }) => (
  <>
    {sections.map((section, index) => (
      <View key={section.heading} className="gap-3">
        <SectionHeading>{`${numbered ? `${index + 1}. ` : ''}${section.heading}`}</SectionHeading>
        <Paragraphs items={section.paragraphs} />
        {(section.subsections ?? []).map((sub, i) => (
          <View key={sub.heading} className="gap-2">
            <AssetHeading>{`${numbered ? `${index + 1}.` : ''}${i + 1} ${sub.heading}`}</AssetHeading>
            <Paragraphs items={sub.paragraphs} />
          </View>
        ))}
      </View>
    ))}
  </>
);

/** The draft as two separate documents, read-only, with the system share sheet to send one to a lawyer. */
const DraftScreen = () => {
  const [document, setDocument] = useState<DraftDocumentKey>('will');
  const draft = useDraftWill();

  const handleShare = () => {
    if (!draft.data) return;
    const title = document === 'will' ? 'Draft will' : 'Notes for the lawyer';
    void Share.share({ title, message: documentToText(draft.data, document) });
  };

  return (
    <Screen
      footer={
        <Button
          label={document === 'will' ? 'Share draft will' : 'Share notes'}
          onPress={handleShare}
          disabled={!draft.data}
          testID="share-draft"
        />
      }
    >
      <Segmented value={document} options={DOCUMENTS} onChange={setDocument} />
      <QueryState query={draft}>
        {data => (
          <>
            <View className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4">
              <Text className="text-sm text-ink dark:text-white">{data[document].banner}</Text>
            </View>
            {data.reference && (
              <Text className="text-xs text-ink/60 dark:text-white/60">
                Prepared on {data.preparedAt}. Reference {data.reference}.
              </Text>
            )}
            <Text className="text-center text-xl font-bold text-ink dark:text-white">
              {data[document].title}
            </Text>
            <Sections sections={data[document].sections} numbered={document === 'will'} />
          </>
        )}
      </QueryState>
    </Screen>
  );
};
export default DraftScreen;
