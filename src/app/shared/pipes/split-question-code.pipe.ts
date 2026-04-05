import { Pipe, PipeTransform } from '@angular/core';

import { splitQuestionPromptAndCode } from '../utils/question-text.utils';

export interface QuestionPromptCodeParts {
    lead: string;
    code: string | null;
}

@Pipe({
    name: 'splitQuestionCode',
    standalone: true
})
export class SplitQuestionCodePipe implements PipeTransform {
    transform(text: string): QuestionPromptCodeParts {
        return splitQuestionPromptAndCode(text);
    }
}
