import { Injectable } from '@nestjs/common';

type EvidenceRejectionKind = 'file-type' | 'oversized';

interface MetricsCounters {
  evidenceUploadFailures: number;
  evidenceUploadCount: number;
  evidenceUploadLatencyMs: number;
  failedLogins: number;
  rejectedEvidenceFileTypes: number;
  rejectedOversizedFiles: number;
  requests: number;
  responses2xx: number;
  responses4xx: number;
  responses5xx: number;
  storageErrors: number;
  totalLatencyMs: number;
}

@Injectable()
export class MetricsService {
  private readonly counters: MetricsCounters = {
    evidenceUploadFailures: 0,
    evidenceUploadCount: 0,
    evidenceUploadLatencyMs: 0,
    failedLogins: 0,
    rejectedEvidenceFileTypes: 0,
    rejectedOversizedFiles: 0,
    requests: 0,
    responses2xx: 0,
    responses4xx: 0,
    responses5xx: 0,
    storageErrors: 0,
    totalLatencyMs: 0,
  };

  recordRequest(path: string, statusCode: number, durationMs: number) {
    this.counters.requests += 1;
    this.counters.totalLatencyMs += Math.max(0, durationMs);

    if (statusCode >= 500) {
      this.counters.responses5xx += 1;
    } else if (statusCode >= 400) {
      this.counters.responses4xx += 1;
    } else if (statusCode >= 200 && statusCode < 300) {
      this.counters.responses2xx += 1;
    }

    if (path.endsWith('/auth/staff/login') && statusCode >= 400) {
      this.counters.failedLogins += 1;
    }

    if (path.includes('/evidence-images') && statusCode >= 400) {
      this.counters.evidenceUploadFailures += 1;
    }
  }

  recordEvidenceUpload(durationMs: number) {
    this.counters.evidenceUploadCount += 1;
    this.counters.evidenceUploadLatencyMs += Math.max(0, durationMs);
  }

  recordEvidenceRejection(kind: EvidenceRejectionKind) {
    if (kind === 'oversized') {
      this.counters.rejectedOversizedFiles += 1;
    } else {
      this.counters.rejectedEvidenceFileTypes += 1;
    }
  }

  recordStorageError() {
    this.counters.storageErrors += 1;
  }

  getSnapshot() {
    const memory = process.memoryUsage();

    return {
      uptimeSeconds: Math.round(process.uptime()),
      memory: {
        rssBytes: memory.rss,
        heapUsedBytes: memory.heapUsed,
      },
      requests: {
        total: this.counters.requests,
        responses2xx: this.counters.responses2xx,
        responses4xx: this.counters.responses4xx,
        responses5xx: this.counters.responses5xx,
        averageLatencyMs: this.average(
          this.counters.totalLatencyMs,
          this.counters.requests,
        ),
        failedLogins: this.counters.failedLogins,
      },
      evidence: {
        uploads: this.counters.evidenceUploadCount,
        uploadFailures: this.counters.evidenceUploadFailures,
        averageUploadLatencyMs: this.average(
          this.counters.evidenceUploadLatencyMs,
          this.counters.evidenceUploadCount,
        ),
        rejectedOversizedFiles: this.counters.rejectedOversizedFiles,
        rejectedFileTypes: this.counters.rejectedEvidenceFileTypes,
        storageErrors: this.counters.storageErrors,
      },
    };
  }

  private average(total: number, count: number) {
    return count === 0 ? 0 : Math.round((total / count) * 100) / 100;
  }
}
