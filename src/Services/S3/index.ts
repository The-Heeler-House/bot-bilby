/*
 * Main database for Bot Bilby.
 */

import { BucketItemWithMetadata, BucketStream, ItemBucketMetadata, Client as MinioClient, Tag } from 'minio';
import * as logger from "../../logger";
import { DATA_RETENTION_DAYS } from "../../constants";
import * as dotenv from "dotenv";
import { Readable } from 'stream';
dotenv.config();

export default class S3Service {
    private client: MinioClient;
    
    constructor() {
        this.client = new MinioClient({
            endPoint: process.env.S3_ENDPOINT,
            port: 443,
            useSSL: true,
            accessKey: process.env.S3_ACCESS_KEY,
            secretKey: process.env.S3_SECRET_KEY
        });

        logger.command(`Connected to S3 server: ${process.env.S3_ENDPOINT}`)
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

    /**
     * Installs a lifecycle rule so that archived media expires on its own after
     * the retention window documented in PRIVACY.md.
     *
     * The media bucket holds attachments posted by members, which we keep only
     * so that moderators can review deleted media. Letting the storage server
     * expire them is what keeps that from becoming indefinite retention of user
     * content, and it covers objects written before this rule existed too.
     *
     * Never throws: a storage server that rejects the rule should not stop the
     * bot from starting, but it does need to be loud in the logs.
     */
    public async applyRetentionPolicy(bucket: string, days: number = DATA_RETENTION_DAYS): Promise<void> {
        try {
            await this.client.setBucketLifecycle(bucket, {
                Rule: [
                    {
                        ID: `bilby-retention-${days}d`,
                        Status: "Enabled",
                        Filter: { Prefix: "" },
                        Expiration: { Days: days }
                    }
                ]
            });

            logger.command(`Applied a ${days} day retention policy to the "${bucket}" bucket.`);
        } catch (error) {
            logger.warning(
                `Failed to apply the ${days} day retention policy to the "${bucket}" bucket.`,
                "Archived media may not expire on schedule — check the storage server.\n",
                error
            );
        }
    }
}