import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import type { AvatarObject, AvatarObjectStore } from '../types/runtime';

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

// Cloudflare R2 remains the avatar object store. The Node API hosted on the VPS
// accesses it through its S3-compatible endpoint and scoped access keys.
export class R2ObjectStore implements AvatarObjectStore {
  private client: S3Client;
  private bucket: string;

  constructor(cfg: R2Config) {
    this.bucket = cfg.bucket;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
    });
  }

  async put(
    key: string,
    value: ArrayBuffer | Uint8Array | Buffer,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
  ): Promise<void> {
    const body = value instanceof Uint8Array ? value : new Uint8Array(value as ArrayBuffer);
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: options?.httpMetadata?.contentType,
      CacheControl: options?.httpMetadata?.cacheControl,
    }));
  }

  async get(key: string): Promise<AvatarObject | null> {
    try {
      const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!res.Body) return null;
      const bytes = await res.Body.transformToByteArray();
      return { body: new Uint8Array(bytes), httpMetadata: { contentType: res.ContentType } };
    } catch (err: unknown) {
      const error = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw err;
    }
  }

  async list(options?: { prefix?: string }): Promise<{ objects: { key: string }[] }> {
    const res = await this.client.send(new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: options?.prefix,
    }));
    return {
      objects: (res.Contents ?? []).map((object) => ({ key: object.Key as string })),
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
