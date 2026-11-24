import { Global, Injectable, Module } from '@nestjs/common';

export type JobState = 'pending' | 'ok' | 'failed' | 'stale';

interface JobRecord {
  intervalMs: number;
  lastRunAt: Date | null;
  lastSuccessAt: Date | null;
  consecutiveFailures: number;
}

/**
 * Status job terjadwal di proses ini (Observabilitas, PRD bagian 8). Health check membacanya agar job yang
 * gagal atau berhenti terlihat dari luar; pesan error lengkap tetap hanya di log.
 */
@Injectable()
export class JobStatusService {
  private readonly startedAt = new Date();
  private readonly jobs = new Map<string, JobRecord>();

  register(name: string, intervalMs: number) {
    if (!this.jobs.has(name)) this.jobs.set(name, { intervalMs, lastRunAt: null, lastSuccessAt: null, consecutiveFailures: 0 });
  }

  succeeded(name: string) {
    const j = this.jobs.get(name);
    if (!j) return;
    j.lastRunAt = j.lastSuccessAt = new Date();
    j.consecutiveFailures = 0;
  }

  failed(name: string) {
    const j = this.jobs.get(name);
    if (!j) return;
    j.lastRunAt = new Date();
    j.consecutiveFailures++;
  }

  /** stale = tidak ada keberhasilan dalam tiga kali interval (job berhenti atau macet). */
  snapshot(now = new Date()) {
    return Object.fromEntries(
      [...this.jobs.entries()].map(([name, j]) => {
        const since = (j.lastSuccessAt ?? this.startedAt).getTime();
        const state: JobState =
          j.consecutiveFailures > 0 ? 'failed' : now.getTime() - since > 3 * j.intervalMs ? 'stale' : j.lastSuccessAt ? 'ok' : 'pending';
        return [name, { state, lastRunAt: j.lastRunAt?.toISOString() ?? null, lastSuccessAt: j.lastSuccessAt?.toISOString() ?? null, consecutiveFailures: j.consecutiveFailures }];
      }),
    );
  }
}

@Global()
@Module({ providers: [JobStatusService], exports: [JobStatusService] })
export class JobStatusModule {}
