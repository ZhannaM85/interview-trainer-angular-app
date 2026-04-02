/**
 * Merges Russian strings from `russian-locale-strings.mjs` into `questions-bilingual.json`.
 * Run after `build-code-examples.mjs` if you need code examples refreshed, then re-run this.
 * Run: node scripts/apply-russian-translations.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { RU_STRINGS } from './russian-locale-strings.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const bilingualPath = path.join(root, 'src/assets/data/questions-bilingual.json');

function main() {
    const bilingual = JSON.parse(fs.readFileSync(bilingualPath, 'utf8'));

    if (RU_STRINGS.length !== bilingual.length) {
        throw new Error(
            `RU_STRINGS length ${RU_STRINGS.length} !== bilingual length ${bilingual.length}`
        );
    }

    for (let i = 0; i < bilingual.length; i++) {
        const row = bilingual[i];
        const ru = RU_STRINGS[i];
        if (row.id !== ru.id) {
            throw new Error(`ID mismatch at index ${i}: bilingual id=${row.id}, ru id=${ru.id}`);
        }
        row.text.ru = {
            question: ru.question,
            weakAnswer: ru.weakAnswer,
            technicalAnswer: ru.technicalAnswer,
            interviewAnswer: ru.interviewAnswer
        };
    }

    fs.writeFileSync(bilingualPath, JSON.stringify(bilingual, null, 4) + '\n', 'utf8');
    console.log('Applied Russian strings for', bilingual.length, 'questions.');
}

main();
