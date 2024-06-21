import { Message } from "discord.js";
import { ObjectId } from "mongodb";
import { Services } from "../Services";
import moment from "moment-timezone";

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

function processDirectives(args: string[]): string {
    const command = args[0], argv = args.slice(1);
    let output = "";


    switch (command) {
        /*
        ? {cur_time;<iana_timezone>?:<moment.js_format>?}
        */
        case "cur_time":
            let defaultTz = Intl.DateTimeFormat().resolvedOptions().timeZone
            let defaultFormat = "LTS"
            output = moment()
                .tz(argv[0] ?? defaultTz)
                .format(argv[1] ?? defaultFormat)
            break
    }
    return output
}

export async function processResponse(message: Message, trigger: { regexp: RegExpExecArray, id: ObjectId, response: string }, services: Services) {
    let response = trigger.response

    let directives = getDirectiveTags(response);

    for await (const directive of directives) {
        response = response.replace(`{${directive}}`, processDirectives(directive.split(":")));
    }

    message.channel.send(response);
}