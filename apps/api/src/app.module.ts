import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AllExceptionsFilter } from './common/filters/exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SupabaseModule } from './common/supabase/supabase.module';
import configuration from './config/configuration';
import { envValidationSchema } from './config/validation';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { OwnerModule } from './modules/owner/owner.module';
import { UsersModule } from './modules/users/users.module';

// Products/Inventory/Suppliers/PurchaseOrders/SalesOrders/Reports are
// deliberately unregistered on this branch (v2 Phase 1): their v1-model
// tables and code don't exist in the v2 schema yet — they're rebuilt
// tenant-scoped in Phase 3. Full working versions remain on `main`.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    SupabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    OwnerModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
