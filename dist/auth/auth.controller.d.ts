import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
type AuthenticatedRequest = Request & {
    user: {
        sub: number;
        email: string;
        role: 'coach' | 'student';
    };
};
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        success: boolean;
        user: any;
    }>;
    login(dto: LoginDto, response: Response): Promise<{
        success: boolean;
        user: {
            id: any;
            name: any;
            email: any;
            role: any;
        };
    }>;
    logout(response: Response): {
        success: boolean;
        message: string;
    };
    me(request: AuthenticatedRequest): Promise<{
        success: boolean;
        user: any;
    }>;
}
export {};
