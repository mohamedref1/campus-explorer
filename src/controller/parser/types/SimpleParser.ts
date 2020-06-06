import IParser, { IParserResponse, IDataset, IFilter, IKey, MKey, SKey, ISort,
                  SortKind} from "../IParser";
import { InsightDatasetKind } from "../../IInsightFacade";
import Slicer from "../slicer/Slicer";
import KeyObjectifier from "../objectifier/KeyObjectifier";
import Filter from "../filter/Filter";

/**
 * This is our implementation of simple parser
 */

export default class SimpleParser implements IParser {
    private slicer: Slicer;
    private filter: Filter;
    private keyObjectifier: KeyObjectifier;

    constructor() {
        this.slicer = new Slicer();
        this.filter = new Filter();
        this.keyObjectifier = new KeyObjectifier();
    }

    public async performParse(query: string): Promise<IParserResponse> {
        let dataset: string[];
        let filter: string[];
        let display: string[];
        let sort: string[];

        let datasetObj: IDataset;
        let filterObj: IFilter;
        let displayObj: IKey[];
        let sortObj: ISort;

        // Slicing
        try {
            const queryParts = await this.slicer.simpleQuerySlice(query); // returns four lists of strings
            dataset = queryParts[0];
            filter  = queryParts[1];
            display = queryParts[2];
            sort    = queryParts[3];
        } catch (err) {
            return Promise.reject(err);
        }

        // Here

        // Objectify
        try {
            datasetObj = await this.parseDataset(dataset);
            filterObj = await this.filter.parse(filter);
            displayObj = await this.parseDisplay(display);

            if (sort !== undefined) { // If sort exists
                sortObj = await this.parseSort(sort, displayObj);
            }
        } catch (err) {
            return Promise.reject(err);
        }

        // Return Query Object
        return Promise.resolve({
            code: 200,
            body: {
                dataset: datasetObj,
                filter: filterObj,
                display: displayObj,
                sort: sortObj,
            },
        });
    }

    private parseDataset(dataset: string[]): Promise<IDataset> {
        // Syntactic validation
        if (!(dataset.length === 4) || !(dataset[0] === "In") || !(dataset[2] === "dataset")) {
            return Promise.reject({
                code: 400,
                body: {
                    error: "invalid syntax: dataset",
                },
            });
        }

        // ID validation
        if (dataset[3].includes("_")) {
            return Promise.reject({
                code: 400,
                body: {
                    error: "invalid dataset id",
                },
            });
        }

        // Kind validation
        if (dataset[1] === InsightDatasetKind.Courses) {
            return Promise.resolve({
                id: dataset[3],
                kind: InsightDatasetKind.Courses,
            });
        } else if (dataset[1] === InsightDatasetKind.Rooms) {
            return Promise.resolve({
                id: dataset[3],
                kind: InsightDatasetKind.Rooms,
            });
        } else {
            return Promise.reject({
                code: 400,
                body: {
                    error: "invalid dataset kind",
                },
            });
        }
    }

    private async parseDisplay(display: string[]): Promise<IKey[]> {

        // Syntactic validation
        if (display[0] === "show" && display.length > 1) {
            display.shift();
        } else {
            return Promise.reject({
                code: 400,
                body: {
                    error: "invalid syntax: display",
                },
            });
        }

        // Objectify display keys
        const displayObj: IKey[] = [];
        for (const key of display) {
            try {
                const keyObj = await this.keyObjectifier.convertToObject(key);
                displayObj.push({key: keyObj});
            } catch (err) {
                return Promise.reject(err);
            }
        }

        return Promise.resolve(displayObj);
    }

    private async parseSort(sort: string[], displayObj: IKey[]): Promise<ISort> {

        // Syntactic validation
        if (sort === undefined || sort.length !== 2) {
            return Promise.reject({
                code: 400,
                body: {
                    error: "invalid syntax: sort",
                },
            });
        }

        // Objectify Sort Kind
        const sortKind = sort[0];
        let sortKindObj: SortKind;
        if (sortKind === "sort in ascending order by") {
            sortKindObj = SortKind.Ascending;
        } else if (sortKind === "sort in descending order by") {
            sortKindObj = SortKind.Descending;
        } else {
            return Promise.reject({
                code: 400,
                body: {
                    error: "invalid syntax: sort (kind)",
                },
            });
        }

        // Objectify Sort Key
        const sortKey = sort[1];
        let sortKeyObj: MKey | SKey;
        try {
            sortKeyObj = await this.keyObjectifier.convertToObject(sortKey);

            const displayKeys: string[] = [];
            for (const displayKey of displayObj) {
                displayKeys.push(displayKey.key);
            }

            if (!displayKeys.includes(sortKey)) {
                return Promise.reject({
                    code: 400,
                    body: {
                        error: "invalid key: " + sortKey,
                    },
                });
            }

        } catch (err) {
            return Promise.reject(err);
        }

        return Promise.resolve({kind: sortKindObj, key: sortKeyObj});
    }
 }
