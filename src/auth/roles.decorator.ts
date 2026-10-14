import { SetMetadata } from '@nestjs/common';

export const Roles = (role: 'coach' | 'student') =>
  SetMetadata('requiredRole', role);
