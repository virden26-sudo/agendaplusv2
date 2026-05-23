import type {PortalData, TutorInput, TutorOutput} from '@/ai/schemas';
import {getApiUrl} from '@/lib/api-config';

async function postJson<TResponse>(endpoint: string, body: unknown, backendUrl?: string): Promise<TResponse> {
    const response = await fetch(getApiUrl(endpoint, backendUrl), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`Request failed for ${endpoint}`);
    }

    return response.json() as Promise<TResponse>;
}

export function extractItems(text: string, backendUrl?: string) {
    return postJson<PortalData>('/api/extract-items', {text}, backendUrl);
}

export function askTutor(input: TutorInput, backendUrl?: string) {
    return postJson<TutorOutput>('/api/tutor', input, backendUrl);
}
