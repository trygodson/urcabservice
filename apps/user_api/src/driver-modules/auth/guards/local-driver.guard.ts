import { AuthGuard } from '@nestjs/passport';

export class LocalDriverAuthGuard extends AuthGuard('local-driver') {}
