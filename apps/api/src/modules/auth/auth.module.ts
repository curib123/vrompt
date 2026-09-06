import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AuthOriginGuard } from './guards/auth-origin.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          algorithm: 'HS256',
          issuer: 'vrompt-api',
          audience: 'vrompt-web',
          expiresIn: configService.get<number>('JWT_ACCESS_TTL_SECONDS', 900),
        },
        verifyOptions: {
          algorithms: ['HS256'],
          issuer: 'vrompt-api',
          audience: 'vrompt-web',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AccessTokenGuard, AuthOriginGuard, RolesGuard],
  exports: [AuthService, AccessTokenGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
