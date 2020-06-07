import { IParserResponse, IParserResponseSuccessBody,
         IFilter, ISimpleDataset, IKey, ISimpleSort, SKey, MKey, SortKind,
         SOperator, MOperator, LogicalOperator, ICriteria } from "../../parser/IParser";
import CoursesDataset from "../../../model/courses/CoursesDataset";
import { ISection, ICourse } from "../../../model/courses/ICoursesDataset";
import { InsightDatasetKind, InsightResponse } from "../../IInsightFacade";
import BuildingsDataset from "../../../model/rooms/BuildingsDataset";
import { IRoom, IBuilding } from "../../../model/rooms/IBuildingsDataset";

export default class SimpleResult {

    public performResult(parsedQuery: IParserResponseSuccessBody): Promise<InsightResponse> {
        return new Promise(async (fulfill, reject) => {
            try {
                // Slice the parsed query response
                const dataset: ISimpleDataset = parsedQuery.dataset;
                const filter: IFilter         = parsedQuery.filter;
                const display: IKey[]         = parsedQuery.display;
                const sort: ISimpleSort       = (parsedQuery.sort as ISimpleSort);

                // Load dataset
                const loadedDataset: CoursesDataset | BuildingsDataset =
                      await this.loadDataset(dataset.id, dataset.kind);

                if (dataset.kind === InsightDatasetKind.Courses) { // Sections
                    // Merge sections
                    const sections = await this.sectionize((loadedDataset as CoursesDataset));

                    // Filter dataset
                    const filteredSections: ISection[] = (await this.filterDataset(sections, filter) as ISection[]);

                    // Sort dataset
                    const sortedSections: ISection[] = await this.sortCoursesDataset(filteredSections, sort);

                    // Display dataset
                    const displayedSections: ISection[] = await this.displayCoursesDataset(sortedSections, display);

                    fulfill({
                        code: 200,
                        body: {
                            result: displayedSections,
                        },
                    });

                } else if (dataset.kind === InsightDatasetKind.Rooms) { // Rooms
                    const rooms = await this.roomify((loadedDataset as BuildingsDataset));

                    // Filter dataset
                    const filteredRooms: IRoom[] = (await this.filterDataset(rooms, filter) as IRoom[]);

                    // Sort dataset
                    const sortedRooms: IRoom[] = await this.sortRoomsDataset(filteredRooms, sort);

                    // Display dataset
                    const displayedRooms: IRoom[] = await this.displayRoomsDataset(sortedRooms, display);

                    fulfill({
                        code: 200,
                        body: {
                            result: displayedRooms,
                        },
                    });
                }

            } catch (err) {
                reject(err);
            }
        });
    }

    public loadDataset(id: string, kind: InsightDatasetKind): Promise<CoursesDataset | BuildingsDataset> {
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
                const buildingsDataset = new BuildingsDataset(id);
                try {
                    await buildingsDataset.load();
                    fulfill(buildingsDataset);
                } catch (err) {
                    reject(err);
                }
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

    public sectionize(coursesDataset: CoursesDataset): Promise<ISection[]> {
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

    public roomify(buildingsDataset: BuildingsDataset): Promise<IRoom[]> {
        return new Promise((fulfill, reject) => {
            const buildings: IBuilding[] = buildingsDataset.getBuildings();
            const rooms: IRoom[] = [];

            for (const building of buildings) {
                rooms.push(... building.getRooms());
            }

            if (rooms.length) { // If there is rooms
                fulfill(rooms);
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

    public async filterDataset (dataset: ISection[] | IRoom[], filter: IFilter): Promise<Array<ISection | IRoom>> {
        let filteredSections: Array<ISection | IRoom> = [];

        // Valid (is all entries)
        if (filter.isAllEntries && !filter.criteria.length && !filter.logicalOperator.length) {
            return Promise.resolve(dataset);
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
            filteredSections = await (this.filterForOneCriteria(stringyOneCriteria, dataset));
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
                    const orFilteredSections = await (this.filterForOneCriteria(stringyOneCriteria, dataset));

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

    public sortCoursesDataset (sections: ISection[], sort: ISimpleSort): Promise<ISection[]> {
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
                case MKey.Seats:
                    key = "rooms_seats";
                    break;
                case MKey.Latitude:
                    key = "rooms_lat";
                    break;
                case MKey.Longitude:
                    key = "rooms_lon";
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
                case SKey.FullName:
                    key = "rooms_fullname";
                    break;
                case SKey.ShortName:
                    key = "rooms_shortname";
                    break;
                case SKey.Number:
                    key = "rooms_number";
                    break;
                case SKey.Name:
                    key = "rooms_name";
                    break;
                case SKey.Address:
                    key = "rooms_address";
                    break;
                case SKey.Type:
                    key = "rooms_type";
                    break;
                case SKey.Furniture:
                    key = "rooms_furniture";
                    break;
                case SKey.Link:
                    key = "rooms_href";
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
                                 dataset: Array<ISection | IRoom>): Promise<Array<ISection | IRoom>> {

        const filteredSections: Array<ISection | IRoom> = [];
        const key = stringyOneCriteria[0];
        const operator = stringyOneCriteria[1];
        const operand = stringyOneCriteria[2];

        for (const section of dataset) {
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

    private sortRoomsDataset (rooms: IRoom[], sort: ISimpleSort): Promise<IRoom[]> {
        if (sort === undefined || sort === null) { // If no sort
            return Promise.resolve(rooms);
        }

        // Sort ascendingly according to the given sort key
        const key: string = sort.key;
        switch (key) {
            case MKey.Seats:
                rooms.sort((a, b) => a.rooms_seats - b.rooms_seats);
                break;
            case MKey.Latitude:
                rooms.sort((a, b) => a.rooms_lat - b.rooms_lat);
                break;
            case MKey.Longitude:
                rooms.sort((a, b) => a.rooms_lon - b.rooms_lon);
                break;
            case SKey.FullName:
                rooms.sort((a, b) =>
                +(a.rooms_fullname > b.rooms_fullname) ||
                -(a.rooms_fullname < b.rooms_fullname));
                break;
            case SKey.ShortName:
                rooms.sort((a, b) =>
                +(a.rooms_shortname > b.rooms_shortname) ||
                -(a.rooms_shortname < b.rooms_shortname));
                break;
            case SKey.Number:
                rooms.sort((a, b) =>
                +(a.rooms_number > b.rooms_number) ||
                -(a.rooms_number < b.rooms_number));
                break;
            case SKey.Name:
                rooms.sort((a, b) =>
                +(a.rooms_name > b.rooms_name) ||
                -(a.rooms_name < b.rooms_name));
                break;
            case SKey.Address:
                rooms.sort((a, b) =>
                +(a.rooms_address > b.rooms_address) ||
                -(a.rooms_address < b.rooms_address));
                break;
            case SKey.Furniture:
                rooms.sort((a, b) =>
                +(a.rooms_furniture > b.rooms_furniture) ||
                -(a.rooms_furniture < b.rooms_furniture));
                break;
            case SKey.Type:
                rooms.sort((a, b) =>
                +(a.rooms_type > b.rooms_type) ||
                -(a.rooms_type < b.rooms_type));
                break;
            case SKey.Link:
                rooms.sort((a, b) =>
                +(a.rooms_href > b.rooms_href) ||
                -(a.rooms_href < b.rooms_href));
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
            rooms.reverse();
            return Promise.resolve(rooms);
        } else if (sort.kind === SortKind.Ascending) { // Ascending
            return Promise.resolve(rooms);
        } else {
            return Promise.reject({
                code: 400,
                body: {
                    error: "the given sort kind is invalid",
                },
            });
        }
    }

    private displayCoursesDataset (sections: ISection[], display: IKey[]): Promise<ISection[]> {
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

    private displayRoomsDataset (rooms: IRoom[], display: IKey[]): Promise<IRoom[]> {
        const properties: string[] = [];
        const results: any[] = [];

        for (const key of display) { // Convert keys object to strings
            properties.push(key.key as string);
        }

        for (const room of rooms) { // assign displayed sections
            const oneResult: any = {};
            for (const property of properties) {
                switch (property) {
                    case MKey.Seats:
                        oneResult["rooms_seats"] = room.rooms_seats;
                        break;
                    case MKey.Latitude:
                        oneResult["rooms_lat"] = room.rooms_lat;
                        break;
                    case MKey.Longitude:
                        oneResult["rooms_lon"] = room.rooms_lon;
                        break;
                    case SKey.FullName:
                        oneResult["rooms_fullname"] = room.rooms_fullname;
                        break;
                    case SKey.ShortName:
                        oneResult["rooms_shortname"] = room.rooms_shortname;
                        break;
                    case SKey.Number:
                        oneResult["rooms_number"] = room.rooms_number;
                        break;
                    case SKey.Name:
                        oneResult["rooms_name"] = room.rooms_name;
                        break;
                    case SKey.Furniture:
                        oneResult["rooms_furniture"] = room.rooms_furniture;
                        break;
                    case SKey.Address:
                        oneResult["rooms_address"] = room.rooms_address;
                        break;
                    case SKey.Type:
                        oneResult["rooms_type"] = room.rooms_type;
                        break;
                    case SKey.Link:
                        oneResult["rooms_href"] = room.rooms_href;
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
