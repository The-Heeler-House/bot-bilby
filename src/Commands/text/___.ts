import { AttachmentBuilder, Message, TextChannel } from "discord.js";
import { Services } from "../../Services";
import TextCommand, { TextCommandBuilder } from "../TextCommand";
import { roleIds, channelIds } from "../../constants";

const lol = (uid: string, init: number, init2 = init) => `kernel panic!
error: debugger not attached, dumping to stdout

invoker PID ${Math.floor(Math.random() * 100000)}, UID ${uid}
discord.js version 14.18.0, node.js version 20.4
stack trace:
  - stack_dump 0x${init.toString(16)}
  - panic 0x${(init = init - Math.floor(Math.random() * 1000)).toString(16)}
  - mount_root 0x${(init = init - Math.floor(Math.random() * 1000)).toString(16)}
  - memdump 0x${(init = init - Math.floor(Math.random() * 1000)).toString(16)}
  - memlock 0x${(init = init - Math.floor(Math.random() * 1000)).toString(16)}
  - command_preprocessor 0x${(init = init - Math.floor(Math.random() * 1000)).toString(16)}
  - node 0x${(init = init - Math.floor(Math.random() * 1000)).toString(16)}
  - douchebag 0x${(init = init - Math.floor(Math.random() * 1000)).toString(16)}

memdump
${init2.toString(16)} feff ff48 8943 08eb cae8 02d6 f9ff 6690  ...H.C........f.
${(init2 = init2 - 16).toString(16)} 5548 89e5 5348 83ec 1864 488b 1c25 2800  UH..SH...dH..%(.
${(init2 = init2 - 16).toString(16)} 0000 4889 5de8 4889 fb48 8b7f 0848 85ff  ..H.].H..H...H..
${(init2 = init2 - 16).toString(16)} 744e e879 4801 0080 3daf 7307 0000 4889  tN.yH...=.s...H.
${(init2 = init2 - 16).toString(16)} c689 d174 0583 fa01 7476 48bf 0000 0000  ...t....tvH.....
${(init2 = init2 - 16).toString(16)} ffff ffff 4889 f089 ce48 89d1 4821 f948  ....H....H..H!.H
${(init2 = init2 - 16).toString(16)} 09f1 4889 ca48 8b4d e864 482b 0c25 2800  ..H..H.M.dH+.%(.
${(init2 = init2 - 16).toString(16)} 0000 0f85 c100 0000 488b 5df8 c9c3 6690  ........H.]...f.
${(init2 = init2 - 16).toString(16)} 488b 03bf 2800 0000 4889 45e0 e8df 9fff  H...(...H.E.....
${(init2 = init2 - 16).toString(16)} ff31 c948 8d75 e0ba 0100 0000 4889 4308  .1.H.u......H.C.
${(init2 = init2 - 16).toString(16)} 4889 c7e8 9807 0100 4885 c074 3348 8b7b  H.......H..t3H.{
${(init2 = init2 - 16).toString(16)} 08e9 7cff ffff 8979 6f75 2073 696c 6c79  ..|....you.silly
`;
export default class ___Command extends TextCommand {
    public data = new TextCommandBuilder()
        .setName("die")
        .setDescription("...")
        .addAllowedRoles(roleIds.mod)
        .allowInDMs(false);

    async execute(
        message: Message,
        args: { [key: string]: string },
        services: Services,
    ) {
        if (message.channel.isSendable()) {
            await message.channel.send(lol(message.author.id, 3465570688));
        }
    }
}
