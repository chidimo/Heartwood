import { AlignmentType, Document, HeadingLevel, Packer, PageBreak, Paragraph, TextRun } from 'docx';
import type { DraftSection, DraftWill } from '@heartwood/shared';

const body = (text: string) =>
  new Paragraph({ children: [new TextRun({ text, size: 24 })], spacing: { after: 160 } });

const bullet = (text: string) =>
  new Paragraph({ children: [new TextRun({ text, size: 22 })], bullet: { level: 0 } });

const heading = (text: string) =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 26 })],
    spacing: { before: 280, after: 120 },
  });

const willSection = (section: DraftSection, index: number) => [
  heading(`${index + 1}. ${section.heading}`),
  ...section.paragraphs.map(body),
];

/** The draft as a Word document, so the lawyer can edit it directly. */
export const renderDraftDocx = (draft: DraftWill): Promise<Buffer> => {
  const document = new Document({
    title: draft.title,
    sections: [
      {
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.TITLE,
            children: [new TextRun({ text: draft.title, bold: true, size: 32 })],
            spacing: { after: 240 },
          }),
          new Paragraph({
            children: [new TextRun({ text: draft.banner, italics: true, size: 22 })],
            shading: { fill: 'F3E9C6' },
            spacing: { after: 280 },
          }),
          ...draft.will.flatMap(willSection),
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: 'Notes for the reviewing lawyer (not part of the will)',
                bold: true,
              }),
            ],
          }),
          ...draft.notes.flatMap(section => [
            heading(section.heading),
            ...section.paragraphs.map(bullet),
          ]),
        ],
      },
    ],
  });
  return Packer.toBuffer(document);
};
