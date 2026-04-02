import { Routes } from '@angular/router';

export const routes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'quiz' },
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
    { path: '**', redirectTo: 'quiz' }
];
