import { useState } from 'react';
import { toast } from 'sonner';
import type { DraftDocumentKey } from '@heartwood/shared';
import { getErrorMessage } from '../api/client';
import { Button } from '../components/button';
import { Heading } from '../components/layout';
import { PdfViewer } from '../components/pdf-viewer';
import { QueryState } from '../components/query-state';
import { Segmented } from '../components/segmented';
import { downloadDraft, openDraftPdf, useDraftPdf, useDraftWill } from '../features/api';

const DOCUMENTS = [
  { value: 'will', label: 'Draft will' },
  { value: 'notes', label: 'Notes for the lawyer' },
] as const;

/** The draft, as two separate documents, each shown as the PDF a lawyer would receive. */
export const DraftWillPage = () => {
  const [document, setDocument] = useState<DraftDocumentKey>('will');
  const draft = useDraftWill();
  const pdf = useDraftPdf(document);

  const run = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't open the document. Try again."));
    }
  };

  const name = draft.data?.testatorName ?? '';
  const label = DOCUMENTS.find(d => d.value === document)?.label ?? 'Draft';

  return (
    <>
      <Heading>Draft will</Heading>
      <Segmented
        label="Which document"
        value={document}
        options={DOCUMENTS}
        onChange={setDocument}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void run(() => downloadDraft(document, 'pdf', name))}>
          Download PDF
        </Button>
        <Button
          variant="secondary"
          onClick={() => void run(() => downloadDraft(document, 'docx', name))}
        >
          Download Word
        </Button>
        <Button variant="secondary" onClick={() => void run(() => openDraftPdf(document))}>
          Open to print
        </Button>
      </div>
      {draft.data?.reference && (
        <p className="text-sm text-ink/60 dark:text-white/60">
          Prepared on {draft.data.preparedAt}. Reference {draft.data.reference}: every page of the
          PDF carries it, so a lawyer can check a copy against ours.
        </p>
      )}
      {/* The pages scroll inside this pane, so the buttons above stay in view. */}
      <div
        aria-label={`${label}, scrollable`}
        className="h-[calc(100dvh-18rem)] min-h-96 overflow-y-auto rounded-xl border border-primary-600/20 bg-primary-600/5 p-4"
      >
        <QueryState query={pdf}>
          {data => <PdfViewer key={document} data={data} label={label} />}
        </QueryState>
      </div>
    </>
  );
};
