import { Client } from "discord.js";
import { existsSync, readFileSync } from "fs";
import path from "path";

const STATE_PATH = path.join(__dirname, "../../Assets/state.json");

export default class StateService {
    public readonly state: State;

    constructor() {
        if (existsSync(STATE_PATH)) {
            this.state = JSON.parse(readFileSync(STATE_PATH).toString());
        } else {
            // Default values for the state are defined here.
            this.state = {
                joinGate: true
            }
        }
    }

    set(key: string, value: any) {
        this.state[key] = value;
    }
}

export interface State {
    joinGate: boolean
}