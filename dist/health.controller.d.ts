import { Pool } from "pg";
type DatabaseClient = {
    $client: Pool;
};
export declare class HealthController {
    private readonly db;
    constructor(db: DatabaseClient);
    check(): Promise<{
        success: boolean;
        message: string;
        database: string;
    }>;
}
export {};
