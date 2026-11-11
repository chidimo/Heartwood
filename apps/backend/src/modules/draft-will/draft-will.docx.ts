import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import type { DraftDocument, DraftDocumentKey, DraftSection } from '@heartwood/shared';

const body = (text: string) =>
  new Paragraph({ children: [new TextRun({ text, size: 24 })], spacing: { after: 160 } });

const bullet = (text: string) =>
  new Paragraph({ children: [new TextRun({ text, size: 22 })], bullet: { level: 0 } });

const heading = (text: string, level: 'section' | 'asset') =>
  new Paragraph({
    heading: level === 'section' ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    children: [
      new TextRun({
        text,
        bold: true,
        italics: level === 'asset',
        size: level === 'section' ? 28 : 24,
      }),
    ],
    spacing: { before: level === 'section' ? 360 : 240, after: 140 },
    keepNext: true,
  });

const section = (s: DraftSection, number: string | null, bulleted: boolean) => [
  heading(number ? `${number}. ${s.heading}` : s.heading, 'section'),
  ...s.paragraphs.map(bulleted ? bullet : body),
  ...(s.subsections ?? []).flatMap((sub, i) => [
    heading(`${number ? `${number}.` : ''}${i + 1} ${sub.heading}`, 'asset'),
    ...sub.paragraphs.map(bulleted ? bullet : body),
  ]),
];

/** One document as a Word file, so the lawyer can edit it directly. */
export const renderDraftDocx = (
  document: DraftDocument,
  key: DraftDocumentKey,
  meta: { reference: string | null; preparedAt: string }
): Promise<Buffer> => {
  const prepared = `Prepared with Heartwood on ${meta.preparedAt}.`;
  const mark = meta.reference ? `${prepared} Reference ${meta.reference}.` : prepared;
  const file = new Document({
    title: document.title,
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({ children: [new TextRun({ text: mark, size: 16, color: '666666' })] }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({ children: [new TextRun({ text: mark, size: 16, color: '666666' })] }),
            ],
          }),
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.TITLE,
            children: [new TextRun({ text: document.title, bold: true, size: 32 })],
            spacing: { after: 240 },
          }),
          new Paragraph({
            children: [new TextRun({ text: document.banner, italics: true, size: 22 })],
            shading: { fill: 'F3E9C6' },
            spacing: { after: 280 },
          }),
          ...document.sections.flatMap((s, i) =>
            section(s, key === 'will' ? String(i + 1) : null, key === 'notes')
          ),
        ],
      },
    ],
  });
  return Packer.toBuffer(file);
};
