import { IParserResponseSuccessBody, IAggregateDataset, IAggregateSort,
         IKey, IFilter, IAggregation, SortKind, Aggregator } from "../../parser/IParser";
import { InsightResponse, InsightDatasetKind } from "../../../IInsightFacade";
import SimpleResult from "./SimpleResult";
import CoursesDataset from "../../../../model/courses/CoursesDataset";
import BuildingsDataset from "../../../../model/rooms/BuildingsDataset";
import { ISection } from "../../../../model/courses/ICoursesDataset";
import { IRoom } from "../../../../model/rooms/IBuildingsDataset";
import Converter from "../../converter/Converter";

export default class AggregateResult {
    private simpleResult: SimpleResult;
    private converter: Converter;

    constructor() {
        this.simpleResult   = new SimpleResult();
        this.converter = new Converter();
    }

    public performResult(parsedQuery: IParserResponseSuccessBody): Promise<InsightResponse> {
        return new Promise(async (fulfill, reject) => {
            try {
                // Slice the parsed query response
                const dataset: IAggregateDataset = (parsedQuery.dataset as IAggregateDataset);
                const filter: IFilter            = parsedQuery.filter;
                const groupingKeys: IKey[]          = dataset.group;
                const displayKeys: IKey[]        = parsedQuery.display;
                const apply: IAggregation[]      = parsedQuery.apply;
                const sort: IAggregateSort       = (parsedQuery.sort as IAggregateSort);

                // Load dataset
                const loadedDataset: CoursesDataset | BuildingsDataset =
                      await this.simpleResult.loadDataset(dataset.id, dataset.kind);

                if (dataset.kind === InsightDatasetKind.Courses) { // Sections
                    // Merge sections
                    const sections =
                        await this.simpleResult.sectionize((loadedDataset as CoursesDataset));

                    // Filter dataset
                    const filteredSections: ISection[] =
                        (await this.simpleResult.filterDataset(sections, filter) as ISection[]);

                    // Group dataset
                    const sectionsGroups: ISection[][] =
                        await this.groupifyCoursesDataset(filteredSections, groupingKeys);

                    // Display dataset
                    const desplayedSectionsGroups: ISection[][] =
                        await this.displayCoursesDataset(sectionsGroups, displayKeys, apply);

                    let mergedSections: ISection[];
                    if (sort !== undefined) { // Sort and Merge Groups (if sort exists)

                        // Sort
                        const sortedSections: ISection[][] =
                            await this.sortCoursesGroupsDataset(desplayedSectionsGroups, sort);

                        // Merge
                        mergedSections = [].concat.apply([], sortedSections);
                    } else { // Merge Groups only
                        mergedSections = [].concat.apply([], desplayedSectionsGroups);
                    }

                    fulfill({
                        code: 200,
                        body: {
                            result: mergedSections,
                        },
                    });

                } else if (dataset.kind === InsightDatasetKind.Rooms) { // Rooms
                    // Merge Rooms
                    const rooms = await this.simpleResult.roomify((loadedDataset as BuildingsDataset));

                    // Filter dataset
                    const filteredRooms: IRoom[]    =
                        (await this.simpleResult.filterDataset(rooms, filter) as IRoom[]);

                    // Group dataset
                    const roomsGroups: IRoom[][]   =
                        await this.groupifyRoomsDataset(filteredRooms, groupingKeys);

                    // Display dataset
                    const desplayedRoomsGroups: IRoom[][] =
                        await this.displayRoomsDataset(roomsGroups, displayKeys, apply);

                    let mergedRooms: IRoom[];
                    if (sort !== undefined) { // Sort and Merge Groups (if sort exists)
                        // Sort
                        const sortedRooms: IRoom[][] = await this.sortRoomsGroupsDataset(desplayedRoomsGroups, sort);
                        // Merge
                        mergedRooms                  = [].concat.apply([], sortedRooms);
                    } else { // Merge Groups only
                        mergedRooms = [].concat.apply([], desplayedRoomsGroups);
                    }

                    fulfill({
                        code: 200,
                        body: {
                            result: mergedRooms,
                        },
                    });
                }

            } catch (err) {
                reject(err);
            }
        });
    }

    private async groupifyCoursesDataset(sections: ISection[], groupingKeys: IKey[]): Promise<ISection[][]> {
        let sectionsGroups: ISection[][] = [sections];
        const groupingProperties: string[]  = [];

        try { // Convert grouping keys to string ISection properties
            for (const key of groupingKeys) {
                groupingProperties.push(await this.converter.convertToCoursesProperty(key.key));
            }
        } catch (err) {
            return Promise.reject(err);
        }

        for (const groupingProperty of groupingProperties) { // For each grouping property
            const newSectionsGroups: ISection[][] = [];

            for (const sectionGroup of sectionsGroups) { // For each section group

                // Extract new groups keys
                let newGroupsKeys = sectionGroup.map((e: any) => e[groupingProperty]);
                const uniq = new Set(newGroupsKeys.map((e) => JSON.stringify(e)));
                newGroupsKeys = Array.from(uniq).map((e) => JSON.parse(e));

                // Applay each new group key to sections group
                newGroupsKeys.forEach((oneNewGroupKey) => {
                    newSectionsGroups.push(sectionGroup.filter((e: any) => e[groupingProperty] === oneNewGroupKey));
                });
            }

            sectionsGroups = newSectionsGroups;
        }

        return Promise.resolve(sectionsGroups);
    }

    private async groupifyRoomsDataset(rooms: IRoom[], groupingKeys: IKey[]): Promise<IRoom[][]> {
        let roomsGroups: IRoom[][]   = [rooms];
        const groupingProperties: string[] = [];

        try { // Convert grouping keys to string IRoom properties
            for (const key of groupingKeys) {
                groupingProperties.push(await this.converter.convertToRoomsProperty(key.key));
            }
        } catch (err) {
            return Promise.reject(err);
        }

        for (const groupingProperty of groupingProperties) { // For each group item
            const newRoomGroups: IRoom[][] = [];
            for (const roomsGroup of roomsGroups) { // For each dataset group

                // Extract new groups keys
                let newGroupsKeys = roomsGroup.map((e: any) => e[groupingProperty]);
                const uniq = new Set(newGroupsKeys.map((e) => JSON.stringify(e)));
                newGroupsKeys = Array.from(uniq).map((e) => JSON.parse(e));

                // Applay each new group key to rooms group
                newGroupsKeys.forEach((newGroupsKey) => {
                    newRoomGroups.push(roomsGroup.filter((e: any) => e[groupingProperty] === newGroupsKey));
                });
            }

            roomsGroups = newRoomGroups;
        }

        return Promise.resolve(roomsGroups);
    }

    private async displayCoursesDataset(sectionsGroups: ISection[][], displayKeys: IKey[],
                                        aggregations: IAggregation[]): Promise<ISection[][]> {
        const displayedSectionsGroups: ISection[][] = [];
        let displayedSection: any = {};

        // For each sections group
        for (const sectionsGroup of sectionsGroups) {
            displayedSection = {};

            for (const key of displayKeys) {
                try {
                    // If it is an aggregator key
                    let flag: boolean = true;
                    if (aggregations !== undefined) {
                        for (const aggregation of aggregations) {
                            if (key.key === aggregation.input) {
                                displayedSection[key.key] = await this.applyAggregation(sectionsGroup, aggregation);
                                flag = false;
                            }
                        }
                    }

                    // Else if it is a display Key
                    if (flag) {
                        try {
                            const property: string = await this.converter.convertToCoursesProperty((key.key));
                            displayedSection[property] = (sectionsGroup[0] as any)[property];

                            // Else
                        } catch (err) {
                            return Promise.reject(err);
                        }
                    }

                    // Else
                } catch (err) {
                    return Promise.reject(err);
                }
            }
            displayedSectionsGroups.push([displayedSection]);
        }

        return Promise.resolve(displayedSectionsGroups);
    }

    private async displayRoomsDataset(roomsGroups: IRoom[][], displayKeys: IKey[],
                                      aggregations: IAggregation[]): Promise<IRoom[][]> {
        const displayedRoomsGroups: IRoom[][] = [];
        let displayedRoom: any = {};

        // For each sections group
        for (const sectionsGroup of roomsGroups) {
            displayedRoom = {};

            for (const key of displayKeys) {
                try {
                    // If it is an aggregator key
                    let flag: boolean = true;
                    if (aggregations !== undefined) {
                        for (const aggregation of aggregations) {
                            if (key.key === aggregation.input) {
                                displayedRoom[key.key] = await this.applyAggregation(sectionsGroup, aggregation);
                                flag = false;
                            }
                        }
                    }

                    // Else if it is a display Key
                    if (flag) {
                        try {
                            const property: string = await this.converter.convertToRoomsProperty((key.key));
                            displayedRoom[property] = (sectionsGroup[0] as any)[property];

                            // Else
                        } catch (err) {
                            return Promise.reject(err);
                        }
                    }

                    // Else
                } catch (err) {
                    return Promise.reject(err);
                }
            }
            displayedRoomsGroups.push([displayedRoom]);
        }

        return Promise.resolve(displayedRoomsGroups);
    }

    private async applyAggregation(dataset: ISection[] | IRoom[], aggregation: IAggregation): Promise<number> {
        let property: string;
        const aggregator: Aggregator = aggregation.aggregator;
        let targetedFields: any[] = [];

        try { // Convert key to a dataset property
            property = await this.converter.convertToProperty(aggregation.key);
        } catch (err) {
            return Promise.reject(err);
        }

        for (const subDataset of dataset) { // Get targeted values from each piece of the dataset to apply on
            targetedFields.push((subDataset as any)[property]);
        }

        switch (aggregator) { // Apply the given aggredator on the targetedFields and fulfill
            case Aggregator.MIN:
                return Promise.resolve(Math.min(...targetedFields));
            case Aggregator.MAX:
                return Promise.resolve(Math.max(...targetedFields));
            case Aggregator.COUNT:
                targetedFields = targetedFields.filter((item, pos) => targetedFields.indexOf(item) === pos);
                return Promise.resolve(targetedFields.length);
            case Aggregator.SUM:
                let sum: number = 0;
                targetedFields.forEach((value) => sum += value); // Calculate Total
                return Promise.resolve(parseFloat(sum.toFixed(2)));
            case Aggregator.AVG:
                const Decimal = require("decimal.js");

                let total = new Decimal(0);
                targetedFields.forEach((value) => { // Calculate Total
                    value = new Decimal(value);
                    total = total.plus(value);
                });

                const avg: number = total.toNumber() / targetedFields.length; // Calculate Average

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

    private async sortCoursesGroupsDataset(sectionsGroups: ISection[][],
                                           sortKeys: IAggregateSort): Promise<ISection[][]> {
        let result: ISection[][] = [];
        const kind = sortKeys.kind;
        const keys = sortKeys.keys;

        // First Key Sort
        // Stringify sections property
        let firstProperty: string;
        const firstKey = keys.shift();
        try { // Get Property
            firstProperty = await this.converter.convertToCoursesProperty(firstKey);
        } catch (err) {
            firstProperty = firstKey;
        }

        try { // Logic
            const merge: ISection[]   = [].concat.apply([], sectionsGroups);
            const sort: ISection[]    = (await this.sortDataset(merge, firstProperty, kind) as ISection[]);

            let groups: ISection[][] = [];
            try { // For Key
                groups = await this.groupifyCoursesDataset(sort, [{key: firstKey}]);
            } catch (err) { // For Input

                // Extract new groups
                let newGroups = sort.map((e: any) => e[firstKey]);
                newGroups     = newGroups.filter((item, pos) => newGroups.indexOf(item) === pos);

                // Applay each new group to existing ones
                newGroups.forEach((oneNewGroup) => {
                    groups.push(sort.filter((e: any) => e[firstKey] === oneNewGroup));
                });

            }

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
                property = await this.converter.convertToCoursesProperty(key);
            } catch (err) {
                property = key;
            }

            // For each group of sections in result
            const resultGroups: ISection[][] = [];
            for (const oneGroup of result) {
                const sort = (await this.sortDataset(oneGroup, property, kind) as ISection[]);
                resultGroups.push(sort);

            }

            // Generate new groups for the next loop
            const newResultGroups: ISection[][] = [];
            for (const oneGroup of resultGroups) {
                try { // For IKey
                    const group = await this.groupifyCoursesDataset(oneGroup, [{key}]);
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

    private async sortRoomsGroupsDataset(groupedRooms: IRoom[][], sortKeys: IAggregateSort): Promise<IRoom[][]> {
        let result: IRoom[][] = [];
        const kind = sortKeys.kind;
        const keys = sortKeys.keys;

        // First Key Sort
        // Stringify rooms property
        let firstProperty: string;
        const firstKey = keys.shift();
        try { // Get Property
            firstProperty = await this.converter.convertToRoomsProperty(firstKey);
        } catch (err) {
            firstProperty = firstKey;
        }

        try { // Logic
            const merge: IRoom[]   = [].concat.apply([], groupedRooms);
            const sort: IRoom[]    = (await this.sortDataset(merge, firstProperty, kind) as IRoom[]);
            let groups: IRoom[][] = [];
            try { // For Key
                groups = await this.groupifyRoomsDataset(sort, [{key: firstKey}]);
            } catch (err) { // For Input

                // Extract new groups
                let newGroups = sort.map((e: any) => e[firstKey]);
                newGroups     = newGroups.filter((item, pos) => newGroups.indexOf(item) === pos);

                // Applay each new group to existing ones
                newGroups.forEach((oneNewGroup) => {
                    groups.push(sort.filter((e: any) => e[firstKey] === oneNewGroup));
                });

            }
            result = groups;
        } catch (err) {
            return Promise.reject(err);
        }

        // Rest Key Sorts
        // For each Column
        for (const key of keys) {

            // Stringify rooms property
            let property: string;
            try {
                property = await this.converter.convertToRoomsProperty(key);
            } catch (err) {
                property = key;
            }

            // For each group of sections in result
            const resultGroups: IRoom[][] = [];
            for (const oneGroup of result) {
                const sort = (await this.sortDataset(oneGroup, property, kind) as IRoom[]);
                resultGroups.push(sort);

            }

            // Generate new groups for the next loop
            const newResultGroups: IRoom[][] = [];
            for (const oneGroup of resultGroups) {
                try { // For IKey
                    const group = await this.groupifyRoomsDataset(oneGroup, [{key}]);
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

    private sortDataset(dataset: ISection[] | IRoom[],
                        property: string, kind: SortKind): Promise<IRoom[] | ISection[]> {

        // Primary Sort
        if (typeof (dataset as any)[property] === typeof 0) { // For Numbers
            (dataset as any).sort((a: any, b: any) => a[property] - b[property]);
        } else { // For Strings
            (dataset as any).sort((a: any, b: any) =>
            +(a[property] > b[property]) ||
            -(a[property] < b[property]));
        }

        // return sorted sections according to the given sort kind
        if (kind === SortKind.Descending) { // Descending
            dataset.reverse();
            return Promise.resolve(dataset);
        } else if (kind === SortKind.Ascending) { // Ascending
            return Promise.resolve(dataset);
        } else {
            return Promise.reject({
                code: 400,
                body: {
                    error: "the given sort kind is invalid",
                },
            });
        }
    }
}
