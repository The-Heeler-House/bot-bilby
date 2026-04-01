import { WaffleScenarioResult, WaffleTestFailure } from "../models/waffleTestRun";

export class ScenarioRecorder {
    public assertions = 0;
    public failures: WaffleTestFailure[] = [];

    ok(condition: unknown, assertion: string, expected = "truthy", actual = String(condition)): void {
        this.assertions += 1;
        if (!condition) {
            this.failures.push({ assertion, expected, actual });
        }
    }

    equal<T>(actual: T, expected: T, assertion: string): void {
        this.assertions += 1;
        if (actual !== expected) {
            this.failures.push({
                assertion,
                expected: JSON.stringify(expected),
                actual: JSON.stringify(actual),
            });
        }
    }

    fail(assertion: string, error: unknown, expected = "no error", actual = "error thrown"): void {
        this.assertions += 1;
        this.failures.push({
            assertion,
            expected,
            actual,
            error: error instanceof Error ? error.stack ?? error.message : String(error),
        });
    }

    finish(name: string, startedAt: number, artifacts?: Record<string, unknown>): WaffleScenarioResult {
        const failures = this.failures.map(failure => ({ ...failure, scenario: failure.scenario ?? name }));
        return {
            name,
            passed: failures.length === 0,
            assertions: this.assertions,
            failures,
            durationMs: Date.now() - startedAt,
            artifacts,
        };
    }
}
