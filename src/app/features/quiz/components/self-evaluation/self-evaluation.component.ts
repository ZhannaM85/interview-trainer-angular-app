import { ChangeDetectionStrategy, Component, output } from '@angular/core';

import type { SelfRating } from '../../../../shared/models/self-rating.model';

@Component({
    selector: 'app-self-evaluation',
    templateUrl: './self-evaluation.component.html',
    styleUrl: './self-evaluation.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SelfEvaluationComponent {
    readonly rated = output<SelfRating>();
}
