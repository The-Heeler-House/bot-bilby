import { Client } from "discord.js";

export default class ExampleService {
    protected initDate: Date;

    constructor() {
        this.initDate = new Date();
    }

    get message() {
        return `This sentence came from a service which was initiated at ${this.initDate.toString()}.`;
    }
}