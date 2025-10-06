import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';
// Use public-served worker copied during postinstall
GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  const pageTexts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((it) => it.str);
    pageTexts.push(strings.join(' '));
  }
  return pageTexts.join('\n');
}
