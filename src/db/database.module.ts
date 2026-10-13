
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export const DATABASE = "DATABASE";

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DATABASE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString = config.get<string>("DATABASE_URL");

        if (!connectionString) {
          throw new Error("DATABASE_URL is not configured");
        }

        const pool = new Pool({ connectionString });

        return drizzle({ 
            client: pool,
            schema, 
        });
      },
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule {}
