import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly db;
    private readonly jwtService;
    private readonly configService;
    constructor(db: any, jwtService: JwtService, configService: ConfigService);
    register(dto: RegisterDto): Promise<any>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: any;
            name: any;
            email: any;
            role: any;
        };
    }>;
    getProfile(userId: number): Promise<any>;
}
