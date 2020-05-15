import Log from "../Util";
import {IInsightFacade, InsightResponse, InsightDatasetKind,
        InsightDataset, InsightResponseSuccessBody} from "./IInsightFacade";
import JSZip = require("jszip");
import { ISection, IDatasetResponseSuccessBody } from "../model/courses/ICoursesDataset";
import Course from "../model/courses/Course";
import CoursesDataset from "../model/courses/CoursesDataset";

/**
 * This is the main programmatic entry point for the project.
 */
export default class InsightFacade implements IInsightFacade {
    private insightDatasets: InsightDataset[];

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.insightDatasets = [];
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<InsightResponse> {
        return this.idValidation(id).
        then(() => {
            if (kind === InsightDatasetKind.Courses) { // Courses
                return this.addCoursesDataset(id, content);
            } else if (kind === InsightDatasetKind.Rooms) { // Rooms
                return this.addRoomsDataset(id, content);
            }
        }).
        catch((err) => Promise.reject(err));
    }

    public removeDataset(id: string): Promise<InsightResponse> {
        return new Promise((fulfill, reject) => {
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
                if (kind === InsightDatasetKind.Courses) {
                    return new CoursesDataset(id).remove().
                        then(() => {
                            fulfill({
                                code: 204,
                                body: {
                                    result: id + " dataset has been removed correctly",
                                },
                            });
                        }).
                        catch(() => {
                            reject({
                                code: 404,
                                body: {
                                    error: id + " dataset doesnot exist on the disk",
                                },
                            });
                        });

                } else if (kind === InsightDatasetKind.Rooms) {
                    reject({
                        code: 404,
                        body: {
                            error: "rooms dataset is not supported yet",
                        },
                    });
                }
            }

            // Dataset id is incorrect or doesn't exist
            reject({
                code: 404,
                body: {
                    error: "the given dataset id incorrect or doesnot exist",
                },
            });
        });
    }

    public performQuery(query: string): Promise <InsightResponse> {
        return Promise.reject({code: -1, body: null});
    }

    public listDatasets(): Promise<InsightResponse> {
        return Promise.resolve({
            code: 200,
            body: {
                result: this.insightDatasets,
            },
        });
    }

    private idValidation(id: string): Promise<InsightResponse> {
        const reservedWords: string[] =
            ["In", "dataset", "find", "all", "show", "and", "or",
             "sort", "by", "entries", "the", "of", "whose", "greater",
             "less", "than", "equal", "to", "includes", "include",
             "begins", "begin", "ends", "end", "is", "does", "not", "with"];

        return new Promise((fulfill, reject) => {

            // ID is invalid
            if (id === null) { // Check for null
                reject({
                    code: 400,
                    body: {
                        error: "the given id is null",
                    },
                });
            } else if (id === undefined) { // Check for undefined
                reject({
                    code: 400,
                    body: {
                        error: "the given id is undefined",
                    },
                });
            } else if (id.includes(" ")) { // Check for spane " "
                reject({
                    code: 400,
                    body: {
                        error: "the given id contains space",
                    },
                });
            } else if (id.includes("_")) { // Check for underscore "_"
                reject({
                    code: 400,
                    body: {
                        error: "the given id contains underscore",
                    },
                });
            } else if (reservedWords.includes(id)) { // Check for reserved Words
                reject({
                    code: 400,
                    body: {
                        error: id + " ID is a reserved keyword",
                    },
                });
            } else { // Check for using same id twice
                for (const insightDataset of this.insightDatasets) {
                    if (id === insightDataset.id) {
                        reject({
                            code: 400,
                            body: {
                                error: id + " ID has been used before",
                            },
                        });
                    }
                }
            }

            // ID is valid
            fulfill({
                code: 204,
                body: {
                    result: "the given id is valid",
                },
            });
        });
    }

    private addCoursesDataset(id: string, content: string): Promise<InsightResponse> {
        return new Promise((fulfill, reject) => {

            this.coursesDatasetValidation(content).
            then((files) => this.objectifyCoursesDataset(files)).
            then((courses) => new CoursesDataset(id, courses).store()). // Local Storage
            then((res) => { // Assign to insigtFacade
                const numRows: number = ((res.body as IDatasetResponseSuccessBody).result as number);

                if (numRows) {
                    this.insightDatasets.push({
                        id,
                        kind: InsightDatasetKind.Courses,
                        numRows,
                    });

                    fulfill({
                        code: 204,
                        body: {
                            result: id + " courses dataset is added correctly",
                        },
                    });
                } else {
                    reject({
                        code: 400,
                        body: {
                            error: "there is an error with local storage",
                        },
                    });
                }
            }).

            catch((err) => {
                reject(err);
            });
        });
    }

    private addRoomsDataset(id: string, content: string): Promise<InsightResponse> {
        return Promise.reject({
            code: 400,
            body: {
                error: "adding dataset of kind rooms doesnot available yet",
            },
        });
    }

    private coursesDatasetValidation(dataset: string): Promise<JSZip.JSZipObject[]> {
        return new Promise((fulfill, reject) => {

            // Dataset is invalid
            return this.datasetValidation(dataset).
            then((res) => {
                const zip = ((res.body as InsightResponseSuccessBody).result[0] as JSZip);
                const folder: RegExp = /courses/;

                if (!zip.folder(folder).length) { // Check for courses folder
                    reject({
                        code: 400,
                        body: {
                            result: "the given dataset doesnot have courses folder",
                        },
                    });
                }

                const files =  zip.folder("courses").filter((path, file) => file.name.includes(".csv"));
                if (!files.length) { // Check for csv files
                    reject({
                        code: 400,
                        body: {
                            result: "the given dataset doesnot have csv files",
                        },
                    });
                }

                // Dataset is valid (primary)
                fulfill(files);
            }).

            catch((err) => reject(err));
        });
    }

    private datasetValidation(dataset: string): Promise<InsightResponse> {
        return new Promise(async (fulfill, reject) => {

            // Dataset is invalid
            if (dataset === null) { // Check for null
                reject({
                    code: 400,
                    body: {
                        error: "the given dataset is null",
                    },
                });
            } else if (dataset === undefined) { // Check for undefined
                reject({
                    code: 400,
                    body: {
                        error: "the given dataset is undefined",
                    },
                });
            } else { // Check for base64

                const notBase64 = /[^A-Z0-9+\/=]/i;
                const len = dataset.length;
                if (!len || len % 4 !== 0 || notBase64.test(dataset)) {
                    reject({
                        code: 400,
                        body: {
                            error: "the given dataset is not base64",
                        },
                    });
                }

                const firstPaddingChar = dataset.indexOf("=");
                if (!(firstPaddingChar === -1 ||
                      firstPaddingChar === len - 1 ||
                      (firstPaddingChar === len - 2 && dataset[len - 1] === "="))) {
                        reject({
                            code: 400,
                            body: {
                                error: "the given dataset is not base64",
                            },
                        });
                    }
            }

            let zip: JSZip = new JSZip();
            try { // Check for zip file
                zip = await zip.loadAsync(dataset, {base64: true});
            } catch (err) {
                reject({
                    code: 400,
                    body: {
                        result: "the given dataset is not serialized zip file",
                    },
                });
            }

            // Dataset is valid
            fulfill({
                code: 204,
                body: {
                    result: [zip],
                },
            });
        });
    }

    private objectifyCoursesDataset(files: JSZip.JSZipObject[]): Promise<Course[]> {
        const header = "Title|id|Professor|Audit|Year|Course|Pass|Fail|Avg|Subject";
        let text: string;
        let listOfLines: string[];
        let listOfWords: string[];
        let sections: ISection[] = [];
        const courses: Course[] = [];

        return new Promise(async (fulfill, reject) => {
            for (const file of files) { // For each file
                sections = [];
                try {
                    text = await file.async("text");
                } catch (err) {
                     continue;
                }

                listOfLines = text.split("\n");

                // Skip invalid csv file that has wrong headers
                if (!listOfLines[0].includes(header)) { continue; }

                for (const line of listOfLines.slice(1)) { // For each line
                    listOfWords = line.split("|");

                    if (listOfWords.length >= 10) {
                        const section = {
                            courses_dept: listOfWords[9],
                            courses_id: listOfWords[1],
                            courses_avg: parseInt(listOfWords[8], 10),
                            courses_instructor: listOfWords[2],
                            courses_title: listOfWords[0],
                            courses_pass: parseInt(listOfWords[6], 10),
                            courses_fail: parseInt(listOfWords[7], 10),
                            courses_audit: parseInt(listOfWords[3], 10),
                            courses_uuid: listOfWords[5],
                        };

                        sections.push(section);
                    }
                }

                if (sections.length) {
                    const name = file.name.split("/").pop().replace(".csv", "");
                    courses.push(new Course(name, sections));
                }
            }

            if (courses.length) {
                fulfill(courses);
            } else {
                reject({
                    code: 400,
                    body: {
                        error: "all csv files of the given dataset are invalid",
                    },
                });
            }
        });
    }
}
