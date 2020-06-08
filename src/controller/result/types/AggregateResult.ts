import { IParserResponseSuccessBody, IAggregateDataset, IAggregateSort,
         IKey, IFilter, IAggregation, MKey, SKey, SortKind, Aggregator } from "../../parser/IParser";
import { InsightResponse, InsightDatasetKind } from "../../IInsightFacade";
import SimpleResult from "./SimpleResult";
import CoursesDataset from "../../../model/courses/CoursesDataset";
import BuildingsDataset from "../../../model/rooms/BuildingsDataset";
import { ISection } from "../../../model/courses/ICoursesDataset";
import { IRoom } from "../../../model/rooms/IBuildingsDataset";
import KeyObjectifier from "../../parser/objectifier/KeyObjectifier";

export default class AggregateResult {
    private simpleResult: SimpleResult;

    constructor() {
        this.simpleResult   = new SimpleResult();
    }
    public performResult(parsedQuery: IParserResponseSuccessBody): Promise<InsightResponse> {
        return new Promise(async (fulfill, reject) => {
            try {
                // Slice the parsed query response
                const dataset: IAggregateDataset = (parsedQuery.dataset as IAggregateDataset);
                const filter: IFilter            = parsedQuery.filter;
                const group: IKey[]              = dataset.group;
                const display: IKey[]            = parsedQuery.display;
                const apply: IAggregation[]      = parsedQuery.apply;
                const sort: IAggregateSort       = (parsedQuery.sort as IAggregateSort);

                // Load dataset
                const loadedDataset: CoursesDataset | BuildingsDataset =
                      await this.simpleResult.loadDataset(dataset.id, dataset.kind);

                if (dataset.kind === InsightDatasetKind.Courses) { // Sections
                    // Merge sections
                    const sections = await this.simpleResult.sectionize((loadedDataset as CoursesDataset));

                    // Filter dataset
                    const filteredSections: ISection[] =
                         (await this.simpleResult.filterDataset(sections, filter) as ISection[]);

                    // Group dataset
                    const groupedSections: ISection[][] = await this.groupCoursesDataset(filteredSections, group);

                    // Display dataset
                    const desplayedSections: ISection[][] =
                          await this.displayCoursesDataset(groupedSections, display, apply);

                    if (sort !== undefined) { // Sort, Merge Groups and Fulfil if exists
                        const sortedSections: ISection[][] = await this.sortCoursesDataset(desplayedSections, sort);
                        const mergedSections: ISection[] = [].concat.apply([], sortedSections);

                        fulfill({
                            code: 200,
                            body: {
                                result: mergedSections,
                            },
                        });
                    } else { // Merge Groups and Fulfil if exists
                        const mergedSections: ISection[] = [].concat.apply([], desplayedSections);

                        fulfill({
                            code: 200,
                            body: {
                                result: mergedSections,
                            },
                        });
                    }

                } else if (dataset.kind === InsightDatasetKind.Rooms) { // Rooms
                    // Merge Rooms
                    const rooms = await this.simpleResult.roomify((loadedDataset as BuildingsDataset));

                    // Filter dataset
                    const filteredRooms: IRoom[]   = (await this.simpleResult.filterDataset(rooms, filter) as IRoom[]);

                    // Group dataset
                    const groupedRooms: IRoom[][]  = await this.groupRoomsDataset(filteredRooms, group);

                    // Display dataset
                    const desplayedRooms: IRoom[][] =
                          await this.displayRoomsDataset(groupedRooms, display, apply);

                    if (sort !== undefined) { // Sort, Merge Groups and Fulfil if exists
                        const sortedRooms: IRoom[][] = await this.sortRoomsDataset(desplayedRooms, sort);
                        const mergedRooms: IRoom[]   = [].concat.apply([], sortedRooms);

                        fulfill({
                            code: 200,
                            body: {
                                result: mergedRooms,
                            },
                        });
                    } else { // Merge Groups and Fulfil if exists
                        const mergedRooms: IRoom[] = [].concat.apply([], desplayedRooms);

                        fulfill({
                            code: 200,
                            body: {
                                result: mergedRooms,
                            },
                        });
                    }
                }

            } catch (err) {
                reject(err);
            }
        });
    }

    private async groupCoursesDataset(sections: ISection[], group: IKey[]): Promise<ISection[][]> {
        let groupedDataset: ISection[][] = [sections];
        const groupProperties: string[]  = [];

        try { // Convert group keys to string ISection properties
            for (const key of group) {
                groupProperties.push(await this.keyToCoursesProperties(key));
            }
        } catch (err) {
            return Promise.reject(err);
        }

        for (const groupProperty of groupProperties) { // For each group item
            const groupsForOneProperty: ISection[][] = [];
            for (const oneGroup of groupedDataset) { // For each dataset group

                // Extract new groups
                let newGroups = oneGroup.map((e: any) => e[groupProperty]);
                newGroups     = newGroups.filter((item, pos) => newGroups.indexOf(item) === pos);

                // Applay each new group to existing ones
                newGroups.forEach((oneNewGroup) => {
                    groupsForOneProperty.push(oneGroup.filter((e: any) => e[groupProperty] === oneNewGroup));
                });
            }

            groupedDataset = groupsForOneProperty;
        }

        return Promise.resolve(groupedDataset);
    }

    private async groupRoomsDataset(rooms: IRoom[], groupingKeys: IKey[]): Promise<any[]> {
        let groupedDataset: IRoom[][]   = [rooms];
        const groupProperties: string[] = [];

        try { // Convert group keys to string ISection properties
            for (const key of groupingKeys) {
                groupProperties.push(await this.keyToRoomsProperties(key));
            }
        } catch (err) {
            return Promise.reject(err);
        }

        for (const groupProperty of groupProperties) { // For each group item
            const groupsForOneProperty: IRoom[][] = [];
            for (const oneGroup of groupedDataset) { // For each dataset group

                // Extract new groups
                let newGroups = oneGroup.map((e: any) => e[groupProperty]);
                newGroups     = newGroups.filter((item, pos) => newGroups.indexOf(item) === pos);

                // Applay each new group to existing ones
                newGroups.forEach((oneNewGroup) => {
                    groupsForOneProperty.push(oneGroup.filter((e: any) => e[groupProperty] === oneNewGroup));
                });
            }

            groupedDataset = groupsForOneProperty;
        }

        return Promise.resolve(groupedDataset);
    }

    private async displayCoursesDataset(sections: ISection[][], displayKeys: IKey[],
                                        aggregations: IAggregation[]): Promise<ISection[][]> {
        const results: any[][] = [];
        let subResult: any[] = [];

        // For each subset sections
        for (const subsetSections of sections) {
            subResult = [];

            // For each section
            for (const section of subsetSections) {
                const oneResult: any = {};

                // Apply each key
                for (const key of displayKeys) {

                    try {
                        // If it is an Input
                        let flag: boolean = true;
                        if (aggregations !== undefined) {
                            for (const aggregation of aggregations) {
                                if (key.key === aggregation.input) {
                                    oneResult[key.key] = await this.applyAggregation(subsetSections,
                                                                                            aggregation);
                                    flag = false;
                                }
                            }
                        }

                        // Else if it is a Key
                        if (flag) {
                            const property: string = await this.keyToCoursesProperties((key));
                            oneResult[property] = (section as any)[property];
                        }

                        // Else
                    } catch (err) {
                        return Promise.reject(err);
                    }
                }

                subResult.push(oneResult);
            }

            // Remove duplicated sections
            const uniq = new Set(subResult.map((e) => JSON.stringify(e)));
            const res = Array.from(uniq).map((e) => JSON.parse(e));

            results.push(res);
        }

        return Promise.resolve(results);
    }

    private async displayRoomsDataset(rooms: IRoom[][], displayKeys: IKey[],
                                      aggregations: IAggregation[]): Promise<IRoom[][]> {

        const results: any[][] = [];
        let subResult: any[] = [];

        // For each subset rooms
        for (const subRooms of rooms) {
            subResult = [];

            // For each room
            for (const room of subRooms) {
                const oneResult: any = {};

                // Apply each key
                for (const key of displayKeys) {

                    try {
                        // If it is an Input
                        let flag: boolean = true;
                        if (aggregations !== undefined) {
                            for (const aggregation of aggregations) {
                                if (key.key === aggregation.input) {
                                    oneResult[key.key] = await this.applyAggregation(subRooms,
                                                                                     aggregation);
                                    flag = false;
                                }
                            }
                        }

                        // Else if it is a Key
                        if (flag) {
                            const property: string = await this.keyToRoomsProperties((key));
                            oneResult[property] = (room as any)[property];
                        }

                        // Else
                    } catch (err) {
                        return Promise.reject(err);
                    }
                }

                subResult.push(oneResult);
            }

            // Remove duplicated sections
            const uniq = new Set(subResult.map((e) => JSON.stringify(e)));
            const res = Array.from(uniq).map((e) => JSON.parse(e));

            results.push(res);
        }

        return Promise.resolve(results);
    }

    private async applyAggregation(dataset: ISection[] | IRoom[], aggregation: IAggregation): Promise<number> {
        let key: string;
        const aggregator: Aggregator = aggregation.aggregator;
        let targetedFields: any[] = [];

        try { // Convert key to a section property
            key = await this.keyToCoursesProperties({key: aggregation.key});
        } catch (err) {
            try {
                key = await this.keyToRoomsProperties({key: aggregation.key});
            } catch (err) {
                return Promise.reject(err);
            }
        }

        for (const subDataset of dataset) { // Get targeted values to apply on
            targetedFields.push((subDataset as any)[key]);
        }

        switch (aggregator) {
            case Aggregator.MIN:
                return Promise.resolve(Math.min(...targetedFields));
            case Aggregator.MAX:
                return Promise.resolve(Math.max(...targetedFields));
            case Aggregator.COUNT:
                targetedFields = targetedFields.filter((item, pos) => targetedFields.indexOf(item) === pos);
                return Promise.resolve(targetedFields.length);
            case Aggregator.SUM:
                let sum: number = 0;
                targetedFields.forEach((value) => sum += value); // Total
                return Promise.resolve(parseFloat(sum.toFixed(2)));
            case Aggregator.AVG:
                let total: number = 0;
                targetedFields.forEach((value) => total += value); // Total
                const avg: number = total / targetedFields.length; // Average
                return Promise.resolve(parseFloat(avg.toFixed(2)));
            default:
                return Promise.reject({
                    code: 400,
                    body: {
                        error: "the given \"" + aggregator + "\" aggregator is invalid",
                    },
                });
        }
    }

    private async sortCoursesDataset(groupedSections: ISection[][], sortKeys: IAggregateSort): Promise<ISection[][]> {
        let result: ISection[][] = [];
        const kind = sortKeys.kind;
        const keys = sortKeys.keys;

        // First Key Sort
        // Stringify sections property
        let firstProperty: string;
        const firstKey = keys.shift();
        try { // Get Property
            firstProperty = await this.keyToCoursesProperties({key: firstKey});
        } catch (err) {
            firstProperty = firstKey;
        }

        try { // Logic
            const merge: ISection[]   = [].concat.apply([], groupedSections);
            const sort: ISection[]    = await this.sortGroupedSectionsDataset(merge, firstProperty, kind);
            const groups: ISection[][] = await this.groupCoursesDataset(sort, [{key: firstKey}]);
            result = groups;
        } catch (err) {
            return Promise.reject(err);
        }

        // Rest Key Sorts
        // For each Column
        for (const key of keys) {

            // Stringify sections property
            let property: string;
            try {
                property = await this.keyToCoursesProperties({key});
            } catch (err) {
                property = key;
            }

            // For each group of sections in result
            const resultGroups: ISection[][] = [];
            for (const oneGroup of result) {
                const sort = await this.sortGroupedSectionsDataset(oneGroup, property, kind);
                resultGroups.push(sort);

            }

            // Generate new groups for the next loop
            const newResultGroups: ISection[][] = [];
            for (const oneGroup of resultGroups) {
                try { // For IKey
                    const group = await this.groupCoursesDataset(oneGroup, [{key}]);
                    group.forEach((one) => newResultGroups.push(one));

                } catch (err) { // For Input
                    const group: ISection[][] = [];

                    // Extract new groups
                    let newGroups = oneGroup.map((e: any) => e[property]);
                    newGroups     = newGroups.filter((item, pos) => newGroups.indexOf(item) === pos);

                    // Applay each new group to existing ones
                    newGroups.forEach((oneNewGroup) => {
                        group.push(oneGroup.filter((e: any) => e[property] === oneNewGroup));
                    });

                    // const group = await this.groupCoursesDataset(oneGroup, [{key}]);
                    group.forEach((one) => newResultGroups.push(one));
                }

            }

            result = newResultGroups;
        }

        return Promise.resolve(result);
    }

    private sortGroupedSectionsDataset(sections: ISection[], property: string, kind: SortKind): Promise<ISection[]> {

        // Primary Sort
        if (typeof (sections as any)[property] === typeof 0) { // For Numbers
            sections.sort((a, b) => (a as any)[property] - (b as any)[property]);
        } else { // For Strings
            sections.sort((a, b) =>
            +((a as any)[property] > (b as any)[property]) ||
            -((a as any)[property] < (b as any)[property]));
        }

        // return sorted sections according to the given sort kind
        if (kind === SortKind.Descending) { // Descending
            sections.reverse();
            return Promise.resolve(sections);
        } else if (kind === SortKind.Ascending) { // Ascending
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

    private async sortRoomsDataset(groupedRooms: IRoom[][], sortKeys: IAggregateSort): Promise<IRoom[][]> {
        let result: IRoom[][] = [];
        const kind = sortKeys.kind;
        const keys = sortKeys.keys;

        // First Key Sort
        // Stringify sections property
        let firstProperty: string;
        const firstKey = keys.shift();
        try { // Get Property
            firstProperty = await this.keyToRoomsProperties({key: firstKey});
        } catch (err) {
            firstProperty = firstKey;
        }

        try { // Logic
            const merge: IRoom[]   = [].concat.apply([], groupedRooms);
            const sort: IRoom[]    = await this.sortGroupedRoomsDataset(merge, firstProperty, kind);
            const groups: IRoom[][] = await this.groupRoomsDataset(sort, [{key: firstKey}]);
            result = groups;
        } catch (err) {
            return Promise.reject(err);
        }

        // Rest Key Sorts
        // For each Column
        for (const key of keys) {

            // Stringify sections property
            let property: string;
            try {
                property = await this.keyToRoomsProperties({key});
            } catch (err) {
                property = key;
            }

            // For each group of sections in result
            const resultGroups: IRoom[][] = [];
            for (const oneGroup of result) {
                const sort = await this.sortGroupedRoomsDataset(oneGroup, property, kind);
                resultGroups.push(sort);

            }

            // Generate new groups for the next loop
            const newResultGroups: IRoom[][] = [];
            for (const oneGroup of resultGroups) {
                try { // For IKey
                    const group = await this.groupRoomsDataset(oneGroup, [{key}]);
                    group.forEach((one) => newResultGroups.push(one));

                } catch (err) { // For Input
                    const group: IRoom[][] = [];

                    // Extract new groups
                    let newGroups = oneGroup.map((e: any) => e[property]);
                    newGroups     = newGroups.filter((item, pos) => newGroups.indexOf(item) === pos);

                    // Applay each new group to existing ones
                    newGroups.forEach((oneNewGroup) => {
                        group.push(oneGroup.filter((e: any) => e[property] === oneNewGroup));
                    });

                    // const group = await this.groupCoursesDataset(oneGroup, [{key}]);
                    group.forEach((one) => newResultGroups.push(one));
                }

            }

            result = newResultGroups;
        }

        return Promise.resolve(result);
    }

    private sortGroupedRoomsDataset(rooms: IRoom[], property: string, kind: SortKind): Promise<IRoom[]> {

        // Primary Sort
        if (typeof (rooms as any)[property] === typeof 0) { // For Numbers
            rooms.sort((a, b) => (a as any)[property] - (b as any)[property]);
        } else { // For Strings
            rooms.sort((a, b) =>
            +((a as any)[property] > (b as any)[property]) ||
            -((a as any)[property] < (b as any)[property]));
        }

        // return sorted sections according to the given sort kind
        if (kind === SortKind.Descending) { // Descending
            rooms.reverse();
            return Promise.resolve(rooms);
        } else if (kind === SortKind.Ascending) { // Ascending
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

    private keyToCoursesProperties(key: IKey): Promise<string> {
        const strKeys: string[] = [];

        switch (key.key) {
            case MKey.Audit:
                return Promise.resolve("courses_audit");
            case MKey.Average:
                return Promise.resolve("courses_avg");
            case MKey.Fail:
                return Promise.resolve("courses_fail");
            case MKey.Pass:
                return Promise.resolve("courses_pass");
            case MKey.Year:
                return Promise.resolve("courses_year");
            case SKey.Department:
                return Promise.resolve("courses_dept");
            case SKey.ID:
                return Promise.resolve("courses_id");
            case SKey.UUID:
                return Promise.resolve("courses_uuid");
            case SKey.Instructor:
                return Promise.resolve("courses_instructor");
            case SKey.Title:
                return Promise.resolve("courses_title");
            default:
                return Promise.reject({
                    code: 400,
                    body: {
                        error: "the given display \"" + key.key + "\" key is invalid",
                    },
                });
        }
    }

    private keyToRoomsProperties(key: IKey): Promise<string> {
        const strKeys: string[] = [];

        switch (key.key) {
            case MKey.Seats:
                return Promise.resolve("rooms_seats");
            case MKey.Latitude:
                return Promise.resolve("rooms_lat");
            case MKey.Longitude:
                return Promise.resolve("rooms_lon");
            case SKey.FullName:
                return Promise.resolve("rooms_fullname");
            case SKey.ShortName:
                return Promise.resolve("rooms_shortname");
            case SKey.Number:
                return Promise.resolve("rooms_number");
            case SKey.Name:
                return Promise.resolve("rooms_name");
            case SKey.Address:
                return Promise.resolve("rooms_address");
            case SKey.Type:
                return Promise.resolve("rooms_type");
            case SKey.Furniture:
                return Promise.resolve("rooms_furniture");
            case SKey.Link:
                return Promise.resolve("rooms_href");
            default:
                return Promise.reject({
                    code: 400,
                    body: {
                        error: "the given display \"" + key.key + "\" key is invalid",
                    },
                });
        }
    }
}
