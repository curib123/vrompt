import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';

@Injectable()
export class AuthOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    http.getResponse<Response>().setHeader('Cache-Control', 'no-store');
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
    const origin = request.headers.origin;
    const allowed = this.config
      .get<string>('WEB_ORIGIN', 'http://localhost:3000')
      .split(',')
      .map((value) => value.trim().replace(/\/$/, ''));
    // Custom header forces browser preflight; exact origin validation also
    // prevents requests from sibling sites. Non-browser clients send the header.
    if (
      request.headers['x-vrompt-client'] !== 'web' ||
      (origin !== undefined && !allowed.includes(origin)) ||
      (!origin && request.headers['sec-fetch-site'] === 'cross-site')
    ) {
      throw new ForbiddenException('Untrusted authentication request');
    }
    return true;
  }
}
