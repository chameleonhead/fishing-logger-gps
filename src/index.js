import dotenv from 'dotenv';
import { ReadlineParser, SerialPort } from "serialport";
import fs from 'fs'

function sleep(milliseconds) {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(), milliseconds);
    })
}

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

async function readSerial(writer, { path, signal }) {
    return new Promise(async (resolve, reject) => {
        try {
            const ports = await SerialPort.list();
            for (let i = 0; i < ports.length; i++) {
                const item = ports[i];
                if (item.path === path) {
                    const port = new SerialPort({
                        path,
                        baudRate: 9600,
                    });

                    signal.onabort = () => {
                        port.close();
                    };

                    let closed = false;
                    port.on('close', (reason) => {
                        resolve(reason)
                        closed = true;
                    });

                    port.on('error', (reason) => {
                        reject(reason)
                    });
                    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }))
                    parser.on('data', (data) => {
                        if (!closed) {
                            writer.write(data);
                        }
                    });
                    parser.on('error', (error) => {
                        console.log(error)
                    })
                    return;
                }
            }
            resolve()
        } catch (err) {
            reject(err);
        }
    })

}

async function main() {
    dotenv.config();

    const controller = new AbortController();
    const stream = textWriter();
    const writer = stream.getWriter();
    let finished = false;
    function handleFinish() {
        controller.abort();
        writer.releaseLock();
        stream.close();
        finished = true;
    }
    process.on('SIGHUP', handleFinish)
    process.on('SIGINT', handleFinish)
    process.on("SIGTERM", handleFinish);

    for (; ;) {
        try {
            await readSerial(writer, { path: process.env.SERIAL_PORT_PATH, signal: controller.signal });
            if (finished) {
                return;
            }
            await sleep(1000);
        } catch (err) {
            console.error(err);
        }
    }
}

main();
