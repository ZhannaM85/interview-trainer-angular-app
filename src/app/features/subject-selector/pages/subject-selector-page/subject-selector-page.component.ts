import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-subject-selector-page',
    imports: [RouterLink, TranslatePipe],
    templateUrl: './subject-selector-page.component.html',
    styleUrl: './subject-selector-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SubjectSelectorPageComponent {}
