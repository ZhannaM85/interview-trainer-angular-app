/** Russian UI copy for each question id (order must match questions-bilingual.json). */
export const RU_STRINGS = [
    {
        id: 1,
        question: "Что такое «this» в JavaScript?",
        weakAnswer: "Ссылается на объект… зависит от контекста.",
        technicalAnswer:
            "«this» указывает на контекст выполнения функции и зависит от того, как она вызвана.",
        interviewAnswer:
            "«this» зависит от способа вызова: в методе объекта это сам объект; в обычной функции в strict mode — undefined."
    },
    {
        id: 2,
        question: "Что такое замыкание (closure)?",
        weakAnswer: "Функция внутри другой функции.",
        technicalAnswer: "Замыкание — это функция, которая сохраняет доступ к своей лексической области видимости.",
        interviewAnswer:
            "Замыкание «помнит» переменные внешней функции даже после того, как та уже завершилась."
    },
    {
        id: 3,
        question: "Что такое область видимости (scope) в JavaScript?",
        weakAnswer: "Где существуют переменные.",
        technicalAnswer: "Область видимости определяет, где переменные доступны в коде.",
        interviewAnswer:
            "Scope задаёт, откуда можно обратиться к переменной: глобальная, функциональная и блочная области."
    },
    {
        id: 4,
        question: "Чем отличаются var, let и const?",
        weakAnswer: "Это все переменные.",
        technicalAnswer: "var ограничена функцией, let и const — блоком.",
        interviewAnswer:
            "var — function-scoped, let и const — block-scoped; const нельзя переназначить, let можно."
    },
    {
        id: 5,
        question: "Что делает bind()?",
        weakAnswer: "Привязывает this.",
        technicalAnswer: "bind создаёт новую функцию с фиксированным значением this.",
        interviewAnswer:
            "bind возвращает новую функцию с постоянно заданным this, чтобы управлять контекстом вызова."
    },
    {
        id: 6,
        question: "Чем отличаются call, apply и bind?",
        weakAnswer: "Они похожи.",
        technicalAnswer: "call и apply сразу вызывают функцию, bind возвращает новую функцию.",
        interviewAnswer:
            "call и apply выполняют функцию немедленно: call — аргументы по одному, apply — массивом; bind только возвращает обёртку без вызова."
    },
    {
        id: 7,
        question: "Чем отличаются map и forEach?",
        weakAnswer: "Оба что-то перебирают.",
        technicalAnswer: "map возвращает новый массив, forEach — нет.",
        interviewAnswer:
            "map строит новый массив с преобразованными элементами; forEach только выполняет побочные эффекты для каждого элемента."
    },
    {
        id: 8,
        question: "Что такое Promise?",
        weakAnswer: "Что-то асинхронное.",
        technicalAnswer: "Promise представляет результат асинхронной операции.",
        interviewAnswer:
            "Promise отражает итог асинхронной работы и может быть в состоянии pending, fulfilled или rejected."
    },
    {
        id: 9,
        question: "Что такое event loop?",
        weakAnswer: "Обрабатывает асинхронность.",
        technicalAnswer: "Цикл событий управляет выполнением асинхронных колбэков.",
        interviewAnswer:
            "Event loop обрабатывает очереди задач и микрозадач после опустошения стека вызовов."
    },
    {
        id: 10,
        question: "Что такое hoisting?",
        weakAnswer: "Переменные «поднимаются».",
        technicalAnswer: "Hoisting — поведение JS: объявления переносятся к началу области.",
        interviewAnswer:
            "Объявления var и function поднимаются вверх области; let/const остаются в «временной мёртвой зоне» до инициализации."
    },
    {
        id: 11,
        question: "Что такое change detection в Angular?",
        weakAnswer: "Обновляет интерфейс.",
        technicalAnswer: "Механизм Angular, который находит изменения данных и обновляет DOM.",
        interviewAnswer:
            "Change detection сравнивает привязки компонентов с моделью и обновляет представление при изменении состояния."
    },
    {
        id: 12,
        question: "Что такое lifecycle hooks?",
        weakAnswer: "Методы в Angular.",
        technicalAnswer: "Хуки вызываются на этапах жизненного цикла компонента.",
        interviewAnswer:
            "Angular вызывает хуки (например ngOnInit, ngOnDestroy) в ключевые моменты жизни компонента."
    },
    {
        id: 13,
        question: "Что такое внедрение зависимостей (DI)?",
        weakAnswer: "«Впрыскивают» зависимости.",
        technicalAnswer: "Паттерн: зависимости передаются извне, а не создаются внутри класса.",
        interviewAnswer:
            "DI — зависимости получают через конструктор или inject(), что упрощает тестирование и замену реализаций."
    },
    {
        id: 14,
        question: "Что такое RxJS?",
        weakAnswer: "Библиотека.",
        technicalAnswer: "Библиотека реактивного программирования на Observables.",
        interviewAnswer:
            "RxJS моделирует асинхронные потоки данных через Observable и операторы (map, filter, switchMap и т.д.)."
    },
    {
        id: 15,
        question: "Что такое компонент в Angular?",
        weakAnswer: "Часть UI.",
        technicalAnswer: "Компонент управляет фрагментом интерфейса.",
        interviewAnswer:
            "Компонент — кирпич приложения: шаблон + класс + стили, инкапсулирует кусок UI и логику."
    },
    {
        id: 16,
        question: "Что такое NgModule?",
        weakAnswer: "Модуль.",
        technicalAnswer: "Класс, группирующий компоненты, директивы и сервисы.",
        interviewAnswer:
            "NgModule объявляет и экспортирует части фичи и настраивает импорты; в новых приложениях чаще используют standalone."
    },
    {
        id: 17,
        question: "Что такое маршрутизация в Angular?",
        weakAnswer: "Навигация.",
        technicalAnswer: "Routing переключает представления по URL.",
        interviewAnswer:
            "Router сопоставляет пути с компонентами и позволяет строить SPA с историей браузера."
    },
    {
        id: 18,
        question: "Что такое pipe?",
        weakAnswer: "Преобразует данные.",
        technicalAnswer: "Pipe преобразует значение в шаблоне.",
        interviewAnswer:
            "В шаблоне pipe форматирует вывод (дата, валюта, регистр) без лишней логики в компоненте."
    },
    {
        id: 19,
        question: "Чем отличаются == и ===?",
        weakAnswer: "Почти одно и то же.",
        technicalAnswer: "== с приведением типов, === — строгое сравнение.",
        interviewAnswer:
            "== допускает coercion, === сравнивает и значение, и тип без приведения."
    },
    {
        id: 20,
        question: "Что такое стрелочная функция?",
        weakAnswer: "Короткая запись функции.",
        technicalAnswer: "Краткий синтаксис без собственного this.",
        interviewAnswer:
            "У стрелки нет своего this/arguments; this берётся из внешней лексической области."
    },
    {
        id: 21,
        question: "Что такое сервис в Angular?",
        weakAnswer: "Вспомогательный класс.",
        technicalAnswer: "Класс для бизнес-логики и обмена данными между компонентами.",
        interviewAnswer:
            "Сервисы обычно providedIn: 'root' и инжектятся в компоненты для API, состояния и утилит."
    },
    {
        id: 22,
        question: "Что такое Observable?",
        weakAnswer: "Что-то асинхронное.",
        technicalAnswer: "Поток значений во времени.",
        interviewAnswer:
            "Observable может эмитить несколько значений; подписка управляет жизненным циклом потока."
    },
    {
        id: 23,
        question: "Что такое async/await?",
        weakAnswer: "Удобнее промисов.",
        technicalAnswer: "Синтаксис для работы с Promise.",
        interviewAnswer:
            "async/await делает асинхронный код линейным: await приостанавливает функцию до разрешения Promise."
    },
    {
        id: 24,
        question: "Что такое сборка мусора (garbage collection)?",
        weakAnswer: "Очищает память.",
        technicalAnswer: "Автоматическое управление памятью.",
        interviewAnswer:
            "GC освобождает объекты, на которые больше нет ссылок; утечки возникают при «забытых» ссылках."
    },
    {
        id: 25,
        question: "Чем отличаются template-driven и reactive forms?",
        weakAnswer: "Два вида форм.",
        technicalAnswer: "Template-driven — в шаблоне; reactive — в коде.",
        interviewAnswer:
            "Reactive даёт явную модель (FormGroup/Control), валидацию и тестируемость; template-driven проще для простых случаев."
    },
    {
        id: 26,
        question: "Что такое стратегия OnPush для change detection?",
        weakAnswer: "Быстрее.",
        technicalAnswer: "Проверка только при смене входных ссылок и событиях.",
        interviewAnswer:
            "OnPush снижает число проверок: CD запускается при новых @Input, событиях в шаблоне или async pipe."
    },
    {
        id: 27,
        question: "Что такое prototype?",
        weakAnswer: "Наследование.",
        technicalAnswer: "Объекты наследуют свойства через цепочку прототипов.",
        interviewAnswer:
            "У объекта есть скрытая ссылка на прототип; поиск свойства идёт вверх по цепочке."
    },
    {
        id: 28,
        question: "Что такое execution context?",
        weakAnswer: "Среда выполнения.",
        technicalAnswer: "Окружение, в котором выполняется код.",
        interviewAnswer:
            "Контекст включает лексическое окружение, this и привязку к стеку вызовов."
    },
    {
        id: 29,
        question: "Что такое директива?",
        weakAnswer: "Меняет DOM.",
        technicalAnswer: "Добавляет поведение элементам DOM.",
        interviewAnswer:
            "Директива — класс с селектором, который расширяет разметку (структурные или атрибутные)."
    },
    {
        id: 30,
        question: "Чем отличаются структурные и атрибутные директивы?",
        weakAnswer: "Разные типы.",
        technicalAnswer: "Структурные меняют DOM; атрибутные — вид или поведение.",
        interviewAnswer:
            "Структурные (*ngIf, @for) добавляют/убирают узлы; атрибутные меняют стили, классы, обработчики."
    },
    {
        id: 31,
        question: "Что такое примитивные типы?",
        weakAnswer: "Базовые типы.",
        technicalAnswer: "Простые неизменяемые типы данных.",
        interviewAnswer:
            "Примитивы: string, number, boolean, null, undefined, symbol, bigint — хранятся по значению."
    },
    {
        id: 32,
        question: "Что такое приведение типов (coercion)?",
        weakAnswer: "Преобразование типов.",
        technicalAnswer: "Автоматическое преобразование типов при операциях.",
        interviewAnswer:
            "JS может неявно привести типы (например + с разными типами); стоит понимать правила ToPrimitive."
    },
    {
        id: 33,
        question: "Что такое Zone.js?",
        weakAnswer: "Библиотека.",
        technicalAnswer: "Патчит асинхронные API для отслеживания задач.",
        interviewAnswer:
            "Zone.js позволяет Angular запускать change detection после асинхронных событий (таймеры, XHR и т.д.)."
    },
    {
        id: 34,
        question: "Что такое HttpClient?",
        weakAnswer: "HTTP-запросы.",
        technicalAnswer: "Сервис Angular для HTTP.",
        interviewAnswer:
            "HttpClient возвращает Observables, поддерживает interceptors, типизацию ответов и обработку ошибок."
    },
    {
        id: 35,
        question: "Что такое функция высшего порядка?",
        weakAnswer: "Функция про функции.",
        technicalAnswer: "Принимает функцию или возвращает функцию.",
        interviewAnswer:
            "Например map/filter принимают колбэк; каррирование возвращает новую функцию."
    },
    {
        id: 36,
        question: "Что такое иммутабельность?",
        weakAnswer: "Нельзя менять.",
        technicalAnswer: "Данные не мутируют после создания.",
        interviewAnswer:
            "Вместо изменения объекта создают новый (spread, slice) — проще отслеживать изменения и OnPush."
    },
    {
        id: 37,
        question: "Как улучшить производительность Angular?",
        weakAnswer: "Оптимизировать.",
        technicalAnswer: "OnPush, trackBy, ленивая загрузка.",
        interviewAnswer:
            "OnPush, track в @for, lazy routes, detach CD где уместно, async pipe вместо ручных подписок."
    },
    {
        id: 38,
        question: "Что такое debouncing?",
        weakAnswer: "Задержка.",
        technicalAnswer: "Откладывает вызов до паузы во входных событиях.",
        interviewAnswer:
            "Полезно для поиска по вводу: выполняем запрос после того, как пользователь перестал печатать."
    },
    {
        id: 39,
        question: "Что такое throttling?",
        weakAnswer: "Ограничение частоты.",
        technicalAnswer: "Ограничивает число вызовов за интервал времени.",
        interviewAnswer:
            "Для scroll/resize: обработчик срабатывает не чаще, чем раз в N мс."
    },
    {
        id: 40,
        question: "Чем отличаются «умный» и «глупый» компоненты?",
        weakAnswer: "Разные компоненты.",
        technicalAnswer: "Smart — логика и данные; dumb — только отображение.",
        interviewAnswer:
            "Контейнер загружает состояние и вызывает API; презентационный получает @Input и шлёт @Output."
    },
    {
        id: 41,
        question: "Что такое деструктуризация объекта?",
        weakAnswer: "Достаём поля.",
        technicalAnswer: "Извлечение свойств объекта в переменные.",
        interviewAnswer:
            "Синтаксис const { a, b } = obj удобен и читабелен; можно задавать значения по умолчанию и переименовывать."
    },
    {
        id: 42,
        question: "Что такое деструктуризация массива?",
        weakAnswer: "Как у объекта.",
        technicalAnswer: "Присваивание элементов массива переменным по позиции.",
        interviewAnswer:
            "const [first, second] = arr — позиционное сопоставление, пропуск элементов запятыми."
    },
    {
        id: 43,
        question: "Что такое оператор spread?",
        weakAnswer: "Три точки.",
        technicalAnswer: "Разворачивает итерируемое в отдельные элементы.",
        interviewAnswer:
            "В массивах и объектах ... копирует элементы/свойства (поверхностная копия вложенных ссылок)."
    },
    {
        id: 44,
        question: "Что такое оператор rest?",
        weakAnswer: "Тоже точки.",
        technicalAnswer: "Собирает оставшиеся аргументы в массив.",
        interviewAnswer:
            "function f(a, ...rest) или деструктуризация [head, ...tail] — rest всегда последний."
    },
    {
        id: 45,
        question: "Что такое ES-модули?",
        weakAnswer: "import/export.",
        technicalAnswer: "Система модулей JavaScript.",
        interviewAnswer:
            "Статический import/export даёт дерево зависимостей и tree-shaking; в браузере нужен type=module."
    },
    {
        id: 46,
        question: "Что такое strict mode?",
        weakAnswer: "Более строгий режим.",
        technicalAnswer: "Ограниченный вариант языка с более жёсткими ошибками.",
        interviewAnswer:
            "'use strict' ловит опечатки в глобальных переменных, запрещает delete простых имён и другое небезопасное поведение."
    },
    {
        id: 47,
        question: "Что такое JSON?",
        weakAnswer: "Формат данных.",
        technicalAnswer: "Текстовый формат обмена данными.",
        interviewAnswer:
            "JSON.stringify/parse для сериализации; ключи в кавычках; подмножество синтаксиса объектов JS."
    },
    {
        id: 48,
        question: "Чем отличаются поверхностное и глубокое копирование?",
        weakAnswer: "Типы копий.",
        technicalAnswer: "Shallow копирует ссылки; deep — рекурсивно значения.",
        interviewAnswer:
            "Spread даёт shallow copy; для глубокой копии — structuredClone, ручная рекурсия или библиотеки."
    },
    {
        id: 49,
        question: "Чем Map отличается от Object?",
        weakAnswer: "По-разному хранят данные.",
        technicalAnswer: "Map допускает любые ключи и сохраняет порядок вставки.",
        interviewAnswer:
            "У Object ключи — string/symbol; Map удобен для частых добавлений/удалений и итерации в порядке вставки."
    },
    {
        id: 50,
        question: "Что такое Set?",
        weakAnswer: "Коллекция.",
        technicalAnswer: "Множество уникальных значений.",
        interviewAnswer:
            "Set автоматически отбрасывает дубликаты; полезен для проверки уникальности."
    },
    {
        id: 51,
        question: "Что такое сигналы (signals) в Angular?",
        weakAnswer: "Новая фича.",
        technicalAnswer: "Реактивный примитив состояния.",
        interviewAnswer:
            "signal()/computed()/effect() дают синхронную модель реактивности, интегрированную с шаблонами."
    },
    {
        id: 52,
        question: "Чем сигналы отличаются от Observables?",
        weakAnswer: "По-разному.",
        technicalAnswer: "Сигналы синхронны; Observable — асинхронные потоки.",
        interviewAnswer:
            "Signal хранит текущее значение; Observable может эмитить много раз во времени и требует подписки."
    },
    {
        id: 53,
        question: "Что такое standalone-компоненты?",
        weakAnswer: "Компоненты без модуля.",
        technicalAnswer: "Компоненты без обязательного NgModule.",
        interviewAnswer:
            "В imports указывают зависимости напрямую; упрощает ленивую загрузку и тесты."
    },
    {
        id: 54,
        question: "Что такое инжектор (injector)?",
        weakAnswer: "Часть DI.",
        technicalAnswer: "Создаёт и выдаёт зависимости.",
        interviewAnswer:
            "Иерархия инжекторов разрешает токены провайдеров от корня до компонента."
    },
    {
        id: 55,
        question: "Что такое provider?",
        weakAnswer: "Регистрация сервиса.",
        technicalAnswer: "Описывает, как создать зависимость.",
        interviewAnswer:
            "useClass/useValue/useFactory задают реализацию токена в DI."
    },
    {
        id: 56,
        question: "Что такое ленивая загрузка (lazy loading)?",
        weakAnswer: "Грузим позже.",
        technicalAnswer: "Модули/роуты подгружаются по требованию.",
        interviewAnswer:
            "loadChildren/loadComponent уменьшает initial bundle и ускоряет первый рендер."
    },
    {
        id: 57,
        question: "Зачем trackBy в *ngFor / @for?",
        weakAnswer: "Оптимизация.",
        technicalAnswer: "Идентифицирует элементы списка.",
        interviewAnswer:
            "track по id помогает DOM-диффу: меньше пересозданий узлов при обновлении массива."
    },
    {
        id: 58,
        question: "Чем отличаются чистые и нечистые pipes?",
        weakAnswer: "Типы пайпов.",
        technicalAnswer: "Pure вызывается при смене входов.",
        interviewAnswer:
            "Impure pipe выполняется на каждом цикле CD — дорого; pure только при изменении аргументов."
    },
    {
        id: 59,
        question: "Что такое FormControl?",
        weakAnswer: "Поле формы.",
        technicalAnswer: "Отслеживает значение и валидацию одного поля.",
        interviewAnswer:
            "Базовый блок reactive forms: value, status, validators, valueChanges."
    },
    {
        id: 60,
        question: "Что такое FormGroup?",
        weakAnswer: "Группа полей.",
        technicalAnswer: "Набор FormControl с общим API.",
        interviewAnswer:
            "FormGroup объединяет контролы; вложенные группы моделируют сложные формы."
    },
    {
        id: 61,
        question: "Чем микрозадачи отличаются от макрозадач?",
        weakAnswer: "Разные очереди.",
        technicalAnswer: "Микрозадачи выполняются раньше макрозадач.",
        interviewAnswer:
            "После текущего синхронного кода сначала очередь микрозадач (Promise, queueMicrotask), затем macrotask (setTimeout)."
    },
    {
        id: 62,
        question: "Почему async/await удобнее цепочек Promise?",
        weakAnswer: "Читабельнее.",
        technicalAnswer: "Улучшает читаемость асинхронного кода.",
        interviewAnswer:
            "Меньше вложенных then/catch; try/catch вокруг await естественно ловит ошибки."
    },
    {
        id: 63,
        question: "Зачем нужны замыкания?",
        weakAnswer: "Полезная штука.",
        technicalAnswer: "Инкапсуляция состояния.",
        interviewAnswer:
            "Замыкания дают «приватные» переменные, фабрики, мемоизацию и колбэки с сохранённым контекстом."
    },
    {
        id: 64,
        question: "Что вызывает утечки памяти в JavaScript?",
        weakAnswer: "Проблемы с памятью.",
        technicalAnswer: "Неснятые ссылки на ненужные объекты.",
        interviewAnswer:
            "Забытые подписки, глобальные коллекции, замыкания, держащие большие объекты, detached DOM."
    },
    {
        id: 65,
        question: "Как ведёт себя this в стрелочных функциях?",
        weakAnswer: "По-другому.",
        technicalAnswer: "Лексически привязан к внешней области.",
        interviewAnswer:
            "У стрелки нет собственного this; нельзя перепривязать через call/bind."
    },
    {
        id: 66,
        question: "Что такое стек вызовов (call stack)?",
        weakAnswer: "Стек.",
        technicalAnswer: "Структура, отслеживающая порядок вызова функций.",
        interviewAnswer:
            "Каждый вызов кладёт фрейм на стек; return снимает его; переполнение — при бесконечной рекурсии."
    },
    {
        id: 67,
        question: "Что происходит, когда стек вызовов переполнен?",
        weakAnswer: "Ошибка.",
        technicalAnswer: "Stack overflow.",
        interviewAnswer:
            "Движок выбрасывает RangeError: Maximum call stack size exceeded."
    },
    {
        id: 68,
        question: "Что делает Promise.all?",
        weakAnswer: "Ждёт несколько промисов.",
        technicalAnswer: "Ждёт выполнения всех промисов.",
        interviewAnswer:
            "Возвращает массив результатов; при первом reject — отклоняется (если не использовать allSettled)."
    },
    {
        id: 69,
        question: "Что делает Promise.race?",
        weakAnswer: "Первый промис.",
        technicalAnswer: "Завершается вместе с первым settled промисом.",
        interviewAnswer:
            "Удобен для таймаутов: гонка между fetch и delay."
    },
    {
        id: 70,
        question: "Что делает Array.prototype.reduce?",
        weakAnswer: "Перебор.",
        technicalAnswer: "Сворачивает массив в одно значение.",
        interviewAnswer:
            "Итеративно передаёт аккумулятор и текущий элемент в функцию; начальное значение задаётся вторым аргументом."
    },
    {
        id: 71,
        question: "Что запускает change detection в Angular?",
        weakAnswer: "Изменения.",
        technicalAnswer: "Асинхронные события и привязки.",
        interviewAnswer:
            "События UI, таймеры, HTTP (через Zone) или явный markForCheck/detectChanges в OnPush."
    },
    {
        id: 72,
        question: "Как вручную запустить change detection?",
        weakAnswer: "Вызвать метод.",
        technicalAnswer: "Через ChangeDetectorRef.",
        interviewAnswer:
            "detectChanges() проверяет компонент сразу; markForCheck() помечает OnPush для следующего цикла."
    },
    {
        id: 73,
        question: "Зачем выполнять код вне зоны Angular?",
        weakAnswer: "Производительность.",
        technicalAnswer: "Избежать лишних циклов CD.",
        interviewAnswer:
            "runOutsideAngular для частых событий (scroll), затем run() для обновления модели при необходимости."
    },
    {
        id: 74,
        question: "Что такое Subject в RxJS?",
        weakAnswer: "Разновидность Observable.",
        technicalAnswer: "И Observable, и Observer одновременно.",
        interviewAnswer:
            "Мультикаст: next/error/complete вручную; часто через shareReplay для кэша последнего значения."
    },
    {
        id: 75,
        question: "Чем Subject отличается от BehaviorSubject?",
        weakAnswer: "По-разному.",
        technicalAnswer: "BehaviorSubject хранит последнее значение.",
        interviewAnswer:
            "Новый подписчик у Behavior сразу получает текущее значение; у Subject — только будущие эмиты."
    },
    {
        id: 76,
        question: "Что делает switchMap?",
        weakAnswer: "Оператор.",
        technicalAnswer: "Переключается на новый внутренний Observable.",
        interviewAnswer:
            "Отменяет предыдущий внутренний поток — удобно для поиска по вводу, чтобы не применять устаревшие ответы."
    },
    {
        id: 77,
        question: "Что делает mergeMap?",
        weakAnswer: "Оператор.",
        technicalAnswer: "Сливает внутренние Observable без отмены.",
        interviewAnswer:
            "Параллельные запросы возможны; нужен контроль concurrency (mergeMap с вторым аргументом или другие операторы)."
    },
    {
        id: 78,
        question: "Что делает debounceTime?",
        weakAnswer: "Задержка.",
        technicalAnswer: "Откладывает эмиссии на указанное время тишины.",
        interviewAnswer:
            "Игнорирует частые значения, пока поток не «успокоится» на N мс."
    },
    {
        id: 79,
        question: "Что такое unsubscribe и зачем он нужен?",
        weakAnswer: "Остановить подписку.",
        technicalAnswer: "Завершает подписку на Observable.",
        interviewAnswer:
            "Предотвращает утечки и лишние сетевые запросы; async pipe отписывается автоматически."
    },
    {
        id: 80,
        question: "Почему не стоит подписываться внутри subscribe?",
        weakAnswer: "Плохая практика.",
        technicalAnswer: "Получаются вложенные подписки.",
        interviewAnswer:
            "Лучше высокоуровневые операторы (switchMap, mergeMap) — плоский поток и проще отписка."
    },
    {
        id: 81,
        question: "Почему NaN !== NaN?",
        weakAnswer: "Странность JS.",
        technicalAnswer: "NaN не равен самому себе по спецификации.",
        interviewAnswer:
            "Используйте Number.isNaN для проверки; isNaN приводит типы."
    },
    {
        id: 82,
        question: "Что возвращает typeof null?",
        weakAnswer: "object.",
        technicalAnswer: "Из-за исторического бага возвращает 'object'.",
        interviewAnswer:
            "Проверка на null: value === null."
    },
    {
        id: 83,
        question: "Что делает Object.freeze?",
        weakAnswer: "Замораживает.",
        technicalAnswer: "Делает объект неизменяемым на поверхности.",
        interviewAnswer:
            "Нельзя менять свойства, добавлять или удалять; вложенные объекты не замораживаются рекурсивно."
    },
    {
        id: 84,
        question: "Что делает Object.seal?",
        weakAnswer: "Запечатывает.",
        technicalAnswer: "Запрещает добавлять/удалять свойства.",
        interviewAnswer:
            "Существующие свойства по-прежнему можно менять, в отличие от freeze."
    },
    {
        id: 85,
        question: "Что такое каррирование (currying)?",
        weakAnswer: "Цепочка функций.",
        technicalAnswer: "Разбиение функции с несколькими аргументами на цепочку унарных.",
        interviewAnswer:
            "add(a)(b) вместо add(a,b) — удобно для частичного применения и композиции."
    },
    {
        id: 86,
        question: "Что такое частичное применение (partial application)?",
        weakAnswer: "Похоже на карри.",
        technicalAnswer: "Фиксация части аргументов функции.",
        interviewAnswer:
            "bind(null, 2) или обёртка создаёт функцию с меньшим числом параметров."
    },
    {
        id: 87,
        question: "Что такое паттерн Facade?",
        weakAnswer: "Паттерн.",
        technicalAnswer: "Упрощённый интерфейс к сложной подсистеме.",
        interviewAnswer:
            "Сервис-фасад скрывает несколько API/сторов за одним методом для компонентов."
    },
    {
        id: 88,
        question: "Что такое управление состоянием (state management)?",
        weakAnswer: "Состояние приложения.",
        technicalAnswer: "Организация и обновление данных приложения.",
        interviewAnswer:
            "От локальных сервисов и signals до NgRx: единый источник правды и предсказуемые обновления."
    },
    {
        id: 89,
        question: "Когда уместен NgRx?",
        weakAnswer: "Большие приложения.",
        technicalAnswer: "Сложное разделяемое состояние.",
        interviewAnswer:
            "Много экранов, строгие требования к трассировке действий, time-travel отладка, кэш сущностей."
    },
    {
        id: 90,
        question: "Что такое модульное (unit) тестирование?",
        weakAnswer: "Тесты.",
        technicalAnswer: "Проверка отдельных единиц кода изолированно.",
        interviewAnswer:
            "Один класс/функция с моками зависимостей; быстрая обратная связь при рефакторинге."
    },
    {
        id: 91,
        question: "Что такое TestBed?",
        weakAnswer: "Утилита тестов.",
        technicalAnswer: "Основной инструмент тестирования Angular.",
        interviewAnswer:
            "configureTestingModule, createComponent, inject — настройка DI и DOM для компонентов."
    },
    {
        id: 92,
        question: "Что такое мемоизация?",
        weakAnswer: "Кэш.",
        technicalAnswer: "Кэширование результатов функции.",
        interviewAnswer:
            "Повторные вызовы с теми же аргументами возвращают сохранённый результат — классика для рекурсии (Fibonacci)."
    },
    {
        id: 93,
        question: "Что такое временная сложность?",
        weakAnswer: "Скорость.",
        technicalAnswer: "Как растёт время работы от размера входа.",
        interviewAnswer:
            "Оценивают через O-нотацию: константная, линейная, логарифмическая, квадратичная и т.д."
    },
    {
        id: 94,
        question: "Что такое Big O?",
        weakAnswer: "Математика.",
        technicalAnswer: "Описывает асимптотику алгоритма.",
        interviewAnswer:
            "O(n) — линейный проход; O(log n) — деление пополам; важно для выбора структур данных."
    },
    {
        id: 95,
        question: "Что такое DOM?",
        weakAnswer: "HTML-дерево.",
        technicalAnswer: "Древовидное представление документа.",
        interviewAnswer:
            "API для чтения и изменения узлов; манипуляции дорогие — минимизируем лишние reflow."
    },
    {
        id: 96,
        question: "Что такое делегирование событий?",
        weakAnswer: "События.",
        technicalAnswer: "Обработчик на родителе ловит всплытие.",
        interviewAnswer:
            "Один listener на списке вместо сотен на дочерних элементах — меньше памяти, проще динамические элементы."
    },
    {
        id: 97,
        question: "Что такое localStorage?",
        weakAnswer: "Хранилище.",
        technicalAnswer: "Постоянное хранилище ключ–значение в браузере.",
        interviewAnswer:
            "Синхронный API, строки только, лимит ~5 МБ; не для секретов."
    },
    {
        id: 98,
        question: "Чем localStorage отличается от sessionStorage?",
        weakAnswer: "По-разному хранят.",
        technicalAnswer: "Срок жизни данных.",
        interviewAnswer:
            "sessionStorage очищается при закрытии вкладки; localStorage живёт до ручной очистки."
    },
    {
        id: 99,
        question: "Что такое XSS?",
        weakAnswer: "Атака.",
        technicalAnswer: "Межсайтовый скриптинг.",
        interviewAnswer:
            "Инъекция скрипта в HTML; защита: экранирование, CSP, избегать innerHTML с пользовательским текстом."
    },
    {
        id: 100,
        question: "Что такое CORS?",
        weakAnswer: "Политика браузера.",
        technicalAnswer: "Механизм cross-origin доступа к ресурсам.",
        interviewAnswer:
            "Сервер отвечает заголовками Access-Control-*; preflight для непростых запросов."
    },
    {
        id: 101,
        question: `Что выведет этот код?

for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}`,
        weakAnswer: "0 1 2",
        technicalAnswer: "3 3 3",
        interviewAnswer:
            "Выведет три раза 3: var функционально-скоупед, цикл завершится до таймеров, все колбэки видят финальное i."
    },
    {
        id: 102,
        question: `Что выведет этот код?

for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}`,
        weakAnswer: "3 3 3",
        technicalAnswer: "0 1 2",
        interviewAnswer:
            "0, 1, 2: у let блочная область, на каждой итерации своя ячейка для i."
    },
    {
        id: 103,
        question: `Что выведет этот код?

const obj = {
  name: 'John',
  greet: function() {
    return function() {
      console.log(this.name);
    }
  }
};
obj.greet()();`,
        weakAnswer: "John",
        technicalAnswer: "undefined",
        interviewAnswer:
            "undefined: внутренняя обычная функция, this — глобал/undefined в strict, не obj."
    },
    {
        id: 104,
        question: "Как исправить предыдущий пример, чтобы вывелось 'John'?",
        weakAnswer: "Что-то поменять.",
        technicalAnswer: "Стрелка или bind.",
        interviewAnswer:
            "Вернуть стрелочную функцию () => console.log(this.name) или .bind(obj) на внутренней функции."
    },
    {
        id: 105,
        question: `Что выведет этот код?

console.log(a);
var a = 5;`,
        weakAnswer: "5",
        technicalAnswer: "undefined",
        interviewAnswer:
            "undefined: объявление var поднято, присваивание — нет."
    },
    {
        id: 106,
        question: `Что выведет этот код?

console.log(a);
let a = 5;`,
        weakAnswer: "undefined",
        technicalAnswer: "ReferenceError",
        interviewAnswer:
            "ReferenceError: let в временной мёртвой зоне до строки инициализации."
    },
    {
        id: 107,
        question: `В каком порядке выведутся числа?

console.log(1);
setTimeout(() => console.log(2), 0);
Promise.resolve().then(() => console.log(3));
console.log(4);`,
        weakAnswer: "1 2 3 4",
        technicalAnswer: "1 4 3 2",
        interviewAnswer:
            "1, 4, 3, 2: сначала синхронный код, затем микрозадачи (Promise), затем macrotask (setTimeout)."
    },
    {
        id: 108,
        question: `Что выведет этот код?

[1,2,3].map(parseInt)`,
        weakAnswer: "[1,2,3]",
        technicalAnswer: "[1, NaN, NaN]",
        interviewAnswer:
            "map передаёт (элемент, индекс); parseInt('2',1) и parseInt('3',2) дают NaN."
    },
    {
        id: 109,
        question: `Что выведет этот код?

[] + {}`,
        weakAnswer: "Ошибка",
        technicalAnswer: "[object Object]",
        interviewAnswer:
            "Строка '[object Object]': оба операнда приводятся к строке."
    },
    {
        id: 110,
        question: `Что выведет этот код?

{} + []`,
        weakAnswer: "Как в прошлом примере",
        technicalAnswer: "0",
        interviewAnswer:
            "В выражении {} может трактоваться как блок, +[] даёт 0 (унарный плюс к пустому массиву)."
    },
    {
        id: 111,
        question: `Что выведет этот код?

function foo() {
  return
  {
    name: 'John'
  }
}
console.log(foo());`,
        weakAnswer: "Объект",
        technicalAnswer: "undefined",
        interviewAnswer:
            "undefined: ASI вставляет точку с запятой после return."
    },
    {
        id: 112,
        question: `Что выведет этот код?

const obj = { a: 1 };
const b = obj;
b.a = 2;
console.log(obj.a);`,
        weakAnswer: "1",
        technicalAnswer: "2",
        interviewAnswer:
            "2: b и obj — одна и та же ссылка на объект."
    },
    {
        id: 113,
        question: `Что выведет этот код?

function counter() {
  let count = 0;
  return function() {
    return ++count;
  }
}
const c = counter();
console.log(c());
console.log(c());`,
        weakAnswer: "1 1",
        technicalAnswer: "1 2",
        interviewAnswer:
            "1 и 2: замыкание хранит общий count между вызовами."
    },
    {
        id: 114,
        question: `Что выведет этот код?

async function test() {
  return 42;
}
test().then(console.log);`,
        weakAnswer: "Ничего",
        technicalAnswer: "42",
        interviewAnswer:
            "42: async-функция возвращает Promise, который резолвится в 42."
    },
    {
        id: 115,
        question: `Что выведет этот код?

const obj = {
  name: 'John',
  greet: () => console.log(this.name)
};
obj.greet();`,
        weakAnswer: "John",
        technicalAnswer: "undefined",
        interviewAnswer:
            "Выводится undefined. У стрелочной функции нет своего this: она использует лексический this из внешней области, где объявлен объект, а не this от вызова obj.greet(). Поэтому this не указывает на obj. В strict mode или модулях внешний this часто undefined — отсюда undefined. Чтобы сослаться на объект, используйте обычный метод greet() { ... }, const self = this или .bind."
    },
    {
        id: 116,
        question: `Что выведет этот код?

Promise.resolve(1)
  .then(x => x + 1)
  .then(x => { throw new Error(); })
  .catch(() => 10)
  .then(x => console.log(x));`,
        weakAnswer: "Ошибка",
        technicalAnswer: "10",
        interviewAnswer:
            "10: catch возвращает значение, следующий then его получает."
    },
    {
        id: 117,
        question: `Что выведет этот код?

setTimeout(() => console.log('A'), 0);
console.log('B');`,
        weakAnswer: "A B",
        technicalAnswer: "B A",
        interviewAnswer:
            "Сначала B, потом A: синхронный код раньше macrotask."
    },
    {
        id: 118,
        question: `Что выведет этот код?

console.log(0.1 + 0.2 === 0.3);`,
        weakAnswer: "true",
        technicalAnswer: "false",
        interviewAnswer:
            "false: двоичное представление float, сумма не равна точно 0.3."
    },
    {
        id: 119,
        question: `Что выведет этот код?

const a = { x: 1 };
const b = { x: 1 };
console.log(a === b);`,
        weakAnswer: "true",
        technicalAnswer: "false",
        interviewAnswer:
            "false: сравниваются ссылки, не содержимое."
    },
    {
        id: 120,
        question: `Что выведет этот код?

console.log([1,2] == '1,2');`,
        weakAnswer: "false",
        technicalAnswer: "true",
        interviewAnswer:
            "true: массив приводится к строке '1,2'."
    }
];
