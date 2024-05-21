/*
    Services provide a way to store non-command functions and functionality in Bot Bilby.
    Such as Databases, API wrappers, HTTP servers, and more.
    All a Service is required to do is export default a Class from which it initialises.

    Services are stored in an object created by the getServices function.
*/
import ExampleService from "./ExampleService";
import Database from "./Database";
import { Client } from "discord.js";
import CommandPreprocessor from "../Commands";

export default function getServices(client: Client, commands: CommandPreprocessor): Services {
    return {
        commands,

        example: new ExampleService(),
        database: new Database()
    }
}

export interface Services {
    commands: CommandPreprocessor,

    example: ExampleService,
    database: Database
}