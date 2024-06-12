import * as minio from "minio";
import * as logger from "../../logger";

export default class PlaceCDNService extends minio.Client {
    private client: minio.Client;
    
    constructor() {
        super({
            endPoint: 'cdn.place.heeler.house',
            useSSL: true,
            accessKey: process.env.CDN_ACCESS_KEY,
            secretKey: process.env.CDN_SECRET_KEY,
        });

        logger.command("Connected to BlueyPlace CDN");
    }
}