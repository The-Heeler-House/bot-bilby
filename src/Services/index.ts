/*
    Services provide a way to store non-command functions and functionality in Bot Bilby.
    Such as Databases, API wrappers, HTTP servers, and more.
    All a Service is required to do is export default a Class from which it initialises.

    Services are stored in an object.
*/
import ExampleService from "./ExampleService";

export default function getServices(client): Services {
    return {
        example: new ExampleService()
    }
}

export interface Services {
    example: ExampleService
}