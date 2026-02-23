import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient as PrismaClientCtor } from '../generated/prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly _client: InstanceType<typeof PrismaClientCtor>;

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = this.configService.getOrThrow<string>('DATABASE_URL');
    const adapter = new PrismaPg({ connectionString: databaseUrl });

    this._client = new PrismaClientCtor({ adapter });
  }

  get client(): InstanceType<typeof PrismaClientCtor> {
    return this._client;
  }

  async onModuleInit(): Promise<void> {
    await this._client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this._client.$disconnect();
  }
}