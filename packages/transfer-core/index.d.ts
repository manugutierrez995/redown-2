export type State = 'queued'|'preflight'|'transferring'|'retry-wait'|'verifying'|'verified'|'unverified'|'terminal-failed'|'needs-browser'|'needs-auth'|'skipped'|'cancellation-pending'|'cancelled';
export interface Location { accountId: string; bucket: string; key: string }
export interface Job { schemaVersion: 2; jobId: string; lease: string; state: State; sourceUrl: string; destination: Location; requestedMode: 'automatic'|'fully-remote'|'browser-assisted'; actualMode: 'cloud-to-cloud'; bytes: number; maxBytes: number; maxAttempts: number; attempt: number; digest?: string; validator?: string; multipart?: unknown; policy: { overwrite: 'skip-existing'|'fail-if-existing'; allowBrowserFallback: boolean }; [key: string]: unknown }
export interface Ports {
 store: { checkpoint(id: string, lease: string, state: State, patch: object, at: number): Promise<Job>; cancelRequested(id: string, lease: string): Promise<boolean> };
 source: { open(url: string, policy: {validator?: string; maxBytes: number}): Promise<{body: AsyncIterable<Uint8Array>; length: number|null; validator?: string; close?(): void|Promise<void>}> };
 destination: { inspect(location: Location): Promise<{size: number; jobId?: string}|null>; read(location: Location): Promise<AsyncIterable<Uint8Array>>; begin(location: Location, jobId: string, attempt: string): Promise<unknown>; part(upload: unknown, number: number, bytes: Uint8Array): Promise<unknown>; commit(upload: unknown, location: Location, evidence: {jobId: string; digest: string; bytes: number}): Promise<boolean>; cleanup(upload: unknown): Promise<void> };
 clock: { now(): number }; hash: {create(): {update(bytes: Uint8Array): void; digest(): string}};
 partBytes: number; events?: {emit(event: object): Promise<void>}; fault?: (point: string)=>Promise<void>;
}
export const VERSION: string;
export const TERMINAL: Set<State>;
export class TransferError extends Error {code: string; retryable: boolean; constructor(code: string, retryable?: boolean)}
export function validateKey(key: string): string;
export function validateSubmission(input: unknown): object;
export function assertTransition(from: State,to: State): void;
export function executeTransfer(job: Job, ports: Ports): Promise<Job>;

export interface AuthorizationPort { authorize(intent: object, principal: string): Promise<{tenant: string; maxBytes: number; maxAttempts: number}> }
export interface SchedulerPort { wakeAt(utcMillis: number): Promise<void> }
export interface ClockPort { now(): number; monotonic(): number }
