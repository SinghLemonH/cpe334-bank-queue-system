import * as argon2 from 'argon2';

export class PasswordHasher {
  private static readonly PROD_OPTIONS: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  };

  private static readonly TEST_OPTIONS: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 4096,
    timeCost: 2,
    parallelism: 1,
  };

  static async hash(password: string): Promise<string> {
    const isTest = process.env.NODE_ENV === 'test';
    const options = isTest ? this.TEST_OPTIONS : this.PROD_OPTIONS;
    return argon2.hash(password, options);
  }

  static async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
