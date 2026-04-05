/** Separates intro text from a code block (data uses a blank line between). */
export function splitQuestionPromptAndCode(text: string): { lead: string; code: string | null } {
    const sep = '\n\n';
    const i = text.indexOf(sep);
    if (i === -1) {
        return { lead: text, code: null };
    }
    const lead = text.slice(0, i).trim();
    const code = text.slice(i + sep.length).trim();
    if (!code) {
        return { lead: text, code: null };
    }
    return { lead: lead || text, code };
}
