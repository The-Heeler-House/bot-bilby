/*
    Services provide a way to store non-command functions and functionality in Bot Bilby.
    Such as Databases, API wrappers, HTTP servers, and more.
    All a Service is required to do is export default a Class from which it initialises.

    Services are stored in an object created by the getServices function.
*/
import DatabaseService from "./Database";
import { Client } from "discord.js";
import CommandPreprocessor from "../Commands";
import StateService from "./State";
import BilbyAPIService from "./BilbyAPI";
import PagerService from "./Pager";
import AnalyticsService from "./Analytics";


export default function getServices(client: Client, commands: CommandPreprocessor): Services {
    // Services not accessable, but need either the Client or CommandPreprocessor.
    new BilbyAPIService(client);

    // Services accessable to commands and events
    return {
        commands,
        database: new DatabaseService(),
        state: new StateService(),
        pager: new PagerService(client),
        analytics: new AnalyticsService()
    }
}

export interface Services {
    commands: CommandPreprocessor,
    database: DatabaseService,
    state: StateService,
    pager: PagerService,
    analytics: AnalyticsService
}