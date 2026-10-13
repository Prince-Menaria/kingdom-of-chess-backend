import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Pool } from "pg";
import { DATABASE } from "./db/database.module";

type DatabaseClient = {
  $client: Pool;
};

@Controller("api/v1/health")
export class HealthController {
  constructor(
    @Inject(DATABASE)
    private readonly db: DatabaseClient,
  ) {}

  @Get()
  async check() {
    try {
      await this.db.$client.query("SELECT 1");

      return {
        success: true,
        message: "Kingdom of Chess API is healthy",
        database: "connected",
      };
    } catch {
      throw new ServiceUnavailableException({
        success: false,
        message: "Database connection failed",
      });
    }
  }
}
