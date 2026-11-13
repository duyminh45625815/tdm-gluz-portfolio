import { Injectable, type OnModuleInit } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as argon2 from 'argon2';
import { isArgon2idHash } from './admin-user.utils.js';

@Injectable()
export class PasswordHashService implements OnModuleInit {
  private dummyHash: string | undefined;

  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.hash(randomBytes(32).toString('base64url'));
  }

  hash(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id });
  }

  async verify(
    passwordHash: string | undefined,
    password: string,
  ): Promise<boolean> {
    const validHash = isArgon2idHash(passwordHash);
    const candidateHash =
      (validHash ? passwordHash : undefined) ??
      this.dummyHash ??
      (await this.hash(randomBytes(32).toString('base64url')));
    const matches = await argon2.verify(candidateHash, password);

    return validHash && matches;
  }
}
