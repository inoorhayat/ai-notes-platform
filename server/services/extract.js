import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';

// pdf-parse's index file runs a debug self-test on import, so load the core file directly.
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

export async function extractText(filePath, fileName) {
  const buffer = await fs.readFile(filePath);
  if (path.extname(fileName).toLowerCase() === '.pdf') {
    const data = await pdfParse(buffer);
    return data.text || '';
  }
  return buffer.toString('utf8');
}
