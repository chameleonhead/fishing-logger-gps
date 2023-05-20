import { ReadlineParser, SerialPort } from "serialport";
import fs from 'fs'

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

async function main() {
    const ports = await SerialPort.list();

    const port = new SerialPort({
        path: ports[2].path,
        baudRate: 9600,
    });

    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }))
    const stream = textWriter();
    const writer = stream.getWriter();
    parser.on('data', (data) => {
        writer.write(data);
    });

    process.on('SIGHUP', () => {
        stream.close();
        clearInterval(id);
    })
    process.on('SIGINT', () => {
        stream.close();
        clearInterval(id);
    })
    process.on("SIGTERM", () => {
        stream.close();
        clearInterval(id);
    });
}

main();
