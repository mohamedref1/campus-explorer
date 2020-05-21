import Log from "../Util";
import {IInsightFacade, InsightResponse, InsightDatasetKind,
        InsightDataset, InsightResponseSuccessBody} from "./IInsightFacade";
import JSZip = require("jszip");
import { ISection, IDatasetResponseSuccessBody, ICourse } from "../model/courses/ICoursesDataset";
import Course from "../model/courses/Course";
import CoursesDataset from "../model/courses/CoursesDataset";
import Parser from "./Parser/Parser";
import { IParserResponseSuccessBody, IDataset, IFilter,
         IKey, ISort, IParserResponse, SortKind, MKey,
         SKey, ICriteria, LogicalOperator, MOperator, SOperator } from "./Parser/IParser";

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
        return new Promise(async (fulfill, reject) => {
            try {
                // Parse th given query
                const res: IParserResponse = await new Parser().performParse(query);

                // Slice the parsed query response
                const dataset: IDataset = (res.body as IParserResponseSuccessBody).dataset;
                const filter: IFilter   = (res.body as IParserResponseSuccessBody).filter;
                const display: IKey[]   = (res.body as IParserResponseSuccessBody).display;
                const sort: ISort       = (res.body as IParserResponseSuccessBody).sort;

                // Load dataset
                const coursesDataset: CoursesDataset = await this.loadDataset(dataset.id, dataset.kind);

                // Merge courseDataset sections
                const sections: ISection[] = await this.sectionize(coursesDataset);

                // Filter dataset
                const filteredSections: ISection[] = await this.filterDataset(sections, filter);

                // Sort dataset
                const sortedSections: ISection[] = await this.sortDataset(filteredSections, sort);

                // Display dataset
                const displayedSections: ISection[] = await this.displayDataset(sortedSections, display);

                fulfill({
                    code: 200,
                    body: {
                        result: displayedSections,
                    },
                });

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
                            courses_dept: listOfWords[9].replace("\r", ""),
                            courses_id: listOfWords[5],
                            courses_avg: parseFloat(listOfWords[8]),
                            courses_instructor: listOfWords[2],
                            courses_title: listOfWords[0],
                            courses_pass: parseFloat(listOfWords[6]),
                            courses_fail: parseFloat(listOfWords[7]),
                            courses_audit: parseFloat(listOfWords[3]),
                            courses_uuid: listOfWords[1],
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

    private addRoomsDataset(id: string, content: string): Promise<InsightResponse> {
        return Promise.reject({
            code: 400,
            body: {
                error: "adding dataset of kind rooms doesnot available yet",
            },
        });
    }

    private loadDataset(id: string, kind: InsightDatasetKind): Promise<CoursesDataset> {
        return new Promise(async (fulfill, reject) => {
            if (kind === InsightDatasetKind.Courses) {
                const coursesDataset = new CoursesDataset(id);
                try {
                    await coursesDataset.load();
                    fulfill(coursesDataset);
                } catch (err) {
                    reject(err);
                }

            } else if (kind === InsightDatasetKind.Rooms) {
                reject({
                    code: 400,
                    body: {
                        error: "perform query on rooms datasets does not available yet",
                    },
                });
            } else {
                reject({
                    code: 400,
                    body: {
                        error: "invalid dataset kind",
                    },
                });
            }

        });
    }

    private sectionize (coursesDataset: CoursesDataset): Promise<ISection[]> {
        return new Promise((fulfill, reject) => {
            const courses: ICourse[] = coursesDataset.getCourses();
            const sections: ISection[] = [];

            for (const course of courses) {
                sections.push(... course.getSections());
            }

            if (sections.length) { // If there is sections
                fulfill(sections);
            } else { // Else
                reject({
                    code: 400,
                    body: {
                        error: "there is no sections",
                    },
                });
            }
        });
    }

    private async filterDataset (sections: ISection[], filter: IFilter): Promise<ISection[]> {
        let filteredSections: ISection[] = [];

        // Valid (is all entries)
        if (filter.isAllEntries && !filter.criteria.length && !filter.logicalOperator.length) {
            return Promise.resolve(sections);
        }

        // Invalid (find entries whose)
        if (!filter.isAllEntries && !filter.criteria.length) {
            return Promise.reject({
                code: 400,
                body: {
                    error: "the given filter is incorrect",
                },
            });
        }

        // Stringify filter
        let stringyCriteria: Array<[string, string, number | string]>;
        const logicalOperators: string[] = filter.logicalOperator;
        try {
            stringyCriteria = await this.stringyCriteria(filter);
        } catch (err) {
            return Promise.reject(err);
        }

        // Filter sections according to the first criteria
        let stringyOneCriteria = stringyCriteria.shift();

        try {
            filteredSections = await (this.filterForOneCriteria(stringyOneCriteria, sections));
        } catch (err) {
            return Promise.reject(err);
        }

        // Filter for remains criteria (if exists)
        for (const logicalOperator of logicalOperators) {
            if (logicalOperator === LogicalOperator.AND) { // AND is the conjunction
                try {
                    stringyOneCriteria = stringyCriteria.shift();
                    filteredSections = await this.filterForOneCriteria(stringyOneCriteria, filteredSections);
                } catch (err) {
                    return Promise.reject(err);
                }
            } else if (logicalOperator === LogicalOperator.OR) { // OR is the conjunction
                try {
                    stringyOneCriteria = stringyCriteria.shift();
                    const orFilteredSections = await (this.filterForOneCriteria(stringyOneCriteria, sections));

                    for (const section of orFilteredSections) {
                        if (!filteredSections.includes(section)) { filteredSections.push(section); }
                    }

                } catch (err) {
                    return Promise.reject(err);
                }
            } else {
                return Promise.reject({
                    code: 400,
                    body: {
                        error: "the given logical Operator \"" + logicalOperator + "\" is incorrect",
                    },
                });
            }
        }

        return Promise.resolve(filteredSections);
    }

    private stringyCriteria(filter: IFilter): Promise<Array<[string, string, number | string]>> {
        const stringyCriteria: Array<[string, string, number | string]> = [];

        const criteria: ICriteria[] = filter.criteria;
        const logicalOperator: LogicalOperator[] = filter.logicalOperator;

        let key: string;
        let operator: string;
        let operand: number | string;

        for (const oneCriteria of criteria) {
            key = oneCriteria.criteria.key;
            operator = oneCriteria.criteria.operator;
            operand = oneCriteria.criteria.operand;

            switch (key) {
                case MKey.Audit:
                    key = "courses_audit";
                    break;
                case MKey.Average:
                    key = "courses_avg";
                    break;
                case MKey.Fail:
                    key = "courses_fail";
                    break;
                case MKey.Pass:
                    key = "courses_pass";
                    break;
                case SKey.Department:
                    key = "courses_dept";
                    break;
                case SKey.ID:
                    key = "courses_id";
                    break;
                case SKey.Instructor:
                    key = "courses_instructor";
                    break;
                case SKey.Title:
                    key = "courses_title";
                    break;
                case SKey.UUID:
                    key = "courses_uuid";
                    break;
                default:
                    return Promise.reject({
                        code: 400,
                        body: {
                            error: "the given filter \"" + key + "\" key is invalid",
                        },
                    });
            }

            stringyCriteria.push([key, operator, operand]);
        }

        return Promise.resolve(stringyCriteria);

    }

    private filterForOneCriteria(stringyOneCriteria: [string, string, number | string],
                                 sections: ISection[]): Promise<ISection[]> {

        const filteredSections: ISection[] = [];
        const key = stringyOneCriteria[0];
        const operator = stringyOneCriteria[1];
        const operand = stringyOneCriteria[2];

        for (const section of sections) {

            switch (operator) {
                case MOperator.Equal:
                    if ((section as any)[key] === operand) { filteredSections.push(section); }
                    break;
                case MOperator.Greater:
                    if ((section as any)[key] > operand) { filteredSections.push(section); }
                    break;
                case MOperator.Less:
                    if ((section as any)[key] < operand) { filteredSections.push(section); }
                    break;
                case MOperator.notEqual:
                    if ((section as any)[key] !== operand) { filteredSections.push(section); }
                    break;
                case MOperator.notGreater:
                    if ((section as any)[key] <= operand) { filteredSections.push(section); }
                    break;
                case MOperator.notLess:
                    if ((section as any)[key] >= operand) { filteredSections.push(section); }
                    break;
                case SOperator.Is:
                    if ((section as any)[key] === operand) { filteredSections.push(section); }
                    break;
                case SOperator.isNot:
                    if ((section as any)[key] !== operand) { filteredSections.push(section); }
                    break;
                case SOperator.Includes:
                    if ((section as any)[key].includes(operand)) { filteredSections.push(section); }
                    break;
                case SOperator.notInclude:
                    if (!(section as any)[key].includes(operand)) { filteredSections.push(section); }
                    break;
                case SOperator.Begins:
                    if (((section as any)[key] as string)
                        .startsWith((operand as string))) {
                         filteredSections.push(section);
                        }
                    break;
                case SOperator.notBegin:
                    if (!((section as any)[key] as string)
                        .startsWith((operand as string))) {
                        filteredSections.push(section);
                    }
                    break;
                case SOperator.Ends:
                    if (((section as any)[key] as string)
                        .endsWith((operand as string))) {
                        filteredSections.push(section);
                    }
                    break;
                case SOperator.notEnd:
                    if (!((section as any)[key] as string)
                        .endsWith((operand as string))) {
                        filteredSections.push(section);
                    }
                    break;
                default:
                    return Promise.reject({
                        code: 400,
                        body: {
                            error: "the given filter \"" + operator + "\" operator is invalid",
                        },
                    });
            }
        }

        return Promise.resolve(filteredSections);
    }

    private sortDataset (sections: ISection[], sort: ISort): Promise<ISection[]> {
        if (sort === undefined || sort === null) { // If no sort
            return Promise.resolve(sections);
        }

        // Sort ascendingly according to the given sort key
        const key: string = sort.key;
        switch (key) {
            case MKey.Audit:
                sections.sort((a, b) => a.courses_audit - b.courses_audit);
                break;
            case MKey.Average:
                sections.sort((a, b) => a.courses_avg - b.courses_avg);
                break;
            case MKey.Fail:
                sections.sort((a, b) => a.courses_fail - b.courses_fail);
                break;
            case MKey.Pass:
                sections.sort((a, b) => a.courses_pass - b.courses_pass);
                break;
            case SKey.Department:
                sections.sort((a, b) =>
                +(a.courses_dept > b.courses_dept) ||
                -(a.courses_dept < b.courses_dept));
                break;
            case SKey.ID:
                sections.sort((a, b) =>
                +(a.courses_id > b.courses_id) ||
                -(a.courses_id < b.courses_id));
                break;
            case SKey.Instructor:
                sections.sort((a, b) =>
                +(a.courses_instructor > b.courses_instructor) ||
                -(a.courses_instructor < b.courses_instructor));
                break;
            case SKey.Title:
                sections.sort((a, b) =>
                +(a.courses_title > b.courses_title) ||
                -(a.courses_title < b.courses_title));
                break;
            case SKey.UUID:
                sections.sort((a, b) =>
                +(a.courses_uuid > b.courses_uuid) ||
                -(a.courses_uuid < b.courses_uuid));
                break;
            default:
                return Promise.reject({
                    code: 400,
                    body: {
                        error: "the given sort key is invalid",
                    },
                });
        }

        // return sorted sections according to the given sort kind
        if (sort.kind === SortKind.Descending) { // Descending
            sections.reverse();
            return Promise.resolve(sections);
        } else if (sort.kind === SortKind.Ascending) { // Ascending
            return Promise.resolve(sections);
        } else {
            return Promise.reject({
                code: 400,
                body: {
                    error: "the given sort kind is invalid",
                },
            });
        }
    }

    private displayDataset (sections: ISection[], display: IKey[]): Promise<ISection[]> {
        const properties: string[] = [];
        const results: any[] = [];

        for (const key of display) { // Convert keys object to strings
            properties.push(key.key as string);
        }

        for (const section of sections) { // assign displayed sections
            const oneResult: any = {};
            for (const property of properties) {
                switch (property) {
                    case MKey.Audit:
                        oneResult["courses_audit"] = section.courses_audit;
                        break;
                    case MKey.Average:
                        oneResult["courses_avg"] = section.courses_avg;
                        break;
                    case MKey.Fail:
                        oneResult["courses_fail"] = section.courses_fail;
                        break;
                    case MKey.Pass:
                        oneResult["courses_pass"] = section.courses_pass;
                        break;
                    case SKey.Department:
                        oneResult["courses_dept"] = section.courses_dept;
                        break;
                    case SKey.ID:
                        oneResult["courses_id"] = section.courses_id;
                        break;
                    case SKey.Instructor:
                        oneResult["courses_instructor"] = section.courses_instructor;
                        break;
                    case SKey.Title:
                        oneResult["courses_title"] = section.courses_title;
                        break;
                    case SKey.UUID:
                        oneResult["courses_uuid"] = section.courses_uuid;
                        break;
                    default:
                        return Promise.reject({
                            code: 400,
                            body: {
                                error: "the given display \"" + property + "\" key is invalid",
                            },
                        });
                }
            }

            results.push(oneResult);
        }

        return Promise.resolve(results);
    }
}
