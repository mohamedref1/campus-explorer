import Log from "../Util";
import {IInsightFacade, InsightResponse, InsightDatasetKind,
        InsightDataset, InsightResponseSuccessBody} from "./IInsightFacade";
import { IParserResponse, IParserResponseSuccessBody, ParserType } from "./parser/IParser";
import InsightCourses from "./dataset/InsightCourses";
import InsightRooms from "./dataset/InsightRooms";
import SimpleResult from "./result/types/SimpleResult";
import Parser from "./parser/Parser";
import Result from "./result/Result";

/**
 * This is the main programmatic entry point for the project.
 */
export default class InsightFacade implements IInsightFacade {
    private insightDatasets: InsightDataset[];
    private insightCourses: InsightCourses;
    private insightRooms: InsightRooms;
    private parser: Parser;
    private result: Result;

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.insightDatasets = [];
        this.insightCourses  = new InsightCourses();
        this.insightRooms    = new InsightRooms();
        this.parser          = new Parser();
        this.result          = new Result();
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<InsightResponse> {
        return new Promise(async (fulfill, reject) => {
            try {
                // Add Courses Dataset
                if (kind === InsightDatasetKind.Courses) {
                    const res            = await this.insightCourses.addDataset(id, content, this.insightDatasets);
                    this.insightDatasets = ((res.body as InsightResponseSuccessBody).result as InsightDataset []);

                    fulfill({
                        code: 204,
                        body: {
                            result: "the given courses dataset has been added successfull",
                        },
                    });

                // Add Rooms Dataset
                } else if (kind === InsightDatasetKind.Rooms) {
                    const res = await this.insightRooms.addDataset(id, content, this.insightDatasets);
                    this.insightDatasets = ((res.body as InsightResponseSuccessBody).result as InsightDataset []);

                    fulfill({
                        code: 204,
                        body: {
                            result: "the given courses dataset has been added successfull",
                        },
                    });
                }
            } catch (err) {
                reject (err);
            }
        });
    }

    public removeDataset(id: string): Promise<InsightResponse> {
        return new Promise(async (fulfill, reject) => {
            // Make a filtered insightDatasets without the dataset of the given id to remove (if exists)
            let kind: InsightDatasetKind;
            const filteredInsightDatasets: InsightDataset[] = this.insightDatasets.filter((e) => {
                if (id === e.id) {
                    kind = e.kind;
                    return false;
                }
                return true;
            });

            // Remove dataset of the given id from insightDatasets and its local storage (if exists)
            if (filteredInsightDatasets.length === (this.insightDatasets.length - 1)) {

                // Remove from insightDataset object
                this.insightDatasets = filteredInsightDatasets;

                // Remove from local storage
                try {
                    if (kind === InsightDatasetKind.Courses) {
                        const response = await this.insightCourses.removeDataset(id);
                        fulfill(response);
                    } else if (kind === InsightDatasetKind.Rooms) {
                        const response = await this.insightRooms.removeDataset(id);
                        fulfill(response);
                    }
                } catch (err) {
                    reject(err);
                }
            } else {
                // Dataset id is incorrect or doesn't exist
                reject({
                    code: 404,
                    body: {
                        error: "the given dataset id is incorrect or doesnot exist",
                    },
                });
            }
        });
    }

    public performQuery(query: string): Promise <InsightResponse> {
        return new Promise(async (fulfill, reject) => {
            try {
                // Parse the given query
                const parserResponse: IParserResponse = await this.parser.performParse(query);
                const parsedQuery                     = (parserResponse.body as IParserResponseSuccessBody);

                // Convert it to a list of resulted sections
                const resultResponse: InsightResponse = await this.result.performResult(parsedQuery);
                // Resolve it

                fulfill(resultResponse);

            } catch (err) {
                reject(err);
            }
        });
    }

    public listDatasets(): Promise<InsightResponse> {
        return Promise.resolve({
            code: 200,
            body: {
                result: this.insightDatasets,
            },
        });
    }
}
