import type { Profile, ProfileRole } from '@inventory-mgmt/shared-types';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { SupabaseService } from '../../common/supabase/supabase.service';

import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

function toProfile(row: {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}): Profile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role as ProfileRole,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ActivityLogEntry {
  type: 'stock_movement' | 'purchase_order' | 'sales_order';
  id: string;
  description: string;
  createdAt: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(): Promise<Profile[]> {
    const { data, error } = await this.supabaseService
      .getTable('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new NotFoundException(error.message);
    }

    return (data ?? []).map(toProfile);
  }

  async findOne(id: string): Promise<Profile> {
    const { data, error } = await this.supabaseService
      .getTable('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return toProfile(data);
  }

  async updateRole(id: string, dto: UpdateRoleDto): Promise<Profile> {
    const { data, error } = await this.supabaseService
      .getTable('profiles')
      .update({ role: dto.role })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(error?.message ?? 'Failed to update role');
    }

    return toProfile(data);
  }

  /** Direct creation with an admin-chosen password (see also inviteUser for email-invite based signup). */
  async createUser(email: string, password: string, role?: ProfileRole): Promise<Profile> {
    const admin = this.supabaseService.getClient();

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      throw new UnauthorizedException(authError?.message ?? 'Failed to create user');
    }

    if (role) {
      await admin.from('profiles').update({ role }).eq('id', authData.user.id);
    }

    return this.findOne(authData.user.id);
  }

  /** Sends a Supabase invite email; the user sets their own password via the link. */
  async inviteUser(dto: InviteUserDto): Promise<{ userId: string; email: string }> {
    const admin = this.supabaseService.getClient();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(dto.email);

    if (error || !data.user) {
      throw new ConflictException(error?.message ?? 'Failed to invite user');
    }

    if (dto.role) {
      await admin.from('profiles').update({ role: dto.role }).eq('id', data.user.id);
    }

    return { userId: data.user.id, email: dto.email };
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await this.supabaseService.getClient().auth.admin.deleteUser(id);

    if (error) {
      throw new NotFoundException(error.message);
    }
  }

  async getActivityLog(userId: string, limit = 50): Promise<ActivityLogEntry[]> {
    const [movements, purchaseOrders, salesOrders] = await Promise.all([
      this.supabaseService
        .getTable('stock_movements')
        .select('id, product_id, movement_type, quantity_change, created_at')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(limit),
      this.supabaseService
        .getTable('purchase_orders')
        .select('id, po_number, created_at')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(limit),
      this.supabaseService
        .getTable('sales_orders')
        .select('id, order_number, created_at')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);

    const entries: ActivityLogEntry[] = [
      ...(movements.data ?? []).map((row) => ({
        type: 'stock_movement' as const,
        id: row.id,
        description: `${row.movement_type} of ${row.quantity_change} for product ${row.product_id}`,
        createdAt: row.created_at,
      })),
      ...(purchaseOrders.data ?? []).map((row) => ({
        type: 'purchase_order' as const,
        id: row.id,
        description: `Created purchase order ${row.po_number}`,
        createdAt: row.created_at,
      })),
      ...(salesOrders.data ?? []).map((row) => ({
        type: 'sales_order' as const,
        id: row.id,
        description: `Created sales order ${row.order_number}`,
        createdAt: row.created_at,
      })),
    ];

    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  async getStats(): Promise<{ totalUsers: number; byRole: Record<string, number> }> {
    const { data, error } = await this.supabaseService.getTable('profiles').select('role');

    if (error) {
      throw new NotFoundException(error.message);
    }

    const byRole: Record<string, number> = {};
    for (const row of data ?? []) {
      byRole[row.role] = (byRole[row.role] ?? 0) + 1;
    }

    return { totalUsers: (data ?? []).length, byRole };
  }
}
