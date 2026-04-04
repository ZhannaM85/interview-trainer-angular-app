/**
 * Fills `readMoreLinks` on every question from a curated topic/subtopic → URL map.
 * Run: node scripts/merge-read-more-links.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const bilingualPath = path.join(root, 'src/assets/data/questions-bilingual.json');

/** @type {Record<string, { url: string; title: { en: string; ru: string } }>} */
const LINK_BY_TOPIC_SUBTOPIC = {
    // JavaScript
    'javascript/this': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this',
        title: { en: 'MDN — this', ru: 'MDN — this (англ.)' }
    },
    'javascript/closure': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures',
        title: { en: 'MDN — Closures', ru: 'MDN — Closures (англ.)' }
    },
    'javascript/closures': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures',
        title: { en: 'MDN — Closures', ru: 'MDN — Closures (англ.)' }
    },
    'javascript/scope': {
        url: 'https://developer.mozilla.org/en-US/docs/Glossary/Scope',
        title: { en: 'MDN — Scope', ru: 'MDN — Scope (англ.)' }
    },
    'javascript/variables': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let',
        title: { en: 'MDN — let / const / var', ru: 'MDN — let / const (англ.)' }
    },
    'javascript/functions': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions',
        title: { en: 'MDN — Functions', ru: 'MDN — Functions (англ.)' }
    },
    'javascript/arrays': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array',
        title: { en: 'MDN — Array', ru: 'MDN — Array (англ.)' }
    },
    'javascript/async': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function',
        title: { en: 'MDN — async function', ru: 'MDN — async function (англ.)' }
    },
    'javascript/event-loop': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop',
        title: { en: 'MDN — Event loop', ru: 'MDN — Event loop (англ.)' }
    },
    'javascript/hoisting': {
        url: 'https://developer.mozilla.org/en-US/docs/Glossary/Hoisting',
        title: { en: 'MDN — Hoisting', ru: 'MDN — Hoisting (англ.)' }
    },
    'javascript/equality': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness',
        title: { en: 'MDN — Equality', ru: 'MDN — Equality (англ.)' }
    },
    'javascript/arrow-functions': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions',
        title: { en: 'MDN — Arrow functions', ru: 'MDN — Arrow functions (англ.)' }
    },
    'javascript/prototype': {
        url: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/Object_prototypes',
        title: { en: 'MDN — Prototypes', ru: 'MDN — Prototypes (англ.)' }
    },
    'javascript/execution-context': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this',
        title: { en: 'MDN — this & context', ru: 'MDN — this (англ.)' }
    },
    'javascript/types': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures',
        title: { en: 'MDN — Data types', ru: 'MDN — Data types (англ.)' }
    },
    'javascript/memory': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management',
        title: { en: 'MDN — Memory management', ru: 'MDN — Memory (англ.)' }
    },
    'javascript/immutability': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax',
        title: { en: 'MDN — Spread & immutability', ru: 'MDN — Spread (англ.)' }
    },
    'javascript/debounce': {
        url: 'https://rxjs.dev/api/operators/debounceTime',
        title: { en: 'RxJS — debounceTime', ru: 'RxJS — debounceTime (англ.)' }
    },
    'javascript/throttle': {
        url: 'https://rxjs.dev/api/operators/throttleTime',
        title: { en: 'RxJS — throttleTime', ru: 'RxJS — throttleTime (англ.)' }
    },
    'javascript/objects': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object',
        title: { en: 'MDN — Object', ru: 'MDN — Object (англ.)' }
    },
    'javascript/spread': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Spread_syntax',
        title: { en: 'MDN — Spread syntax', ru: 'MDN — Spread (англ.)' }
    },
    'javascript/rest': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/rest_parameters',
        title: { en: 'MDN — Rest parameters', ru: 'MDN — Rest (англ.)' }
    },
    'javascript/modules': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules',
        title: { en: 'MDN — ES modules', ru: 'MDN — ES modules (англ.)' }
    },
    'javascript/strict-mode': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode',
        title: { en: 'MDN — Strict mode', ru: 'MDN — Strict mode (англ.)' }
    },
    'javascript/json': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON',
        title: { en: 'MDN — JSON', ru: 'MDN — JSON (англ.)' }
    },
    'javascript/deep-copy': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/structuredClone',
        title: { en: 'MDN — structuredClone', ru: 'MDN — structuredClone (англ.)' }
    },
    'javascript/set-map': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map',
        title: { en: 'MDN — Map & Set', ru: 'MDN — Map (англ.)' }
    },
    'javascript/set': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set',
        title: { en: 'MDN — Set', ru: 'MDN — Set (англ.)' }
    },
    'javascript/context': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this',
        title: { en: 'MDN — this', ru: 'MDN — this (англ.)' }
    },
    'javascript/execution': {
        url: 'https://developer.mozilla.org/en-US/docs/Glossary/Call_stack',
        title: { en: 'MDN — Call stack', ru: 'MDN — Call stack (англ.)' }
    },
    'javascript/performance': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/Performance',
        title: { en: 'MDN — Web performance', ru: 'MDN — Performance (англ.)' }
    },
    'javascript/dom': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model',
        title: { en: 'MDN — DOM', ru: 'MDN — DOM (англ.)' }
    },
    'javascript/browser': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API',
        title: { en: 'MDN — Web Storage', ru: 'MDN — Web Storage (англ.)' }
    },
    'javascript/security': {
        url: 'https://developer.mozilla.org/en-US/docs/Web/Security',
        title: { en: 'MDN — Web security', ru: 'MDN — Security (англ.)' }
    },

    // Angular
    'angular/change-detection': {
        url: 'https://angular.dev/guide/change-detection',
        title: { en: 'Angular — Change detection', ru: 'Angular — Change detection (англ.)' }
    },
    'angular/lifecycle': {
        url: 'https://angular.dev/guide/lifecycle',
        title: { en: 'Angular — Lifecycle', ru: 'Angular — Lifecycle (англ.)' }
    },
    'angular/di': {
        url: 'https://angular.dev/guide/di',
        title: { en: 'Angular — Dependency injection', ru: 'Angular — DI (англ.)' }
    },
    'angular/rxjs': {
        url: 'https://angular.dev/guide/rxjs',
        title: { en: 'Angular — RxJS', ru: 'Angular — RxJS (англ.)' }
    },
    'angular/components': {
        url: 'https://angular.dev/guide/components',
        title: { en: 'Angular — Components', ru: 'Angular — Components (англ.)' }
    },
    'angular/modules': {
        url: 'https://angular.dev/guide/ngmodules',
        title: { en: 'Angular — NgModules', ru: 'Angular — NgModules (англ.)' }
    },
    'angular/routing': {
        url: 'https://angular.dev/guide/routing',
        title: { en: 'Angular — Routing', ru: 'Angular — Routing (англ.)' }
    },
    'angular/pipes': {
        url: 'https://angular.dev/guide/pipes',
        title: { en: 'Angular — Pipes', ru: 'Angular — Pipes (англ.)' }
    },
    'angular/services': {
        url: 'https://angular.dev/guide/di/creating-injectable-services',
        title: { en: 'Angular — Services', ru: 'Angular — Services (англ.)' }
    },
    'angular/observables': {
        url: 'https://rxjs.dev/guide/observable',
        title: { en: 'RxJS — Observable', ru: 'RxJS — Observable (англ.)' }
    },
    'angular/forms': {
        url: 'https://angular.dev/guide/forms',
        title: { en: 'Angular — Forms', ru: 'Angular — Forms (англ.)' }
    },
    'angular/directives': {
        url: 'https://angular.dev/guide/directives',
        title: { en: 'Angular — Directives', ru: 'Angular — Directives (англ.)' }
    },
    'angular/zones': {
        url: 'https://angular.dev/guide/zone',
        title: { en: 'Angular — NgZone', ru: 'Angular — Zone (англ.)' }
    },
    'angular/http': {
        url: 'https://angular.dev/guide/http',
        title: { en: 'Angular — HttpClient', ru: 'Angular — HttpClient (англ.)' }
    },
    'angular/architecture': {
        url: 'https://angular.dev/overview',
        title: { en: 'Angular — Overview', ru: 'Angular — Overview (англ.)' }
    },
    'angular/signals': {
        url: 'https://angular.dev/guide/signals',
        title: { en: 'Angular — Signals', ru: 'Angular — Signals (англ.)' }
    },
    'angular/standalone': {
        url: 'https://angular.dev/guide/components/importing',
        title: { en: 'Angular — Standalone', ru: 'Angular — Standalone (англ.)' }
    },
    'angular/injector': {
        url: 'https://angular.dev/guide/di/injector',
        title: { en: 'Angular — Injector', ru: 'Angular — Injector (англ.)' }
    },
    'angular/providers': {
        url: 'https://angular.dev/guide/di/dependency-injection-providers',
        title: { en: 'Angular — Providers', ru: 'Angular — Providers (англ.)' }
    },
    'angular/lazy-loading': {
        url: 'https://angular.dev/guide/routing/lazy-loading',
        title: { en: 'Angular — Lazy loading', ru: 'Angular — Lazy loading (англ.)' }
    },
    'angular/trackby': {
        url: 'https://angular.dev/guide/templates/for-loop',
        title: { en: 'Angular — @for & track', ru: 'Angular — @for (англ.)' }
    },
    'angular/state': {
        url: 'https://angular.dev/guide/signals',
        title: { en: 'Angular — Signals & state', ru: 'Angular — Signals (англ.)' }
    },
    'angular/testing': {
        url: 'https://angular.dev/guide/testing',
        title: { en: 'Angular — Testing', ru: 'Angular — Testing (англ.)' }
    },
    'angular/performance': {
        url: 'https://angular.dev/best-practices/runtime-performance',
        title: { en: 'Angular — Runtime performance', ru: 'Angular — Performance (англ.)' }
    }
};

function main() {
    const raw = fs.readFileSync(bilingualPath, 'utf8');
    /** @type {unknown[]} */
    const data = JSON.parse(raw);
    const missing = new Set();

    for (const row of data) {
        if (typeof row !== 'object' || row === null || !('topic' in row) || !('subtopic' in row)) {
            continue;
        }
        const topic = String(/** @type {{ topic: string }} */ (row).topic).toLowerCase();
        const subtopic = String(/** @type {{ subtopic: string }} */ (row).subtopic).toLowerCase();
        const key = `${topic}/${subtopic}`;
        const link = LINK_BY_TOPIC_SUBTOPIC[key];
        if (!link) {
            missing.add(key);
            continue;
        }
        /** @type {{ readMoreLinks: typeof link[] }} */
        const o = row;
        o.readMoreLinks = [{ url: link.url, title: { en: link.title.en, ru: link.title.ru } }];
    }

    if (missing.size > 0) {
        console.error('Missing LINK_BY_TOPIC_SUBTOPIC entries:');
        for (const k of [...missing].sort()) {
            console.error(' ', k);
        }
        process.exit(1);
    }

    fs.writeFileSync(bilingualPath, `${JSON.stringify(data, null, 4)}\n`, 'utf8');
    console.log(`Updated ${data.length} questions with readMoreLinks in ${path.relative(root, bilingualPath)}`);
}

main();
