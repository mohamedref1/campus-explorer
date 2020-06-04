import { IParserResponse, IParserResponseSuccessBody,
         IFilter, IDataset, IKey, ISort, SKey, MKey, SortKind,
         SOperator, MOperator, LogicalOperator, ICriteria } from "../parser/IParser";
import CoursesDataset from "../../model/courses/CoursesDataset";
import { ISection, ICourse } from "../../model/courses/ICoursesDataset";
import { InsightDatasetKind, InsightResponse } from "../IInsightFacade";

export default class Result {

    public performResult(parsedQuery: IParserResponse): Promise<InsightResponse> {
        return new Promise(async (fulfill, reject) => {
            try {
                // Slice the parsed query response
                const dataset: IDataset = (parsedQuery.body as IParserResponseSuccessBody).dataset;
                const filter: IFilter   = (parsedQuery.body as IParserResponseSuccessBody).filter;
                const display: IKey[]   = (parsedQuery.body as IParserResponseSuccessBody).display;
                const sort: ISort       = (parsedQuery.body as IParserResponseSuccessBody).sort;

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
                case MKey.Year:
                    key = "courses_year";
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
                    case MKey.Year:
                        oneResult["courses_year"] = section.courses_year;
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
