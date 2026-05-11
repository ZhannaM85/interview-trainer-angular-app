import { Injectable, inject } from '@angular/core';

import type { DailyActivity } from '../../shared/models/activity.model';
import type { CustomQuestion } from '../../shared/models/custom-question.model';
import type { Progress } from '../../shared/models/progress.model';
import type { TodayPlanState } from '../../shared/models/today-plan.model';
import { ActivityService } from './activity.service';
import { CustomQuestionService } from './custom-question.service';
import { ProgressService } from './progress.service';
import { StorageService } from './storage.service';
import { TodayPlanService } from './today-plan.service';

export interface AppBackup {
    progress: Progress[];
    activityByDay: DailyActivity[];
    todayPlan: TodayPlanState | null;
    customQuestions: CustomQuestion[];
    exportedAt: string;
}

export interface BackupDiff {
    progressCount: number;
    activityDaysCount: number;
    customQuestionsCount: number;
}

@Injectable({ providedIn: 'root' })
export class DataExportService {
    private readonly storage = inject(StorageService);
    private readonly progressService = inject(ProgressService);
    private readonly activityService = inject(ActivityService);
    private readonly todayPlanService = inject(TodayPlanService);
    private readonly customQuestionService = inject(CustomQuestionService);

    exportBackup(): void {
        const activityByDay = [...this.activityService.activityMap().values()].sort((a, b) =>
            a.date.localeCompare(b.date)
        );
        const backup: AppBackup = {
            progress: this.progressService.getProgress(),
            activityByDay,
            todayPlan: this.todayPlanService.plan(),
            customQuestions: this.customQuestionService.questions(),
            exportedAt: new Date().toISOString()
        };
        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `karkas-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    parseBackupFile(file: File): Promise<AppBackup> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed: unknown = JSON.parse(e.target!.result as string);
                    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                        reject(new Error('invalid'));
                        return;
                    }
                    resolve(parsed as AppBackup);
                } catch {
                    reject(new Error('invalid'));
                }
            };
            reader.onerror = () => reject(new Error('read-error'));
            reader.readAsText(file);
        });
    }

    diffBackup(backup: AppBackup): BackupDiff {
        return {
            progressCount: Array.isArray(backup.progress) ? backup.progress.length : 0,
            activityDaysCount: Array.isArray(backup.activityByDay) ? backup.activityByDay.length : 0,
            customQuestionsCount: Array.isArray(backup.customQuestions)
                ? backup.customQuestions.length
                : 0
        };
    }

    applyBackup(backup: AppBackup): void {
        if (Array.isArray(backup.progress)) {
            this.storage.set('progress', backup.progress);
        }
        if (Array.isArray(backup.activityByDay)) {
            this.storage.set('activity-by-day', backup.activityByDay);
        }
        if (backup.todayPlan !== null && backup.todayPlan !== undefined) {
            this.storage.set('today-plan', backup.todayPlan);
        }
        if (Array.isArray(backup.customQuestions)) {
            this.storage.set('custom-questions', backup.customQuestions);
        }
        window.location.reload();
    }
}
