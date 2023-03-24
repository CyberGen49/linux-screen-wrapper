#!/usr/bin/node

const fs = require('fs');
const os = require('os');
const path = require('path');
const shell = require('shelljs');
const clc = require('cli-color');
const dayjs = require('dayjs');
const Fuse = require('fuse.js');

function centerText(text, length) {
    if (text.length > length) return text;
    const diff = length-text.length;
    const left = Math.floor(diff/2);
    const right = ((diff/2)%2 !== 0) ? left+1 : left;
    return `${' '.repeat(left)}${text}${' '.repeat(right)}`;
}

function run(command = '') {
    fs.writeFileSync(path.join(os.homedir(), 'screen-wrapper-exec'), command, { mode: 0777 });
    process.exit();
}

const sessions = [];
const sessionNames = [];
const lsOutputLines = shell.exec('screen -ls', { silent: true }).split('\n');
for (const line of lsOutputLines) {
    const matches = line.trim().match(/^(\d+)\.(.*?)\t\((\d+)\/(\d+)\/(\d+) (\d+):(\d+):(\d+) (AM|PM)\)\t\((Detached|Attached)\)$/);
    if (matches) {
        const time = new Date();
        time.setFullYear(matches[5], parseInt(matches[3])-1, matches[4]);
        time.setHours((matches[9] == 'PM' && parseInt(matches[6]) < 12) ? parseInt(matches[6])+12:parseInt(matches[6]), matches[7], matches[8]);
        sessions.push({
            raw: matches[0],
            pid: matches[1],
            name: matches[2],
            time: time.getTime(),
            isAttached: (matches[10] == 'Attached') ? true : false
        });
        sessionNames.push(matches[2]);
    }
}

switch (process.argv[2]) {
    case 'ls':
        if (sessions.length == 0) {
            console.log(clc.redBright(`There aren't any running screen sessions.`));
        } else {
            const lengths = {
                pid: 5,
                name: 16,
                time: 20,
                status: 8
            };
            const names = {
                pid: 'PID',
                name: 'Session name',
                time: 'Start time',
                status: 'Status'
            };
            for (const session of sessions) {
                if (session.pid.length > lengths.pid)
                    lengths.pid = session.pid.length;
                if (session.name.length > lengths.name)
                    lengths.name = session.name.length;
            }
            const totalLength = lengths.pid+lengths.name+lengths.time+lengths.status;
            console.log(clc.cyanBright(centerText(`${sessions.length} Active Screens`, totalLength)));
            console.log(clc.yellow(
                names.pid.padStart(lengths.pid),
                names.name.padEnd(lengths.name),
                names.time.padEnd(lengths.time),
                names.status.padEnd(lengths.status)
            ));
            for (const session of sessions) {
                console.log(
                    clc.yellowBright(session.pid.padStart(lengths.pid)),
                    clc.whiteBright(session.name.padEnd(lengths.name)),
                    clc.white(dayjs(session.time).format('YYYY-MM-DD HH:mm:ss').padEnd(lengths.time)),
                    (session.isAttached)
                        ? clc.greenBright('Attached')
                        : clc.redBright('Detached')
                );
            }
        }
        run();
    case 'r':
        if (!process.argv[3]) {
            console.log(clc.redBright(`Provide a session name or PID.`));
            run();
        }
        const filter = new Fuse(sessions, { keys: [ 'name', 'pid' ] });
        const results = filter.search(process.argv[3]);
        if (results.length == 0) {
            console.log(clc.redBright(`No session was found matching that name or PID.`));
            run();
        }
        const result = results[0].item;
        console.log(clc.cyanBright(`Resuming screen session`), clc.whiteBright(result.name), clc.cyanBright(`with PID`), clc.yellowBright(result.pid));
        run(`screen -dr ${result.pid}`);
    case 'c':
        if (!process.argv[3]) {
            console.log(clc.redBright(`Give this session a name.`));
            run();
        }
        const name = process.argv[3].trim();
        if (sessionNames.includes(name)) {
            console.log(clc.redBright(`That session name is already in use.`));
            run();
        }
        console.log(clc.cyanBright(`Creating screen session`), clc.whiteBright(name));
        run(`screen -S "${name}"`);
    default:
        console.log();
        console.log(
            clc.green(`s ls`), '          ',
            clc.whiteBright(`Lists all running sessions`)
        );
        console.log(
            clc.green(`s r`), clc.yellowBright(`<name|PID>`), '',
            clc.whiteBright(`Attaches a session by its name or PID`),
            clc.white(`(using screen's -x flag)`)
        );
        console.log(
            clc.green(`s c`), clc.yellowBright(`<name>`), '    ',
            clc.whiteBright(`Creates a session using the provided name`)
        );
        console.log();
        run();
}