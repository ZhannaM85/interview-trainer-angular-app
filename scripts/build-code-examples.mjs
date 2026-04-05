/**
 * Generates `codeExample` for each question id and merges into `questions-bilingual.json`.
 * Run: node scripts/build-code-examples.mjs
 *
 * Russian question text lives in `scripts/russian-locale-strings.mjs`; after changing English
 * prompts in `questions-updated.json`, run `node scripts/apply-russian-translations.mjs` so
 * `text.ru` stays aligned (edit RU_STRINGS when copy changes).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const bilingualPath = path.join(root, 'src/assets/data/questions-bilingual.json');
const updatedPath = path.join(root, 'src/assets/data/questions-updated.json');

/** @param {number} id @param {string} subtopic @param {string} question */
function snippetFor(id, subtopic, question) {
    const s = (subtopic || '').toLowerCase();
    const q = question || '';

    // Puzzle / output questions: code is usually after a blank line in the prompt
    if (id >= 101 && id <= 120) {
        const parts = q.split(/\n\n+/);
        if (parts.length >= 2) {
            return parts
                .slice(1)
                .join('\n\n')
                .trim();
        }
    }

    const byId = SNIPPET_OVERRIDES[id];
    if (byId) {
        return byId;
    }

    const bySub = SUBTOPIC_SNIPPETS[s];
    if (bySub) {
        return bySub;
    }

    return `// ${q}\n// See interview answer above for the key idea.`;
}

/** Topic-focused defaults when id has no override */
const SUBTOPIC_SNIPPETS = {
    this: `'use strict';\nconst obj = { name: 'Ann', greet() { return this.name; } };\nobj.greet();\nfunction loose() { return this; }\nloose(); // undefined in strict mode`,
    scope: `const x = 1;\nfunction f() {\n    const y = 2;\n    if (true) {\n        let z = 3;\n    }\n}`,
    variables: `function demo() {\n    console.log(a); // undefined (hoisted)\n    var a = 1;\n    if (true) {\n        let b = 2;\n    }\n}`,
    functions: `function add(a, b) {\n    return a + b;\n}\nconst twice = (x) => x * 2;`,
    arrays: `const nums = [1, 2, 3];\nconst doubled = nums.map((n) => n * 2);\nconst sum = nums.reduce((a, n) => a + n, 0);`,
    async: `async function load() {\n    const res = await fetch('/api');\n    return res.json();\n}`,
    'event-loop': `console.log('sync');\nqueueMicrotask(() => console.log('micro'));\nsetTimeout(() => console.log('macro'), 0);`,
    hoisting: `console.log(x); // undefined\nvar x = 1;\nconsole.log(y); // ReferenceError\nlet y = 2;`,
    'change-detection': `@Component({ /* ... */ })\nexport class Demo {\n    value = signal(0);\n}`,
    lifecycle: `export class Page implements OnInit, OnDestroy {\n    ngOnInit() {}\n    ngOnDestroy() {}\n}`,
    di: `@Injectable({ providedIn: 'root' })\nexport class Api {}\n\nexport class Page {\n    private api = inject(Api);\n}`,
    rxjs: `import { Observable } from 'rxjs';\n\nconst stream$ = new Observable((sub) => {\n    sub.next(1);\n    sub.complete();\n});`,
    components: `@Component({\n    selector: 'app-card',\n    template: '<p>{{ title() }}</p>',\n})\nexport class Card {\n    title = input('');\n}`,
    modules: `@NgModule({\n    declarations: [FeatureComponent],\n    imports: [CommonModule],\n})\nexport class FeatureModule {}`,
    routing: `const routes: Routes = [\n    { path: 'home', component: HomeComponent },\n];`,
    pipes: `@Component({\n    template: '{{ price | currency }}',\n})\nexport class Shop {}`,
    equality: `console.log(0 == '0'); // true\nconsole.log(0 === '0'); // false`,
    'arrow-functions': `const obj = {\n    name: 'x',\n    classic() { return this.name; },\n    arrow: () => this.name,\n};`,
    services: `@Injectable({ providedIn: 'root' })\nexport class UserService {\n    getUsers() {\n        return this.http.get('/users');\n    }\n}`,
    observables: `const obs$ = of(1, 2, 3);\nobs$.subscribe((v) => console.log(v));`,
    memory: `let big = new Array(1e6).fill(0);\nbig = null; // allow GC when unreachable`,
    forms: `@Component({\n    template:\n        '<form [formGroup]="form">...</form>',\n})\nexport class Login {\n    form = this.fb.group({ email: [''] });\n    constructor(private fb: FormBuilder) {}\n}`,
    prototype: `function Person(name) {\n    this.name = name;\n}\nPerson.prototype.greet = function () {\n    return 'Hi, ' + this.name;\n};`,
    'execution-context': `function foo() {\n    console.log(this);\n}\nfoo();\nconst bar = { m: foo };\nbar.m();`,
    directives: `@Directive({ selector: '[appHighlight]' })\nexport class Highlight {\n    @HostBinding('style.background') bg = 'yellow';\n}`,
    types: `const n = 42;\nconst s = 'hi';\nconst sym = Symbol('id');`,
    zones: `this.ngZone.runOutsideAngular(() => {\n    window.addEventListener('scroll', onScroll);\n});`,
    http: `this.http.get<User[]>('/api/users').subscribe((users) => (this.users = users));`,
    immutability: `const next = { ...user, name: 'New' };\nconst arr = [...items, item];`,
    performance: `@for (item of items(); track item.id) {\n    <span>{{ item.label }}</span>\n}`,
    debounce: `fromEvent(input, 'input')\n    .pipe(debounceTime(300))\n    .subscribe((e) => search(e.target.value));`,
    throttle: `fromEvent(window, 'scroll')\n    .pipe(throttleTime(100))\n    .subscribe(onScroll);`,
    objects: `const { name, ...rest } = user;\nconst copy = { ...user, age: 30 };`,
    spread: `const merged = { ...defaults, ...options };\nconst all = [...a, ...b];`,
    rest: `function sum(...nums: number[]) {\n    return nums.reduce((a, n) => a + n, 0);\n}`,
    'es-modules': `export function api() {}\nimport { api } from './api.js';`,
    'strict-mode': `'use strict';\nundeclared = 1; // ReferenceError`,
    json: `const obj = { ok: true };\nJSON.stringify(obj);\nJSON.parse('{"ok":true}');`,
    'deep-copy': `const shallow = { ...nested };\nconst deep = structuredClone(nested);`,
    'set-map': `const m = new Map([[1, 'a']]);\nm.set({}, 'obj-key');\nconst o = { [Symbol('s')]: 1 };`,
    set: `const s = new Set([1, 1, 2]);\ns.add(3);`,
    signals: `const count = signal(0);\nconst doubled = computed(() => count() * 2);\ncount.update((c) => c + 1);`,
    standalone: `@Component({\n    selector: 'app-root',\n    imports: [RouterOutlet],\n    template: '<router-outlet />',\n})\nexport class App {}`,
    injector: `const parent = Injector.create({ providers: [{ provide: TOKEN, useValue: 1 }] });`,
    providers: `{ provide: ApiService, useClass: MockApiService }`,
    'lazy-loading': `{\n    path: 'admin',\n    loadChildren: () => import('./admin/routes').then((m) => m.routes),\n}`,
    trackby: `@for (item of items; track trackById($index, item)) {\n    <li>{{ item.name }}</li>\n}\ntrackById(_: number, item: Item) {\n    return item.id;\n}`,
    architecture: `@Component({\n    selector: 'app-shell',\n    template: '<app-header /><router-outlet />',\n})\nexport class Shell {}`,
    context: `const obj = { name: 'Ann' };\nconst fn = () => this;\nconst bound = fn.bind(obj);`,
    execution: `function a() {\n    b();\n}\nfunction b() {}\na(); // call stack: a -> b`,
    state: `@Injectable({ providedIn: 'root' })\nexport class Store {\n    private state = signal<State>(initial);\n}`,
    testing: `describe('Math', () => {\n    it('adds', () => {\n        expect(add(1, 2)).toBe(3);\n    });\n});`,
    dom: `const el = document.querySelector('#app');\nel?.addEventListener('click', onClick);`,
    browser: `localStorage.setItem('key', 'value');\nconst v = sessionStorage.getItem('temp');`,
    security: `element.textContent = userInput; // safer than innerHTML for plain text`,
    closures: `function makeCounter() {\n    let n = 0;\n    return () => ++n;\n}`,
};

/** Fine-grained snippets where subtopic default is wrong */
const SNIPPET_OVERRIDES = {
    2: `function outer() {\n    let count = 0;\n    return function inner() {\n        return ++count;\n    };\n}\nconst inc = outer();\ninc(); // 1`,
    5: `function greet() {\n    return this.name;\n}\nconst bound = greet.bind({ name: 'Ann' });\nbound();`,
    6: `function sum(a, b) {\n    return a + b;\n}\nsum.call(null, 1, 2);\nsum.apply(null, [1, 2]);\nconst later = sum.bind(null, 1);`,
    7: `[1, 2, 3].map((x) => x * 2);\n[1, 2, 3].forEach((x) => console.log(x));`,
    8: `const p = fetch('/api').then((r) => r.json());\nPromise.resolve(1).then(console.log);`,
    9: `// macrotasks: setTimeout, I/O\n// microtasks: Promise, queueMicrotask`,
    11: `@Component({ /* ... */ })\nexport class Demo {\n    cdr = inject(ChangeDetectorRef);\n}`,
    12: `export class Page implements OnInit {\n    ngOnInit() {\n        this.load();\n    }\n}`,
    13: `@Injectable({ providedIn: 'root' })\nexport class Clock {}\n\nexport class App {\n    clock = inject(Clock);\n}`,
    14: `import { map, filter } from 'rxjs/operators';\n\nof(1, 2, 3).pipe(map((x) => x * 2));`,
    15: `@Component({\n    selector: 'app-card',\n    templateUrl: './card.html',\n})\nexport class Card {}`,
    16: `@NgModule({\n    imports: [BrowserModule],\n    bootstrap: [AppComponent],\n})\nexport class AppModule {}`,
    17: `RouterModule.forRoot([\n    { path: '', component: HomeComponent },\n    { path: '**', redirectTo: '' },\n])`,
    18: `@Component({\n    template: '{{ today | date }}',\n})\nexport class Clock {\n    today = new Date();\n}`,
    19: `console.log(null == undefined); // true\nconsole.log(null === undefined); // false`,
    20: `const add = (a, b) => a + b;\nconst nums = [1, 2, 3];\nconst doubled = nums.map((n) => n * 2);`,
    21: `@Injectable({ providedIn: 'root' })\nexport class Api {\n    get() {\n        return this.http.get('/x');\n    }\n}`,
    22: `const o$ = new Observable<number>((sub) => {\n    sub.next(1);\n    sub.complete();\n});`,
    23: `async function run() {\n    const x = await Promise.resolve(1);\n    return x + 1;\n}`,
    24: `// GC frees unreachable objects\nlet ref = { big: new Array(1e6) };\nref = null;`,
    25: `@Component({\n    template: '<form [formGroup]="f">',\n})\nexport class Reactive {}\n\n@Component({\n    template: '<form #f="ngForm">',\n})\nexport class TemplateDriven {}`,
    26: `@Component({\n    changeDetection: ChangeDetectionStrategy.OnPush,\n})\nexport class Fast {}`,
    27: `const parent = { type: 'parent' };\nconst child = Object.create(parent);\nchild.type; // inherited`,
    28: `function outer() {\n    const x = 1;\n    function inner() {\n        return x;\n    }\n    return inner;\n}`,
    29: `@Directive({ selector: '[appTooltip]' })\nexport class Tooltip {}`,
    30: `@Component({\n    template: '<p *ngIf="show">Hi</p><p [class.active]="on">',\n})\nexport class Demo {}`,
    31: `const a = 'text';\nconst b = 42;\nconst c = true;\nconst d = Symbol('id');`,
    32: `console.log('5' - 2); // 3 (coerced)\nconsole.log(Number('5'));`,
    33: `NgZone.runOutsideAngular(() => {\n    chart.update();\n});`,
    34: `this.http.post('/login', body).subscribe({\n    next: (r) => console.log(r),\n});`,
    35: `function withLog(fn) {\n    return (...args) => {\n        console.log(args);\n        return fn(...args);\n    };\n}`,
    36: `const next = { ...state, count: state.count + 1 };`,
    37: `@Component({\n    changeDetection: ChangeDetectionStrategy.OnPush,\n})\nexport class Leaf {\n    data = input.required<Item>();\n}`,
    38: `function debounce(fn, ms) {\n    let t;\n    return (...a) => {\n        clearTimeout(t);\n        t = setTimeout(() => fn(...a), ms);\n    };\n}`,
    39: `function throttle(fn, ms) {\n    let last = 0;\n    return (...a) => {\n        const n = Date.now();\n        if (n - last >= ms) {\n            last = n;\n            fn(...a);\n        }\n    };\n}`,
    40: `@Component({\n    selector: 'app-container',\n    template: '<app-presenter [data]="vm()" />',\n})\nexport class Smart {\n    vm = signal(load());\n}`,
    41: `const { name, age } = user;\nconst { x, ...rest } = point;`,
    42: `const [first, second] = pair;\nconst [a, , c] = triple;`,
    43: `const all = [...a, ...b];\nconst cfg = { ...defaults, ...opts };`,
    44: `function sum(...nums) {\n    return nums.reduce((a, n) => a + n, 0);\n}`,
    45: `export const PI = 3.14;\nimport { PI } from './math.js'; // ES modules`,
    46: `'use strict';\nx = 1; // ReferenceError if x undeclared`,
    47: `const payload = { ok: true, n: 1 };\nJSON.stringify(payload);`,
    48: `const a = { nested: { x: 1 } };\nconst b = { ...a };\nb.nested.x = 2; // a.nested.x also 2 (shallow)`,
    49: `const m = new Map();\nm.set(1, 'one');\nm.set({}, 'key');`,
    50: `const s = new Set([1, 2, 2, 3]);\ns.has(2);`,
    51: `const count = signal(0);\nconst label = computed(() => 'n=' + count());`,
    52: `const s = signal(1);\nconst o$ = interval(1000); // async stream`,
    53: `@Component({\n    standalone: true,\n    imports: [CommonModule],\n    template: '<p>hi</p>',\n})\nexport class Hi {}`,
    54: `const injector = Injector.create({\n    providers: [{ provide: API, useClass: HttpApi }],\n});`,
    55: `bootstrapApplication(App, {\n    providers: [provideHttpClient()],\n});`,
    56: `// route lazy loads feature bundle\nloadChildren: () => import('./admin/admin.routes')`,
    57: `@for (u of users(); track u.id) {\n    <li>{{ u.name }}</li>\n}`,
    58: `@Pipe({ name: 'double', pure: true })\nexport class DoublePipe implements PipeTransform {\n    transform(v: number) {\n        return v * 2;\n    }\n}`,
    59: `const email = new FormControl('', { validators: [Validators.required] });`,
    60: `const form = new FormGroup({\n    email: new FormControl(''),\n    pwd: new FormControl(''),\n});`,
    61: `queueMicrotask(() => console.log('micro'));\nsetTimeout(() => console.log('macro'), 0);`,
    62: `async function load() {\n    try {\n        const r = await fetch('/a');\n        return await r.json();\n    } catch (e) {\n        console.error(e);\n    }\n}`,
    63: `function makeApi(secret) {\n    return {\n        getKey() {\n            return secret;\n        },\n    };\n}`,
    64: `const sub = interval(1000).subscribe();\n// on destroy:\nsub.unsubscribe();`,
    65: `const obj = {\n    name: 'Ann',\n    greet: () => this,\n};`,
    66: `function a() {\n    b();\n}\nfunction b() {\n    c();\n}\nfunction c() {}`,
    67: `function recurse() {\n    recurse();\n}\nrecurse(); // stack overflow`,
    68: `Promise.all([p1, p2]).then(([a, b]) => console.log(a, b));`,
    69: `Promise.race([slow, fast]).then((v) => console.log(v));`,
    70: `[1, 2, 3].reduce((acc, n) => acc + n, 0);`,
    71: `// Events, XHR/fetch, timers (via Zone.js) schedule CD`,
    72: `this.cdr.detectChanges();\n// or markForCheck() with OnPush`,
    73: `this.zone.runOutsideAngular(() => heavyWork());`,
    74: `const s = new Subject<number>();\ns.subscribe((v) => console.log(v));\ns.next(1);`,
    75: `const b = new BehaviorSubject(0);\nb.subscribe((v) => console.log(v)); // last value replay`,
    76: `search$\n    .pipe(switchMap((q) => this.http.get('/search', { params: { q } })))\n    .subscribe();`,
    77: `of(1, 2, 3).pipe(mergeMap((id) => this.get$(id)));`,
    78: `input$.pipe(debounceTime(300)).subscribe(onQuery);`,
    79: `const sub = stream$.subscribe();\n// later\nsub.unsubscribe();`,
    80: `search$.pipe(switchMap((q) => api.search(q))).subscribe();`,
    81: `console.log(NaN === NaN); // false\nNumber.isNaN(NaN); // true`,
    82: `console.log(typeof null); // "object" (legacy)`,
    83: `const o = Object.freeze({ x: 1 });\no.x = 2; // silent fail in non-strict`,
    84: `const o = Object.seal({ x: 1 });\ndelete o.x; // false`,
    85: `const add = (a) => (b) => a + b;\nconst add2 = add(2);\nadd2(3); // 5`,
    86: `function mul(a, b) {\n    return a * b;\n}\nconst double = mul.bind(null, 2);\ndouble(4); // 8`,
    87: `@Injectable({ providedIn: 'root' })\nexport class AppFacade {\n    load() {\n        return this.http.get('/x');\n    }\n}`,
    88: `const store = signal<State>(initial);\nconst name = computed(() => store().user.name);`,
    89: `// NgRx: single store, actions, reducers, effects`,
    90: `it('adds numbers', () => expect(add(1, 2)).toBe(3));`,
    91: `TestBed.configureTestingModule({ imports: [MyComp] });\nconst fixture = TestBed.createComponent(MyComp);`,
    92: `function fib(n, memo = {}) {\n    if (n in memo) return memo[n];\n    memo[n] = n <= 1 ? n : fib(n - 1, memo) + fib(n - 2, memo);\n    return memo[n];\n}`,
    93: `// O(n) single loop vs O(n^2) nested loops`,
    94: `// O(1) constant, O(n) linear, O(log n) binary search`,
    95: `document.querySelectorAll('.item');`,
    96: `list.addEventListener('click', (e) => {\n    if (e.target.matches('button')) handle(e);\n});`,
    97: `localStorage.setItem('theme', 'dark');\nlocalStorage.getItem('theme');`,
    98: `sessionStorage.setItem('tab', '1');\n// cleared when tab closes`,
    99: `div.textContent = userHtml; // avoid innerHTML for untrusted`,
    100: `fetch('https://api.example.com/data', {\n    credentials: 'include',\n});`,
};

function main() {
    const bilingual = JSON.parse(fs.readFileSync(bilingualPath, 'utf8'));
    const updated = JSON.parse(fs.readFileSync(updatedPath, 'utf8'));
    const byId = new Map(updated.map((row) => [row.id, row]));

    for (const row of bilingual) {
        const u = byId.get(row.id);
        const sub = u?.subtopic ?? row.subtopic;
        const q = u?.question ?? '';
        row.codeExample = snippetFor(row.id, sub, q);
    }

    fs.writeFileSync(bilingualPath, JSON.stringify(bilingual, null, 4) + '\n', 'utf8');
    console.log('Wrote codeExample for', bilingual.length, 'questions to questions-bilingual.json');
}

main();
