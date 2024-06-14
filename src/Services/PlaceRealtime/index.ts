import { EventEmitter } from "events";
import * as mqtt from "mqtt";
import * as logger from "../../logger";

export default class PlaceRealtimeService extends EventEmitter {
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
            this.client.subscribe(`templates/bluey_allies/#`);
            this.emit("ready");
        });

        this.client.on("error", (error) => {
            logger.error("Encountered an error from MQTT.\n", error.stack);
        })

        this.client.on("message", (topicString: string, dataBuffer: Buffer, packet: mqtt.IPublishPacket) => {
            let topic = topicString.split("/");
            try {
            let data = JSON.parse(dataBuffer.toString());
      
            this.emit(`${topic[1]}-${topic[2]}`, data, packet.retain ?? false);
            this.emit(topic[2], data, packet.retain ?? false);
            } catch (error) {
                logger.error("Encountered an error while trying to emit MQTT message as an event. See error below.\n", error.stack);
            }
        });
    }

    async publish(template: "bluey" | "bluey_allies", topic: string, data: any, retain: boolean = false) {
        return this.client.publishAsync(`templates/${template}/${topic}`, Buffer.from(JSON.stringify(data)), {
            retain
        })
        .catch((error: any) => {
          throw error;
        });
    }
}