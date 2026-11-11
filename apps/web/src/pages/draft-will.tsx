import { useState } from 'react';
import { toast } from 'sonner';
import type { DraftSection } from '@heartwood/shared';
import { getErrorMessage } from '../api/client';
import { Button } from '../components/button';
import { Heading } from '../components/layout';
import { QueryState } from '../components/query-state';
import { downloadDraftWord, useDraftWill } from '../features/api';

const Clauses = ({ sections, numbered }: { sections: DraftSection[]; numbered: boolean }) => (
  <>
    {sections.map((section, index) => (
      <section key={section.heading} className="flex flex-col gap-2">
        <h3 className="font-semibold">
          {numbered ? `${index + 1}. ` : ''}
          {section.heading}
        </h3>
        {section.paragraphs.map((text, i) => (
          <p key={`${i}-${text}`} className="leading-relaxed">
            {text}
          </p>
        ))}
      </section>
    ))}
  </>
);

export const DraftWillPage = () => {
  const draft = useDraftWill();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadDraftWord();
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't download the draft. Try again."));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Heading>Draft will</Heading>
        <div className="flex gap-3">
          <Button onClick={() => void handleDownload()} loading={isDownloading}>
            Download Word document
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>
      <QueryState query={draft}>
        {data => (
          <div className="flex flex-col gap-6">
            <p className="rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm">
              {data.banner}
            </p>
            <article className="flex flex-col gap-5 rounded-xl border border-primary-600/20 p-6">
              <h2 className="text-center text-lg font-semibold">{data.title}</h2>
              <Clauses sections={data.will} numbered />
            </article>
            <article className="flex flex-col gap-5 rounded-xl border border-primary-600/20 p-6 print:break-before-page">
              <h2 className="text-lg font-semibold">
                Notes for the reviewing lawyer (not part of the will)
              </h2>
              <Clauses sections={data.notes} numbered={false} />
            </article>
          </div>
        )}
      </QueryState>
    </>
  );
};
