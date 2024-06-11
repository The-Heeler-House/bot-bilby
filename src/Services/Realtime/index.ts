import { EventEmitter } from "events";
import * as mqtt from "mqtt";
import * as logger from "../../logger";

export default class RealtimeService extends EventEmitter {
    private client: mqtt.MqttClient;

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
            this.client.subscribe(`templates/bluey/#`);
            this.emit("ready");
        });

        this.client.on("message", (topicString: string, dataBuffer: Buffer, packet: mqtt.IPublishPacket) => {
            let topic = topicString.split("/");
            let data = JSON.parse(dataBuffer.toString());
      
            this.emit(topic[2], data, packet.retain ?? false);
        });
    }

    async publish(topic: string, data: any) {
        return this.client.publishAsync(`templates/${process.env.REALTIME_FACTION}/${topic}`, Buffer.from(JSON.stringify(data)))
        .catch((error: any) => {
          console.error(error);
          throw error;
        });
    }
}