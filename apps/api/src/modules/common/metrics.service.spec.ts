import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('counts only failed staff login requests as failed logins', () => {
    const service = new MetricsService();

    service.recordRequest('/api/v1/auth/staff/login', 401, 10);
    service.recordRequest('/api/v1/auth/staff/login', 201, 10);
    service.recordRequest('/api/v1/auth/refresh', 401, 10);
    service.recordRequest('/api/v1/auth/logout', 401, 10);
    service.recordRequest('/api/v1/auth/staff/password', 401, 10);

    expect(service.getSnapshot().requests.failedLogins).toBe(1);
  });
});
