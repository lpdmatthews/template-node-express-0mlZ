import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import { RequestListener } from 'node:http';
import express, {
    NextFunction,
    Request,
    RequestHandler,
    Response,
} from 'express';
import 'express-async-errors';
import pino from 'pino';
import helmet from 'helmet';
import compression from 'compression';
import { getClientIp } from 'request-ip';
import * as ev from 'express-validator';
import { Config } from './config';


//imports for pdf stuff
import { createClient } from "@supabase/supabase-js";
import { makeOrderPdfBuffer, OrderPayload } from "./pdf/index";

export type App = {
    requestListener: RequestListener;
    shutdown: () => Promise<void>;
};

declare global {
    namespace Express {
        interface Request {
            abortSignal: AbortSignal;
        }
    }
}

const LARGE_JSON_PATH = '/large-json-payload';
const APPLICATION_JSON = 'application/json';

export const initApp = async (
    config: Config,
    logger: pino.Logger
): Promise<App> => {
    const app = express();
    //superbase stuff
    const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);
    app.set('trust proxy', true);
    app.use(
        express.raw({
            limit: '1kb',
            type: (req) => req.headers['content-type'] !== APPLICATION_JSON,
        })
    );
    app.use(
        express.json({
            limit: '50kb',
            type: (req) => {
                return (
                    req.headers['content-type'] === APPLICATION_JSON &&
                    req.url !== LARGE_JSON_PATH
                );
            },
        })
    );
    app.use((req, res, next) => {
        const start = new Date().getTime();
        const ac = new AbortController();
        req.abortSignal = ac.signal;
        res.on('close', ac.abort.bind(ac));

        const requestId = req.headers['x-request-id']?.[0] || randomUUID();

        const l = logger.child({ requestId });

        let bytesRead = 0;
        req.on('data', (chunk: Buffer) => {
            bytesRead += chunk.length;
        });

        let bytesWritten = 0;
        const oldWrite = res.write;
        const oldEnd = res.end;
        res.write = function (chunk: Buffer | string, ...rest) {
            if (chunk) bytesWritten += chunk.length;

            // @ts-ignore
            return oldWrite.apply(res, [chunk, ...rest]);
        };
        // @ts-ignore
        res.end = function (chunk?: Buffer | string, ...rest) {
            if (chunk) bytesWritten += chunk.length;

            // @ts-ignore
            return oldEnd.apply(res, [chunk, ...rest]);
        };

        res.on('finish', () => {
            l.info(
                {
                    duration: new Date().getTime() - start,
                    method: req.method,
                    path: req.path,
                    status: res.statusCode,
                    ua: req.headers['user-agent'],
                    ip: getClientIp(req),
                    br: bytesRead,
                    bw: bytesWritten,
                },
                'Request handled'
            );
        });

        asl.run({ logger: l, requestId }, () => next());
    });
    app.use(helmet());
    app.use(compression());

    app.get(config.healthCheckEndpoint, (req, res) => {
        res.sendStatus(200);
    });

    app.get('/hi', (req, res) => {
        const s = asl.getStore();
        s?.logger.info('hi');
        res.send('hi');
    });

    app.post(
        '/echo',
        makeValidationMiddleware([ev.body('name').notEmpty()]),
        (req, res) => {
            res.json({ msg: `hi ${req.body.name}` });
        }
    );

    app.post(
        LARGE_JSON_PATH,
        express.json({ limit: '5mb', type: APPLICATION_JSON }),
        (req, res) => {
            // TODO: handle large json payload
            res.end();
        }
    );




    //pdf job endpoint


    app.post("/jobs/:id/run", async (req: Request, res: Response) => {
        const auth = req.headers["authorization"] ?? "";
        if (auth !== `Bearer ${process.env.WORKER_SHARED_SECRET}`) {
            return res.status(401).json({ error: "unauthorized" });
        }

        const jobId = req.params.id;
        const payload = (req.body && typeof req.body === 'object' ? req.body : {}) as OrderPayload;

        try {
            await supabase
            .from("pdf_jobs")
            .update({ status: "processing" })
            .eq("id", jobId);

        const pdf = await makeOrderPdfBuffer(payload);
        const path = `pdfs/${jobId}.pdf`;

        const { error } = await supabase.storage
            .from(process.env.PDF_BUCKET ?? "pdfs")
            .upload(path, pdf, {
                contentType: "application/pdf",
                upsert: true,
            });

        if (error) throw error;

        await supabase
            .from("pdf_jobs")
            .update({
                status: "complete",
                result_path: path,
                error: null,
            })
            .eq("id", jobId);

            return res.json({ ok: true, result_path: path });
        } catch (err: any) {
            asl.getStore()?.logger.error(err);

            await supabase
            .from("pdf_jobs")
            .update({
                status: "failed",
                error: String(err?.message ?? err),
            })
            .eq("id", jobId);

        return res.status(500).json({ ok: false });
        }
    });













    
    app.get('/abort-signal-propagation', async (req, res) => {
        for (let i = 0; i < 10; i++) {
            // simulate some work
            await new Promise((r) => setTimeout(r, 25));

            if (req.abortSignal.aborted) throw new Error('aborted');
        }

        const usersRes = await fetch(
            'https://jsonplaceholder.typicode.com/users',
            {
                signal: req.abortSignal,
            }
        );
        if (usersRes.status !== 200) {
            throw new Error(
                `unexpected non-200 status code ${usersRes.status}`
            );
        }
        const users = await usersRes.json();
        res.json(users);
    });

    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        asl.getStore()?.logger.error(err);

        if (res.headersSent) return;

        res.status(500);
        res.json({ msg: 'Something went wrong' });
    });

    return {
        requestListener: app,
        shutdown: async () => {
            // add any cleanup code here including database/redis disconnecting and background job shutdown
        },
    };
};

type Store = {
    logger: pino.Logger;
    requestId: string;
};

const asl = new AsyncLocalStorage<Store>();

export function makeValidationMiddleware(
    runners: ev.ContextRunner[]
): RequestHandler {
    return async function (req: Request, res: Response, next: NextFunction) {
        await Promise.all(runners.map((runner) => runner.run(req)));

        const errors = ev.validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                errors: errors.array(),
            });
            return;
        }

        next();
    };
}
