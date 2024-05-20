function log(level = "MESSAGE", message) {
    let color = 32;
    switch (level.toUpperCase()) {
        case "ERROR":
            color = 31;
            break;
        case "WARNING":
            color = 33;
            break;
        case "COMMAND":
            color = 34;
            break;
        case "BILBY":
            color = 90;
            break;
    }

    const timestamp = new Date().toISOString().replace(/T/, " ").replace(/\..+/, "");
    console.log(`\x1b[36m[${timestamp}]\x1b[0m \x1b[${color}m[${level.toUpperCase()}]\x1b[0m: ${message.join(" ")}`)
}

export function message(...message: string[]) { log("MESSAGE", message); }
export function error(...message: string[]) { log("ERROR", message); }
export function warning(...message: string[]) { log("WARNING", message); }
export function command(...message: string[]) { log("COMMAND", message); }
export function bilby(...message: string[]) { log("BILBY", message); }