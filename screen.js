#!/usr/bin/node

const fs = require('fs');
const os = require('os');
const path = require('path');
const shell = require('shelljs');
const clc = require('cli-color');
const dayjs = require('dayjs');
const Fuse = require('fuse.js');
const utils = require('web-resources');

function centerText(text, length) {
    if (text.length > length) return text;
    const diff = length-text.length;
    const left = Math.floor(diff/2);
    const right = ((diff/2)%2 !== 0) ? left+1 : left;
    return `${' '.repeat(left)}${text}${' '.repeat(right)}`;
}

function run(command = '') {
    fs.writeFileSync(path.join(os.homedir(), 'screen-wrapper-exec'), command, { mode: 777 });
    process.exit();
}

const data = [];
const sessionNames = [];
const lsOutputLines = shell.exec('screen -ls', { silent: true }).split('\n');
for (const line of lsOutputLines) {
    const matches = line.trim().match(/^(\d+)\.(.*?)\t\((\d+)\/(\d+)\/(\d+) (\d+):(\d+):(\d+) (AM|PM)\)\t\((Detached|Attached)\)$/);
    if (matches) {
        const time = new Date();
        time.setFullYear(matches[5], parseInt(matches[3])-1, matches[4]);
        time.setHours((matches[9] == 'PM' && parseInt(matches[6]) < 12) ? parseInt(matches[6])+12:parseInt(matches[6]), matches[7], matches[8]);
        data.push({
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
    case 'pm2': {
        let data;
        try {
            data = JSON.parse(shell.exec('pm2 jlist', { silent: true }));
        } catch (error) {
            return console.log(clc.redBright(`Failed to get pm2 session data!`));
        }
        if (data.length == 0) {
            return console.log(clc.redBright(`There aren't any running pm2 processes.`));
        }
        data.sort((a, b) => {
            return b.pm2_env.pm_uptime-a.pm2_env.pm_uptime;
        });
        const lengths = {
            id: 3,
            name: 16,
            time: 10,
            status: 8
        };
        const names = {
            id: 'ID',
            name: 'Process name',
            time: 'Uptime',
            status: 'Status'
        };
        for (const session of data) {
            if (session.name.length > lengths.name)
                lengths.name = session.name.length;
        }
        const totalLength = lengths.id+lengths.name+lengths.time+lengths.status;
        console.log(clc.cyanBright(centerText(`${data.length} PM2 Processes`, totalLength)));
        console.log(clc.yellow(
            names.id.padStart(lengths.id),
            names.name.padEnd(lengths.name),
            names.time.padEnd(lengths.time),
            names.status.padEnd(lengths.status)
        ));
        for (const process of data) {
            console.log(
                clc.yellowBright(`${process.pm2_env.pm_id}`.padStart(lengths.id)),
                clc.whiteBright(process.name.padEnd(lengths.name)),
                clc.white(utils.getRelativeDate(new Date(process.pm2_env.pm_uptime).getTime()).replace(' ago', '').padEnd(lengths.time)),
                (process.pm2_env.status == 'online')
                    ? clc.greenBright(process.pm2_env.status)
                    : clc.redBright(process.pm2_env.status)
            );
        }
        break;
    }
    case 'ls':
        if (data.length == 0) {
            console.log(clc.redBright(`There aren't any running screen sessions.`));
        } else {
            const lengths = {
                pid: 5,
                name: 16,
                time: 10,
                status: 8
            };
            const names = {
                pid: 'PID',
                name: 'Session name',
                time: 'Uptime',
                status: 'Status'
            };
            for (const session of data) {
                if (session.pid.length > lengths.pid)
                    lengths.pid = session.pid.length;
                if (session.name.length > lengths.name)
                    lengths.name = session.name.length;
            }
            const totalLength = lengths.pid+lengths.name+lengths.time+lengths.status;
            console.log(clc.cyanBright(centerText(`${data.length} Screen Sessions`, totalLength)));
            console.log(clc.yellow(
                names.pid.padStart(lengths.pid),
                names.name.padEnd(lengths.name),
                names.time.padEnd(lengths.time),
                names.status.padEnd(lengths.status)
            ));
            for (const session of data) {
                console.log(
                    clc.yellowBright(session.pid.padStart(lengths.pid)),
                    clc.whiteBright(session.name.padEnd(lengths.name)),
                    clc.white(utils.getRelativeDate(new Date(session.time).getTime()).replace(' ago', '').padEnd(lengths.time)),
                    (session.isAttached)
                        ? clc.greenBright('Attached')
                        : clc.redBright('Detached')
                );
            }
        }
        break;
    case 'r':
        if (!process.argv[3]) {
            console.log(clc.redBright(`Provide a session name or PID.`));
            run();
        }
        const filter = new Fuse(data, { keys: [ 'name', 'pid' ] });
        const results = filter.search(process.argv[3]);
        if (results.length == 0) {
            console.log(clc.redBright(`No session was found matching that name or PID.`));
            run();
        }
        const result = results[0].item;
        console.log(clc.cyanBright(`Resuming screen session`), clc.whiteBright(result.name), clc.cyanBright(`with PID`), clc.yellowBright(result.pid));
        run(`screen -dr ${result.pid}`);
        break;
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
        break;
    default:
        console.log();
        console.log(
            clc.green(`s ls`), '          ',
            clc.whiteBright(`Lists all running sessions`)
        );
        console.log(
            clc.green(`s pm2`), '         ',
            clc.whiteBright(`Lists all PM2 processes`)
        );
        console.log(
            clc.green(`s r`), clc.yellowBright(`<name|PID>`), '',
            clc.whiteBright(`Attaches a session by its name or PID`)
        );
        console.log(
            clc.green(`s c`), clc.yellowBright(`<name>`), '    ',
            clc.whiteBright(`Creates a session using the provided name`)
        );
        console.log();
        break;
}