import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
            import('./features/subject-selector/pages/subject-selector-page/subject-selector-page.component').then(
                (m) => m.SubjectSelectorPageComponent
            )
    },
    {
        path: 'quiz',
        loadComponent: () =>
            import('./features/quiz/pages/quiz-page/quiz-page.component').then((m) => m.QuizPageComponent)
    },
    {
        path: 'dashboard',
        loadComponent: () =>
            import('./features/dashboard/pages/dashboard-page/dashboard-page.component').then(
                (m) => m.DashboardPageComponent
            )
    },
    {
        path: 'study',
        loadComponent: () =>
            import('./features/study/pages/study-guide-page/study-guide-page.component').then(
                (m) => m.StudyGuidePageComponent
            )
    },
    {
        path: 'plan',
        loadComponent: () =>
            import('./features/plan/pages/plan-page/plan-page.component').then((m) => m.PlanPageComponent)
    },
    {
        path: 'about',
        loadComponent: () =>
            import('./features/about/pages/about-page/about-page.component').then(
                (m) => m.AboutPageComponent
            )
    },
    {
        path: 'my-questions',
        loadComponent: () =>
            import('./features/my-questions/pages/my-questions-page/my-questions-page.component').then(
                (m) => m.MyQuestionsPageComponent
            )
    },
    {
        path: 'sociology',
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'study' },
            {
                path: 'quiz',
                loadComponent: () =>
                    import('./features/sociology-quiz/pages/sociology-quiz-page/sociology-quiz-page.component').then(
                        (m) => m.SociologyQuizPageComponent
                    )
            },
            {
                path: 'study',
                loadComponent: () =>
                    import(
                        './features/sociology-study/pages/sociology-study-page/sociology-study-page.component'
                    ).then((m) => m.SociologyStudyPageComponent)
            },
            {
                path: 'plan',
                loadComponent: () =>
                    import(
                        './features/sociology-plan/pages/sociology-plan-page/sociology-plan-page.component'
                    ).then((m) => m.SociologyPlanPageComponent)
            },
            {
                path: 'dashboard',
                loadComponent: () =>
                    import(
                        './features/sociology-dashboard/pages/sociology-dashboard-page/sociology-dashboard-page.component'
                    ).then((m) => m.SociologyDashboardPageComponent)
            }
        ]
    },
    { path: '**', redirectTo: '' }
];
