import path from 'node:path';
import PDFDocument from 'pdfkit';
import type { DraftDocument, DraftDocumentKey, DraftSection } from '@heartwood/shared';

// DejaVu Serif covers the Latin letters and signs Nigerian names and amounts use (ọ, ẹ, ṣ, ₦), which the
// built-in PDF fonts do not.
const FONT_DIR = path.dirname(require.resolve('dejavu-fonts-ttf/ttf/DejaVuSerif.ttf'));
const FONTS = {
  regular: path.join(FONT_DIR, 'DejaVuSerif.ttf'),
  bold: path.join(FONT_DIR, 'DejaVuSerif-Bold.ttf'),
  italic: path.join(FONT_DIR, 'DejaVuSerif-Italic.ttf'),
  boldItalic: path.join(FONT_DIR, 'DejaVuSerif-BoldItalic.ttf'),
};

const MARGIN = { top: 72, bottom: 84, left: 72, right: 72 };
const WATERMARK_SUBTITLE: Record<DraftDocumentKey, string> = {
  will: 'DRAFT: NOT A VALID WILL',
  notes: 'NOTES FOR THE LAWYER',
};

interface Meta {
  reference: string | null;
  preparedAt: string;
}

const needRoom = (doc: PDFKit.PDFDocument, height: number) => {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom) doc.addPage();
};

const drawBanner = (doc: PDFKit.PDFDocument, text: string) => {
  const width = doc.page.width - MARGIN.left - MARGIN.right;
  doc.font('italic').fontSize(9.5);
  const height = doc.heightOfString(text, { width: width - 20 }) + 20;
  const top = doc.y;
  doc.roundedRect(MARGIN.left, top, width, height, 4).fill('#F3E9C6');
  doc.fillColor('#333333').text(text, MARGIN.left + 10, top + 10, { width: width - 20 });
  doc.y = top + height + 14;
  doc.x = MARGIN.left;
};

const drawHeading = (doc: PDFKit.PDFDocument, text: string, level: 1 | 2) => {
  needRoom(doc, level === 1 ? 90 : 70);
  doc.moveDown(level === 1 ? 1.1 : 0.7);
  doc.fillColor('#111111');
  if (level === 1) {
    doc.font('bold').fontSize(13).text(text, MARGIN.left, doc.y);
    const y = doc.y + 3;
    doc
      .moveTo(MARGIN.left, y)
      .lineTo(doc.page.width - MARGIN.right, y)
      .lineWidth(0.6)
      .strokeColor('#999999')
      .stroke();
    doc.y = y + 8;
  } else {
    doc.font('boldItalic').fontSize(11.5).text(text, MARGIN.left, doc.y);
    doc.y += 3;
  }
  doc.x = MARGIN.left;
};

const drawParagraphs = (doc: PDFKit.PDFDocument, paragraphs: string[], bulleted: boolean) => {
  doc.font('regular').fontSize(11).fillColor('#111111');
  for (const text of paragraphs) {
    needRoom(doc, 40);
    doc.text(bulleted ? `•  ${text}` : text, MARGIN.left, doc.y, {
      align: bulleted ? 'left' : 'justify',
      lineGap: 3,
      indent: 0,
    });
    doc.moveDown(0.55);
  }
};

const drawSection = (
  doc: PDFKit.PDFDocument,
  section: DraftSection,
  number: string | null,
  bulleted: boolean
) => {
  drawHeading(doc, number ? `${number}. ${section.heading}` : section.heading, 1);
  drawParagraphs(doc, section.paragraphs, bulleted);
  (section.subsections ?? []).forEach((sub, i) => {
    drawHeading(doc, `${number ? `${number}.` : ''}${i + 1} ${sub.heading}`, 2);
    drawParagraphs(doc, sub.paragraphs, bulleted);
  });
};

/** The mark on every page that says this copy came from the app, and a footer to check it by. */
const stamp = (
  doc: PDFKit.PDFDocument,
  key: DraftDocumentKey,
  meta: Meta,
  page: number,
  of: number
) => {
  const { width, height } = doc.page;
  doc.save();
  doc.rotate(-40, { origin: [width / 2, height / 2] });
  doc.fillColor('#000000').fillOpacity(0.06);
  doc
    .font('bold')
    .fontSize(62)
    .text('HEARTWOOD', 0, height / 2 - 50, {
      width,
      align: 'center',
      lineBreak: false,
    });
  doc.fontSize(20).text(WATERMARK_SUBTITLE[key], 0, height / 2 + 24, {
    width,
    align: 'center',
    lineBreak: false,
  });
  doc.restore();

  // The footer sits in the bottom margin, so lift the margin or pdfkit starts a new page for it.
  doc.page.margins.bottom = 0;
  doc.fillColor('#666666').fillOpacity(1).font('regular').fontSize(8);
  const textWidth = width - MARGIN.left - MARGIN.right - 70;
  doc.text(`Prepared with Heartwood on ${meta.preparedAt}.`, MARGIN.left, height - 54, {
    width: textWidth,
    lineBreak: false,
  });
  if (meta.reference) {
    doc.text(`Reference ${meta.reference}`, MARGIN.left, height - 42, {
      width: textWidth,
      lineBreak: false,
    });
  }
  doc.text(`Page ${page} of ${of}`, width - MARGIN.right - 70, height - 54, {
    width: 70,
    align: 'right',
    lineBreak: false,
  });
};

/** One document as a multipage PDF, every page marked as a copy made by Heartwood. */
export const renderDraftPdf = (
  document: DraftDocument,
  key: DraftDocumentKey,
  meta: Meta
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: MARGIN,
      bufferPages: true,
      info: {
        Title: document.title,
        Author: 'Heartwood',
        Subject: meta.reference ? `Reference ${meta.reference}` : 'Draft will',
      },
    });
    doc.registerFont('regular', FONTS.regular);
    doc.registerFont('bold', FONTS.bold);
    doc.registerFont('italic', FONTS.italic);
    doc.registerFont('boldItalic', FONTS.boldItalic);

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.font('bold').fontSize(15).fillColor('#111111');
    doc.text(document.title, MARGIN.left, MARGIN.top, {
      align: 'center',
      width: doc.page.width - MARGIN.left - MARGIN.right,
    });
    doc.moveDown(0.8);
    drawBanner(doc, document.banner);
    document.sections.forEach((section, index) =>
      drawSection(doc, section, key === 'will' ? String(index + 1) : null, key === 'notes')
    );

    const { start, count } = doc.bufferedPageRange();
    for (let i = 0; i < count; i += 1) {
      doc.switchToPage(start + i);
      stamp(doc, key, meta, i + 1, count);
    }
    doc.end();
  });
