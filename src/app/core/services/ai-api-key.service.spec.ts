import { TestBed } from '@angular/core/testing';

import { AiApiKeyService } from './ai-api-key.service';

function setup(): AiApiKeyService {
    TestBed.configureTestingModule({});
    return TestBed.inject(AiApiKeyService);
}

describe('AiApiKeyService', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => TestBed.resetTestingModule());

    it('starts with empty key when nothing is stored', () => {
        const service = setup();
        expect(service.apiKey()).toBe('');
    });

    it('saves a key and reflects it in the signal', () => {
        const service = setup();
        service.save('sk-ant-abc123');
        expect(service.apiKey()).toBe('sk-ant-abc123');
    });

    it('persists the key to localStorage', () => {
        const service = setup();
        service.save('sk-ant-abc123');
        const raw = localStorage.getItem('interview-trainer:ai-api-key');
        expect(JSON.parse(raw!)).toBe('sk-ant-abc123');
    });

    it('trims whitespace when saving', () => {
        const service = setup();
        service.save('  sk-ant-abc123  ');
        expect(service.apiKey()).toBe('sk-ant-abc123');
    });

    it('clears the key and removes it from localStorage', () => {
        const service = setup();
        service.save('sk-ant-abc123');
        service.clear();
        expect(service.apiKey()).toBe('');
        expect(localStorage.getItem('interview-trainer:ai-api-key')).toBeNull();
    });

    it('save with empty string removes from localStorage', () => {
        const service = setup();
        service.save('sk-ant-abc123');
        service.save('');
        expect(service.apiKey()).toBe('');
        expect(localStorage.getItem('interview-trainer:ai-api-key')).toBeNull();
    });

    describe('isValidFormat', () => {
        it('returns true for an empty string (key not set)', () => {
            const service = setup();
            expect(service.isValidFormat('')).toBe(true);
        });

        it('returns true for a key starting with sk-ant-', () => {
            const service = setup();
            expect(service.isValidFormat('sk-ant-api123')).toBe(true);
        });

        it('returns false for a key not starting with sk-ant-', () => {
            const service = setup();
            expect(service.isValidFormat('sk-abc-xyz')).toBe(false);
        });

        it('returns false for a random string', () => {
            const service = setup();
            expect(service.isValidFormat('notakey')).toBe(false);
        });

        it('trims whitespace before validating', () => {
            const service = setup();
            expect(service.isValidFormat('  sk-ant-abc  ')).toBe(true);
        });
    });
});
