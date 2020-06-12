/**
 * Created by rtholmes on 2016-06-19.
 */

import fs = require("fs");
import restify = require("restify");
import Log from "../Util";
import {InsightResponse} from "../controller/IInsightFacade";
import InsightFacade from "../controller/InsightFacade";

/**
 * This configures the REST endpoints for the server.
 */
export default class Server {

    private port: number;
    private rest: restify.Server;
    private static facade: InsightFacade;

    constructor(port: number) {
        Log.info("Server::<init>( " + port + " )");
        this.port   = port;
    }

    /**
     * Stops the server. Again returns a promise so we know when the connections have
     * actually been fully closed and the port has been released.
     *
     * @returns {Promise<boolean>}
     */
    public stop(): Promise<boolean> {
        Log.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }

    /**
     * Starts the server. Returns a promise with a boolean value. Promises are used
     * here because starting the server takes some time and we want to know when it
     * is done (and if it worked).
     *
     * @returns {Promise<boolean>}
     */
    public start(): Promise<boolean> {
        const that = this;
        return new Promise(function (fulfill, reject) {
            try {
                Log.info("Server::start() - start");

                that.rest = restify.createServer({
                    name: "insightUBC",
                });

                that.rest.use(restify.bodyParser({mapFiles: true, mapParams: true}));
                that.rest.use(
                    function crossOrigin(req, res, next) {
                        res.header("Access-Control-Allow-Origin", "*");
                        res.header("Access-Control-Allow-Headers", "X-Requested-With");
                        return next();
                    });

                // This is an example endpoint that you can invoke by accessing this URL in your browser:
                // http://localhost:4321/echo/hello
                that.rest.get("/echo/:msg", Server.echo);

                that.rest.put("/dataset/:id/:kind", Server.putDataset);

                that.rest.del("/dataset/:id", Server.deleteDataset);

                that.rest.get("/dataset", Server.getDataset);

                that.rest.post("/query", Server.postQuery);

                // This must be the last endpoint!
                that.rest.get("/.*", Server.getStatic);

                that.rest.listen(that.port, function () {
                    Log.info("Server::start() - restify listening: " + that.rest.url);
                    fulfill(true);
                });

                that.rest.on("error", function (err: string) {
                    // catches errors in restify start; unusual syntax due to internal
                    // node not using normal exceptions here
                    Log.info("Server::start() - restify ERROR: " + err);
                    reject(err);
                });

            } catch (err) {
                Log.error("Server::start() - ERROR: " + err);
                reject(err);
            }
        });
    }

    // The next two methods handle the echo service.
    // These are almost certainly not the best place to put these, but are here for your reference.
    // By updating the Server.echo function pointer above, these methods can be easily moved.
    private static echo(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("Server::echo(..) - params: " + JSON.stringify(req.params));
        try {
            const result = Server.performEcho(req.params.msg);
            Log.info("Server::echo(..) - responding " + result.code);
            res.json(result.code, result.body);
        } catch (err) {
            Log.error("Server::echo(..) - responding 400");
            res.json(400, {error: err.message});
        }
        return next();
    }

    private static performEcho(msg: string): InsightResponse {
        if (typeof msg !== "undefined" && msg !== null) {
            return {code: 200, body: {result: msg + "..." + msg}};
        } else {
            return {code: 400, body: {error: "Message not provided"}};
        }
    }

    private static getStatic(req: restify.Request, res: restify.Response, next: restify.Next) {
        const publicDir = "frontend/public/";
        Log.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + req.url.split("/").pop();
        }
        fs.readFile(path, function (err: Error, file: Buffer) {
            if (err) {
                res.send(500);
                Log.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }

    private static getInstanceOfFacade(): InsightFacade {
        if (Server.facade === null || Server.facade === undefined) {
            this.facade = new InsightFacade();
            return this.facade;
        }

        return Server.facade;
    }

    private static async putDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("RoutHandler::putDataset::" + req.url);

        // Make sure that specific params are exists
        if (!req.params.id || !req.params.body || !req.params.kind) {
            res.send(400, {error: "there is a problem with parameters"});
            return next();
        }

        // Add the given dataset to our insightFacade
        let insightResponse: InsightResponse;
        try {
            const id        = req.params.id;
            const kind      = req.params.kind;
            const content   = req.params.body.toString("base64");
            insightResponse = await Server.getInstanceOfFacade().addDataset(id, content, kind);

        } catch (err) {
            insightResponse = err;
        }

        // Send a response of adding the given dataset
        res.send(insightResponse.code, insightResponse.body);
        return next();
    }

    private static async deleteDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("RoutHandler::delDataset::" + req.url);

        // Make sure that specific params are exists
        if (!req.params.id) {
            res.send(400, {error: "there is a problem with id parameter"});
            return next();
        }

        // Remove the given dataset from our insightFacade
        let insightResponse: InsightResponse;
        try {
            const id        = req.params.id;
            insightResponse = await Server.getInstanceOfFacade().removeDataset(id);

        } catch (err) {
            insightResponse = err;
        }

        // Send a response of adding the given dataset
        res.send(insightResponse.code, insightResponse.body);
        return next();
    }

    private static async getDataset(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("RoutHandler::getDataset::" + req.url);

        // Get insightFacade dataset list
        let insightResponse: InsightResponse;
        try {
            insightResponse = await Server.getInstanceOfFacade().listDatasets();

        } catch (err) {
            insightResponse = err;
        }

        // Send a response of adding the given dataset
        res.send(insightResponse.code, insightResponse.body);
        return next();
    }

    private static async postQuery(req: restify.Request, res: restify.Response, next: restify.Next) {
        Log.trace("RoutHandler::postQuery::" + req.url);

        // Check whether body parameter exists or not
        if (!req.body) {
            res.send(400, {error: "body is undefined"});
            return next();
        }

        // Get insightFacade dataset list
        let insightResponse: InsightResponse;
        const query = req.body;
        try {
            insightResponse = await Server.getInstanceOfFacade().performQuery(query);

        } catch (err) {
            insightResponse = err;
        }

        // Send a response of adding the given dataset
        res.send(insightResponse.code, insightResponse.body);
        return next();
    }
}
