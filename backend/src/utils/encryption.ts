import crypto from 'crypto';
import { EncryptedMessage } from '../types/index.js';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits

export class EncryptionService {
  private static encryptionKey: Buffer;

  static initialize() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key || key.length !== KEY_LENGTH) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
    }
    this.encryptionKey = Buffer.from(key, 'utf8');
  }

  /**
   * Generate a random encryption key
   */
  static generateKey(): string {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
  }

  /**
   * Encrypt a message using AES-256-GCM
   */
  static encrypt(plaintext: string, key?: string): EncryptedMessage {
    const encryptionKey = key ? Buffer.from(key, 'hex') : this.encryptionKey;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher(ALGORITHM, encryptionKey);
    cipher.setAAD(Buffer.from('defence-mission-track', 'utf8'));

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      content: encrypted,
      encryptionKey: key || this.encryptionKey.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt a message using AES-256-GCM
   */
  static decrypt(encryptedMessage: EncryptedMessage): string {
    const { content, encryptionKey, iv, tag } = encryptedMessage;
    
    const key = Buffer.from(encryptionKey, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    const tagBuffer = Buffer.from(tag, 'hex');

    const decipher = crypto.createDecipher(ALGORITHM, key);
    decipher.setAAD(Buffer.from('defence-mission-track', 'utf8'));
    decipher.setAuthTag(tagBuffer);

    let decrypted = decipher.update(content, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Encrypt message for end-to-end encryption
   * This creates a unique key for each message
   */
  static encryptE2E(plaintext: string): EncryptedMessage {
    const messageKey = this.generateKey();
    return this.encrypt(plaintext, messageKey);
  }

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcryptjs');
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify a password against its hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a secure random token
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Create a message signature for integrity verification
   */
  static signMessage(message: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');
  }

  /**
   * Verify a message signature
   */
  static verifySignature(message: string, signature: string, secret: string): boolean {
    const expectedSignature = this.signMessage(message, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Encrypt sensitive data for storage
   */
  static encryptForStorage(data: any): string {
    const jsonString = JSON.stringify(data);
    const encrypted = this.encrypt(jsonString);
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt sensitive data from storage
   */
  static decryptFromStorage(encryptedData: string): any {
    const encryptedMessage: EncryptedMessage = JSON.parse(encryptedData);
    const decryptedJson = this.decrypt(encryptedMessage);
    return JSON.parse(decryptedJson);
  }
}

// Initialize encryption service on module load
EncryptionService.initialize();
