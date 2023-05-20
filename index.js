import { ReadlineParser, SerialPort } from "serialport";
import fs from 'fs'
import { setTimeout } from 'timers/promises';

function textWriter() {
    let currentOutpuStream = null;
    let currentOutpuStreamTimestamp = null;
    return new WritableStream({
        start(controller) {
            console.log("start");
            return Promise.resolve();
        },
        write(chunk, controller) {
            console.log("write: ", chunk);
            return new Promise((resolve, reject) => {
                const now = Date.now();
                const filenow = now - (now % (1000 * 60 * 5));
                if (currentOutpuStreamTimestamp != filenow) {
                    if (currentOutpuStream) {
                        currentOutpuStream.close();
                    }
                    if (fs.existsSync(`log-${filenow}.log`)) {
                        currentOutpuStream = fs.createWriteStream(`log-${filenow}.log`, { flags: 'a' });
                    } else {
                        currentOutpuStream = fs.createWriteStream(`log-${filenow}.log`);
                    }
                    currentOutpuStreamTimestamp = filenow;
                }
                currentOutpuStream.write(chunk + '\r\n');
                resolve();
            })
        },
        close(controller) {
            console.log('close')
            return new Promise((resolve, reject) => {
                if (currentOutpuStream) {
                    currentOutpuStream.close();
                }
                resolve();
            })
        },
        abort(reason) {
            console.error("Sink error:", err);
            return Promise.resolve();
        }
    }, {
        highWaterMark: 100,
        size: () => 100,
    });
}

async function readSerial(writer, { path }) {
    return new Promise(async (resolve, reject) => {
        const ports = await SerialPort.list();
        for (let i = 0; i < ports.length; i++) {
            const item = ports[i];
            if (item.path === path) {
                const port = new SerialPort({
                    path,
                    baudRate: 9600,
                });

                port.on('close', (reason) => {
                    reject(reason)
                });
                port.on('error', (reason) => {
                    reject(reason)
                });
                const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }))
                parser.on('data', (data) => {
                    writer.write(data);
                });
                parser.on('error', (error) => {
                    console.log(error)
                })
                return;
            }
        }
        resolve();
    })

}

async function main() {
    const stream = textWriter();
    const writer = stream.getWriter();
    process.on('SIGHUP', () => {
        stream.close();
    })
    process.on('SIGINT', () => {
        stream.close();
    })
    process.on("SIGTERM", () => {
        stream.close();
    });

    for (; ;) {
        try {
            await readSerial(writer, { path: 'COM5' });
            await setTimeout(1000);
        } catch (err) {
            console.error(err);
        }
    }
}

main();
