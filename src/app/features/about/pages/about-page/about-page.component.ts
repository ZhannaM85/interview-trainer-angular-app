import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'app-about-page',
    imports: [TranslatePipe],
    templateUrl: './about-page.component.html',
    styleUrl: './about-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutPageComponent {}
