import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { StorageService } from '../../../../core/services/storage.service';

const LAST_SUBJECT_KEY = 'last-subject';
type Subject = 'js' | 'sociology';

@Component({
    selector: 'app-subject-selector-page',
    imports: [RouterLink, TranslatePipe],
    templateUrl: './subject-selector-page.component.html',
    styleUrl: './subject-selector-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubjectSelectorPageComponent implements OnInit {
    private readonly storage = inject(StorageService);
    private readonly router = inject(Router);

    ngOnInit(): void {
        const saved = this.storage.get<Subject>(LAST_SUBJECT_KEY);
        if (saved === 'js') {
            this.router.navigate(['/quiz']);
        } else if (saved === 'sociology') {
            this.router.navigate(['/sociology', 'study']);
        }
    }

    saveSubject(subject: Subject): void {
        this.storage.set(LAST_SUBJECT_KEY, subject);
    }
}
