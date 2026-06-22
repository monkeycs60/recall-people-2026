// R2-on-S3 shim — implémente le sous-ensemble de Workers R2Bucket utilisé par
// avatar.ts (put / get / list / delete). R2 est S3-compatible, donc on tape le
// même bucket via le SDK S3 + clés (au lieu du binding Workers).

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

// Objet renvoyé par get(), compatible avec l'usage dans avatar.ts :
//   `object.body` (passé à new Response()) et `object.httpMetadata?.contentType`.
type R2GetResult = {
  body: Uint8Array;
  httpMetadata?: { contentType?: string };
};

export class R2OnS3 {
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
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<void> {
    const body =
      value instanceof Uint8Array ? value : new Uint8Array(value as ArrayBuffer);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: options?.httpMetadata?.contentType,
      })
    );
  }

  async get(key: string): Promise<R2GetResult | null> {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key })
      );
      if (!res.Body) return null;
      const bytes = await res.Body.transformToByteArray();
      return { body: bytes, httpMetadata: { contentType: res.ContentType } };
    } catch (err: unknown) {
      const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw err;
    }
  }

  async list(options?: {
    prefix?: string;
  }): Promise<{ objects: { key: string }[] }> {
    const res = await this.client.send(
      new ListObjectsV2Command({ Bucket: this.bucket, Prefix: options?.prefix })
    );
    return {
      objects: (res.Contents ?? []).map((o: { Key?: string }) => ({
        key: o.Key as string,
      })),
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    );
  }
}
