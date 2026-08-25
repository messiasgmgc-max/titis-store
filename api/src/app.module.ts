import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { ConsultationModule } from './consultation/consultation.module';
import { LooksModule } from './looks/looks.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    ConsultationModule,
    LooksModule,
    AuthModule,
  ],
})
export class AppModule {}
