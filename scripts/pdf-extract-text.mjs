/**
 * Extract plain text from a PDF (Node). Does not OCR scanned pages.
 * Usage: node scripts/pdf-extract-text.mjs <path-to.pdf> [-o out.txt]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFParse } from 'pdf-parse';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function printUsage() {
    console.error('Usage: node scripts/pdf-extract-text.mjs <path-to.pdf> [-o out.txt]');
    process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 1) {
    printUsage();
}

let outPath = null;
const pdfArg = [];
for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '-o' && args[i + 1]) {
        outPath = args[i + 1];
        i += 1;
    } else if (!args[i].startsWith('-')) {
        pdfArg.push(args[i]);
    }
}

if (pdfArg.length !== 1) {
    printUsage();
}

const pdfPath = path.isAbsolute(pdfArg[0]) ? pdfArg[0] : path.join(process.cwd(), pdfArg[0]);

if (!fs.existsSync(pdfPath)) {
    console.error(`File not found: ${pdfPath}`);
    process.exit(1);
}

const buf = fs.readFileSync(pdfPath);

try {
    const parser = new PDFParse({ data: buf });
    const result = await parser.getText();
    await parser.destroy();
    const text = result.text ?? '';
    if (outPath) {
        const absOut = path.isAbsolute(outPath) ? outPath : path.join(process.cwd(), outPath);
        fs.mkdirSync(path.dirname(absOut), { recursive: true });
        fs.writeFileSync(absOut, text, 'utf8');
        console.error(`Wrote ${text.length} characters to ${absOut}`);
    } else {
        process.stdout.write(text);
    }
} catch (e) {
    console.error('Failed to parse PDF:', e instanceof Error ? e.message : e);
    process.exit(1);
}
