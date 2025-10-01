import { Message, TextChannel } from "discord.js";
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
    variables: any,
    services: Services
): Promise<{ text: string, variables: any, terminate: boolean }> {
    const command = args[0], argv = args.slice(1);
    let output = {
        text: "",
        variables,
        terminate: false
    };

    let path = command.split(".");
    let root = path[0], extra = path.slice(1);
    if (variables[root] != undefined) {
        if (typeof variables[root] === "function") {
            // Support for functions in variables.
            let funcOutput = variables[root](argv);
            if (typeof funcOutput === "object") {
                output.text = funcOutput.text;
                output.terminate = funcOutput.terminate;
            } else {
                output.text = funcOutput;
            }
        } else
        if (typeof variables[root] === "object") {
            let current = variables[root];

            if (extra.length == 0) {
                output.text = current;
            } else {
                for (let i = 0; i < extra.length; i++) {
                    current = current[extra[i]];

                    if (i == extra.length - 1) {
                        output.text = current;
                    }
                }
            }
        } else {
            output.text = variables[root];
        }
    } else
        output.text = args.join(":");

    return output;
}

export async function processResponse(
    message: Message,
    trigger: {
        regexp: RegExpExecArray,
        id: ObjectId,
        response: string
    }, services: Services
) {
    // All variables for the currently running trigger are stored here. This includes trigger-defined variables via the var function.
    let variables = {
        // Built-in variables.
        uses: (await services.database.collections.triggers.findOne({ _id: trigger.id }) as WithId<Trigger>).meta.uses,
        user: {
            id: message.author.id,
            name: message.author.username,
            toString: () => `<@${message.author.id}>`
        },

        // Fetch a user
        // Read a property of a user. Used as {fetch_user:<user_id>:<property.path>}
        // For reference on what to read on property, refer to Discord.js's documentation on the User object
        fetch_user: async function(argv: string[]) {
            try {
                const member = await message.guild.members.fetch(argv[0])
                let property = member
                for (const p of argv[1].split(".")) {
                    property = property[p]
                }
                return property
            } catch (e) {
                return ""
            }
        },

        // Functions.
        // Select capture group. Used as {group:[index]} (index start as 0 for the first capture group, and so on).
        // If no index is provided, the content of all capture group will be displayed.
        group: function(argv: string[]) {
            const captureGroups = trigger.regexp.slice(1)
            if ((argv[0] ?? "") == "")
                return `[${captureGroups.join(", ")}]`
            else
                return captureGroups[parseInt(argv[0])] ?? "undefined"
        },
        //group: trigger.regexp.slice(1),

        // Outputs the current time. Used as {cur_time:[timezone]:[format]}.
        // Default timezone is host server timezone, default format is LTS (Hour:Minute:Second AM/PM).
        cur_time: function(argv: string[]) {
            let defaultTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
            let defaultFormat = "LTS";
            return moment().tz(argv[0] ?? defaultTz).format(argv[1] ?? defaultFormat); // 2:00:00 PM
        },
        // Assigns a variable. Used as {var:<variable_name>:<value>}. Does not output anything.
        var: function(argv: any[]) {
            variables[argv[0]] = argv.slice(1).join(":")
            return "";
        },
        // Checks if the operation is true and outputs respectively.
        // Used as {if:<operation>:<true_output>:[false_output]}.
        // If no false_output is provided, this directive outputs nothing.
        if: function(argv: string[]) {
            let operation = argv[0];
            let trueOutput = argv[1];
            let falseOutput = argv[2];

            if (operation == "true") {
                return trueOutput;
            } else {
                return falseOutput || "";
            }
        },
        // Checks if the operation is true and if it is, the output is the only content
        // and no further directives are ran aside from the ones in the output.
        // If not then this directive outputs nothing.
        //
        // If no output is provided and the operation is true, no response is sent.
        // Usage: {break:<operation>:[output]}
        break: function(argv: string[]) {
            let operation = argv[0];
            let output = argv.slice(1).join(":");

            if (operation == "true") {
                return {
                    text: output || "",
                    terminate: true
                }
            }
            return "";
        },

        // Comparator functions. Used as {<comparer>:<value>:<value>}, returns "true" or "false".
        "==": function(argv: any[]) {
            return (argv[0] == argv[1]).toString();
        },
        ">": function(argv: string[]) {
            return (parseFloat(argv[0]) > parseFloat(argv[1])).toString();
        },
        ">=": function(argv: string[]) {
            return (parseFloat(argv[0]) >= parseFloat(argv[1])).toString();
        },
        "<": function(argv: string[]) {
            return (parseFloat(argv[0]) < parseFloat(argv[1])).toString();
        },
        "<=": function(argv: string[]) {
            return (parseFloat(argv[0]) <= parseFloat(argv[1])).toString();
        },
        // Special comparer function for ranges. Used as {range:<min_value>:<value>:<max_value>}. Returns "true" if within range, "false" if outside range
        "range": function(argv: string[]) {
            return (parseFloat(argv[0]) < parseFloat(argv[1]) && parseFloat(argv[2]) > parseFloat(argv[1])).toString();
        },
        // Math related function. Used as {math:<operator>:<first_value>:<second_value>}
        // <operator> includes: +, -, *, /, //, **, %
        "math": function(argv: string[]) {
            switch (argv[0]) {
                case "+":
                    return parseFloat(argv[1]) + parseFloat(argv[2])
                case "-":
                    return parseFloat(argv[1]) - parseFloat(argv[2])
                case "*":
                    return parseFloat(argv[1]) * parseFloat(argv[2])
                case "/":
                    return parseFloat(argv[1]) / parseFloat(argv[2])
                case "//":
                    return Math.floor(parseFloat(argv[1]) / parseFloat(argv[2]))
                case "**":
                    return parseFloat(argv[1]) ** parseFloat(argv[2])
                case "%":
                    return parseFloat(argv[1]) % parseFloat(argv[2])
            }
        }
    }

    let response = trigger.response;

    let directives = getDirectiveTags(response);
    let terminated = false;

    for await (const directive of directives) {
        if (terminated) return;
        console.log(directive)
        let result = await processDirectives(directive.split(":"), message, trigger, variables, services);
        variables = result.variables;

        if (result.terminate) {
            // Terminate execution while still processing the output.
            terminated = true;
            response = "";
            return processResponse(message, { regexp: trigger.regexp, id: trigger.id, response: result.text }, services);
        }

        response = response.replace(`{${directive}}`, result.text);

        let currentIndex = directives.indexOf(directive);
        for (var i = currentIndex+1; i < directives.length; i++) {
            // Replace all instances of this directive in future directives.
            if (!directives[i].includes(`{${directive}}`)) continue;
            console.log(`replacing {${directive}} in ${directives[i]} with ${result.text}`);
            console.log(result.text);
            directives[i] = directives[i].replace(`{${directive}}`, result.text);
        }
    }

    if (response.trim() != "")
        (message.channel as TextChannel).send(response.trim());
}