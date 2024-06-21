import { Message } from "discord.js";
import { ObjectId, WithId } from "mongodb";
import { Services } from "../Services";
import moment from "moment-timezone";
import Trigger from "../Services/Database/models/trigger";

/**
 * Gets all the directive tags in a string.
 * @param string The string to iterate through
 */
function getDirectiveTags(string: string): string[] {
    let directives: string[] = [];

    let starts: number[] = []; // We store index numbers of found { characters so we can properly handle directives within directives for functions.
    for (let i = 0; i < string.length; i++) {
        const ch = string[i];
        const prev = string[i-1] || "";

        if (ch == "{" && prev != "\\") {
            starts.push(i);
        }
        if (ch == "}" && prev != "\\" && starts.length != 0) {
            let directive = string.slice(starts.pop()+1, i);
            directives.push(directive);
        }
    }

    return directives;
}

async function processDirectives(
    args: string[],
    message: Message,
    trigger: {
        regexp: RegExpExecArray,
        id: ObjectId,
        response: string
    },
    services: Services
): Promise<string> {
    const command = args[0], argv = args.slice(1);
    let output = "";

    /*
    ? {<variable>[.path_if_applicable]}
    */
    let variables = {
        uses: (await services.database.collections.triggers.findOne({ _id: trigger.id }) as WithId<Trigger>).meta.uses,
        user: {
            id: message.author.id,
            name: message.author.username,
            toString: () => `<@${message.author.id}>`
        },
        group: trigger.regexp.slice(1)
    }

    // custom toStrings
    variables.group.toString = () => `[${variables.group.join(", ")}]`;

    switch (command) {
        /*
        ? {cur_time[:<iana_timezone>][:<moment.js_time_format>]}
        */
        case "cur_time":
            let defaultTz = Intl.DateTimeFormat().resolvedOptions().timeZone
            let defaultFormat = "LTS"
            output = moment()
                .tz(argv[0] ?? defaultTz)
                .format(argv[1] ?? defaultFormat)
            break
        default:
            let path = command.split(".")
            let root = path[0], extra = path.slice(1);
            if (variables[root] != undefined) {
                if (typeof variables[root] === "object") {
                    let current = variables[root];

                    if (extra.length == 0) {
                        output = current;
                    } else {
                        for (let i = 0; i < extra.length; i++) {
                            current = current[extra[i]];

                            if (i == extra.length - 1) {
                                output = current;
                            }
                        }
                    }
                } else {
                    output = variables[root];
                }
            }
    }
    return output
}

export async function processResponse(
    message: Message,
    trigger: {
        regexp: RegExpExecArray,
        id: ObjectId,
        response: string
    }, services: Services
) {
    let response = trigger.response

    let directives = getDirectiveTags(response);

    for await (const directive of directives) {
        response = response.replace(
            `{${directive}}`,
            await processDirectives(directive.split(":"), message, trigger, services));
    }

    message.channel.send(response);
}