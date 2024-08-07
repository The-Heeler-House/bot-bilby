/*
 * Main database for Bot Bilby.
 */

import { BucketItemWithMetadata, BucketStream, ItemBucketMetadata, Client as MinioClient, Tag } from 'minio';
import * as logger from "../../logger";
import * as dotenv from "dotenv";
import { Readable } from 'stream';
dotenv.config();

export default class S3Service {
    private client: MinioClient;
    
    constructor() {
        this.client = new MinioClient({
            endPoint: "s3.heeler.house",
            port: 443,
            useSSL: true,
            accessKey: process.env.S3_ACCESS_KEY,
            secretKey: process.env.S3_SECRET_KEY
        });

        logger.command("Connected to S3 server: s3.heeler.house")
    }

    public async list(bucket: string, prefix?: string, recursive?: boolean, startAfter?: string): Promise<BucketStream<BucketItemWithMetadata>> {
        return await this.client.listObjectsV2(bucket, prefix, recursive, startAfter);
    }

    public async get(bucket: string, name: string, options?: any): Promise<Readable> {
        return await this.client.getObject(bucket, name, options);
    }

    public async getTags(bucket: string, name: string, options?: any): Promise<Tag[]> {
        return await this.client.getObjectTagging(bucket, name, options);
    }

    public async putStream(bucket: string, name: string, stream: Readable, size?: number, metaData?: ItemBucketMetadata): Promise<{ etag: string, versionId: string }> {
        return await this.client.putObject(bucket, name, stream, size, metaData)
    }

    public async putBuffer(bucket: string, name: string, buffer: Buffer | string, metaData?: ItemBucketMetadata): Promise<{ etag: string, versionId: string }> {
        return await this.client.putObject(bucket, name, buffer, buffer.length, metaData);
    }

    public async setTags(bucket: string, name: string, tags: { [key: string]: string }, options?: any) {
        return await this.client.setObjectTagging(bucket, name, tags, options);
    }
}