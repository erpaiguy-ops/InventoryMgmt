import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import type { Request } from 'express';

import { SupabaseService } from '../supabase/supabase.service';

export interface RequestProfile {
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  profile?: RequestProfile;
  token?: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const user = await this.supabaseService.verifyToken(token);

    if (!user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const { data: profile, error } = await this.supabaseService
      .getClient()
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      throw new UnauthorizedException('No profile associated with this account');
    }

    request.user = user;
    request.profile = { role: profile.role };
    request.token = token;
    return true;
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return null;
    }

    return header.slice('Bearer '.length).trim();
  }
}
