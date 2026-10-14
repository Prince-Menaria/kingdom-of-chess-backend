import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const requiredRole = Reflect.getMetadata(
      'requiredRole',
      context.getHandler(),
    );

    if (!requiredRole) {
      return true;
    }

    if (request.user?.role !== requiredRole) {
      throw new ForbiddenException('You do not have permission');
    }

    return true;
  }
}
