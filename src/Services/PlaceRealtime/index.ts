import { EventEmitter } from "events";
import * as mqtt from "mqtt";
import * as logger from "../../logger";

export default class PlaceRealtimeService extends EventEmitter {
    private client: mqtt.MqttClient;
    public faction: string = "lemmy";

    constructor() {
        super();

        this.client = mqtt.connect(`mqtt://${process.env.REALTIME_HOST}:${process.env.REALTIME_PORT}`, {
            keepalive: 60,
            reschedulePings: true,
            protocolId: 'MQTT',
            protocolVersion: 5,
            reconnectPeriod: 1000,
            connectTimeout: 30 * 1000,
            clean: true,
            clientId: process.env.REALTIME_ID,
            username: process.env.REALTIME_USERNAME,
            password: process.env.REALTIME_PASSWORD
        });

        this.client.on("connect", (packet) => {
            logger.command("R/Place Realtime connected.");
            this.client.subscribe(`templates/${this.faction}/#`);
            this.emit("ready");
        });

        this.client.on("error", (error) => {
            logger.error("Encountered an error from MQTT.\n", error.stack);
        })

        this.client.on("message", (topicString: string, dataBuffer: Buffer, packet: mqtt.IPublishPacket) => {
            let topic = topicString.split("/");
            try {
            let data = JSON.parse(dataBuffer.toString());
      
            this.emit(topic[2], data, packet.retain ?? false);
            } catch (error) {
                logger.error("Encountered an error while trying to emit MQTT message as an event. See error below.\n", error.stack);
            }
        });
    }

    async publish(topic: string, data: any) {
        return this.client.publishAsync(`templates/${this.faction}/${topic}`, Buffer.from(JSON.stringify(data)))
        .catch((error: any) => {
          throw error;
        });
    }
}