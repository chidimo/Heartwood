import { Share, Text, View } from 'react-native';
import { draftToText, type DraftSection } from '@heartwood/shared';
import { Button } from '../../../src/components/button';
import { QueryState } from '../../../src/components/query-state';
import { Screen } from '../../../src/components/screen';
import { useDraftWill } from '../../../src/features/inventory/api';

const Clauses = ({ sections, numbered }: { sections: DraftSection[]; numbered: boolean }) => (
  <>
    {sections.map((section, index) => (
      <View key={section.heading} className="gap-2">
        <Text className="text-base font-semibold text-ink dark:text-white">
          {numbered ? `${index + 1}. ` : ''}
          {section.heading}
        </Text>
        {section.paragraphs.map((text, i) => (
          <Text key={`${i}-${text}`} className="leading-6 text-ink/90 dark:text-white/90">
            {text}
          </Text>
        ))}
      </View>
    ))}
  </>
);

/** The draft will, read-only, with the system share sheet to send it to a lawyer. */
const DraftScreen = () => {
  const draft = useDraftWill();
  const handleShare = () => {
    if (!draft.data) return;
    void Share.share({ title: 'Draft will', message: draftToText(draft.data) });
  };

  return (
    <Screen
      footer={
        <Button
          label="Share draft"
          onPress={handleShare}
          disabled={!draft.data}
          testID="share-draft"
        />
      }
    >
      <QueryState query={draft}>
        {data => (
          <>
            <View className="rounded-xl border border-amber-500/50 bg-amber-500/10 p-4">
              <Text className="text-sm text-ink dark:text-white">{data.banner}</Text>
            </View>
            <Text className="text-center text-lg font-semibold text-ink dark:text-white">
              {data.title}
            </Text>
            <Clauses sections={data.will} numbered />
            <Text className="pt-4 text-lg font-semibold text-ink dark:text-white">
              Notes for the reviewing lawyer (not part of the will)
            </Text>
            <Clauses sections={data.notes} numbered={false} />
          </>
        )}
      </QueryState>
    </Screen>
  );
};
export default DraftScreen;
