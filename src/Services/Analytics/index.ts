// This is NOT a bilby analytics service, rather just a wrapper for the BlueyPlace Analytics API (https://api.place.heeler.house/).
export default class AnalyticsService {
    private BASE_DOMAIN = "https://api.place.heeler.house";

    async getGlobal() {
        let response = await fetch(`${this.BASE_DOMAIN}`);
        let body = await response.json();

        if (body.code != undefined) throw new AnalyticsError(body.code, body.message);

        return body as GlobalResponse;
    }

    async getTemplate(template: string) {
        let response = await fetch(`${this.BASE_DOMAIN}/${template}`);
        let body = await response.json();

        if (body.code != undefined) throw new AnalyticsError(body.code, body.message);

        return body as TemplateResponse;
    }

    async getUser(template: string, id: string) {
        let response = await fetch(`${this.BASE_DOMAIN}/${template}/${id}`);
        let body = await response.json();

        if (body.code != undefined) throw new AnalyticsError(body.code, body.message);

        return body as UserResponse;
    }
}

export class AnalyticsError extends Error {
    public code: string;
    public message: string;

    constructor(code, message) {
        super(`${code}: ${message}`);
    }

    toString() {
        return `${this.code}: ${this.message}`
    }
}

interface ErrorResponse {
    code: string,
    message: string
}

interface GlobalResponse {
    totalPixels: {
        all: number,
        mins_5: number,
        mins_1: number
    }
}

interface TemplateResponse {
    totalPixels: {
        all: number,
        mins_5: number,
        mins_1: number
    },
    completeness: {
        total: number,
        correct: number,
        percentage: number
    }
}

interface UserResponse {
    all: number,
    mins_5: number,
    mins_1: number
}