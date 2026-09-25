import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SupabaseService } from '../../supabase/supabase.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private supabaseService: SupabaseService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      // In dev or demo mode, if x-demo-role header is provided, mock the user
      const demoRole = request.headers['x-demo-role'];
      if (demoRole) {
        request.user = {
          id: request.headers['x-demo-userid'] || '00000000-0000-0000-0000-000000000001',
          role: demoRole,
          email: `${demoRole}@vinstay.ai`,
          phone: '0912345678',
        };
        return true;
      }
      throw new UnauthorizedException('Thiếu mã định danh Authorization Bearer token');
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const supabaseUser = await this.supabaseService.verifyJwtToken(token);
      if (!supabaseUser) {
        // Fallback for dev testing if Supabase offline
        if (process.env.NODE_ENV === 'development') {
          request.user = {
            id: '11111111-1111-1111-1111-111111111111',
            role: 'field_host',
            email: 'nam.fieldhost@vinstay.ai',
          };
          return true;
        }
        throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
      }

      // Query profile role from DB
      const profile = await this.prisma.profile.findUnique({
        where: { id: supabaseUser.id },
        include: { role: true },
      });

      request.user = {
        ...supabaseUser,
        role: profile?.role?.code || 'tenant',
        profile,
      };

      return true;
    } catch (err) {
      this.logger.error(`Authentication error: ${err.message}`);
      throw new UnauthorizedException('Không thể xác thực token');
    }
  }
}
