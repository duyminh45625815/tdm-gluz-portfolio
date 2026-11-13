import { ConflictException, BadRequestException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { createInterface } from 'node:readline/promises';
import { StringDecoder } from 'node:string_decoder';
import { stdin, stdout } from 'node:process';
import type { INestApplicationContext } from '@nestjs/common';
import { AdminProvisioningService } from '../admin-users/admin-provisioning.service.js';
import { AppModule } from '../app.module.js';

async function promptForPassword(prompt: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('An interactive terminal is required to enter a password securely.');
  }

  return new Promise((resolve, reject) => {
    const decoder = new StringDecoder('utf8');
    let password = '';
    let finished = false;

    const cleanup = () => {
      if (finished) {
        return;
      }

      finished = true;
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
    };

    const onData = (chunk: Buffer) => {
      for (const character of decoder.write(chunk)) {
        if (character === '\r' || character === '\n') {
          cleanup();
          resolve(password);
          return;
        }

        if (character === '\u0003' || character === '\u0004') {
          cleanup();
          reject(new Error('Password entry was cancelled.'));
          return;
        }

        if (character === '\u007f' || character === '\b') {
          password = Array.from(password).slice(0, -1).join('');
        } else if (character >= ' ') {
          password += character;
        }
      }
    };

    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function createFirstAdmin(): Promise<void> {
  let app: INestApplicationContext | undefined;

  try {
    const prompts = createInterface({ input: stdin, output: stdout });
    let email: string;

    try {
      email = await prompts.question('Admin email: ');
    } finally {
      prompts.close();
    }

    const password = await promptForPassword('Password (input hidden): ');
    const confirmation = await promptForPassword(
      'Confirm password (input hidden): ',
    );

    if (password !== confirmation) {
      throw new BadRequestException('The passwords do not match.');
    }

    app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });

    const provisioningService = app.get(AdminProvisioningService, {
      strict: false,
    });
    await provisioningService.createAdmin(email, password);
    console.log('Admin account created.');
  } catch (error) {
    if (
      error instanceof ConflictException ||
      error instanceof BadRequestException
    ) {
      console.error(error.message);
    } else {
      console.error(
        'Admin provisioning failed. Check the interactive terminal and backend configuration.',
      );
    }

    process.exitCode = 1;
  } finally {
    if (app) {
      await app.close();
    }
  }
}

await createFirstAdmin();
