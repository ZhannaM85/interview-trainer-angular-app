import { inject, Pipe, type PipeTransform } from '@angular/core';
import { DomSanitizer, type SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'searchHighlight', standalone: true, pure: true })
export class SearchHighlightPipe implements PipeTransform {
    private readonly sanitizer = inject(DomSanitizer);

    transform(text: string, query: string): SafeHtml | string {
        if (!query || !text) return text;
        const escapedText = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const highlighted = escapedText.replace(
            new RegExp(`(${escapedQuery})`, 'gi'),
            '<mark class="study__search-highlight">$1</mark>'
        );
        return this.sanitizer.bypassSecurityTrustHtml(highlighted);
    }
}
