/*
    Services provide a way to store non-command functions and functionality in Bot Bilby.
    Such as Databases, API wrappers, HTTP servers, and more.
    All a Service is required to do is export default a Class from which it initialises.

    Services are stored in an object.
*/
import ExampleService from "./ExampleService";
import Database from "./Database";
import { Client } from "discord.js";

export default function getServices(client: Client): Services {
    return {
        example: new ExampleService(),
        database: new Database()
    }
}

export interface Services {
    example: ExampleService,
    database: Database
}