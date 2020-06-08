import IParser, { IParserResponse, IFilter, IKey, IAggregateDataset,
                  IAggregation, Aggregator, SKey, MKey, IAggregateSort, SortKind, ParserType} from "../IParser";
import Slicer from "../slicer/Slicer";
import KeyObjectifier from "../objectifier/KeyObjectifier";
import SimpleParser from "./SimpleParser";

/**
 * This is our implementation of aggregate parser
 */

export default class AggregateParser implements IParser {
    private slicer: Slicer;
    private simpleParser: SimpleParser;
    private keyObjectifier: KeyObjectifier;

    constructor() {
        this.slicer = new Slicer();
        this.simpleParser = new SimpleParser();
        this.keyObjectifier = new KeyObjectifier();
    }

    public async performParse(query: string): Promise<IParserResponse> {
        let dataset: string[];
        let group: string[];
        let filter: string[];
        let display: string[];
        let apply: string[];
        let sort: string[];

        let datasetObj: IAggregateDataset;
        let filterObj: IFilter;
        let applyObj: IAggregation[];
        let displayObj: IKey[];
        let sortObj: IAggregateSort;

        // Slicing
        try {
            const queryParts = await this.slicer.aggregateQuerySlice(query); // returns four lists of strings
            dataset = queryParts[0];
            group   = queryParts[1];
            filter  = queryParts[2];
            display = queryParts[3];
            apply   = queryParts[4];
            sort    = queryParts[5];
        } catch (err) {
            return Promise.reject(err);
        }

        // Objectify
        try {
            datasetObj = await this.parseDataset(dataset, group);
            filterObj  = await this.parseFilter(filter);

            if (apply !== undefined) { // If apply exists
                applyObj   = await this.parseApply(apply);
            }

            displayObj = await this.parseDisplay(display, applyObj);

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
                apply: applyObj,
                display: displayObj,
                sort: sortObj,
                type: ParserType.Aggregate,
            },
        });
    }

    private async parseDataset(dataset: string[], group: string[]): Promise<IAggregateDataset> {
        try {
            const simpleDatasetObj = await this.simpleParser.parseDataset(dataset);
            const keysObj: IKey[] = [];

            // Syntactic validation for goruping
            if (group[0] === "grouped" && group[1] === "by") {
                group.shift();
                group.shift();
            } else {
                return Promise.reject({
                    code: 400,
                    body: {
                        error: "invalid syntax: dataset (group)",
                    },
                });
            }

            // Objectify grouping keys
            for (const key of group) {
                const keyObj = await this.keyObjectifier.convertToKey(key);
                keysObj.push({key: keyObj});
            }

            // Objectify dataset
            const aggregateDatasetObj: IAggregateDataset = {
                id: simpleDatasetObj.id,
                kind: simpleDatasetObj.kind,
                group: keysObj,
            };

            return Promise.resolve(aggregateDatasetObj);

        } catch (err) {
            return Promise.reject(err);
        }
    }

    private parseFilter(filter: string[]): Promise<IFilter> {
        return this.simpleParser.parseFilter(filter);
    }

    private async parseApply(aggregations: string[]): Promise<IAggregation[]> {
        const aggregationObjs: IAggregation[] = [];

        // Syntactic Validation
        if (aggregations[0] === "where") {
            aggregations.shift();
        } else {
            return Promise.reject({
                code: 400,
                body: {
                    error: "invalid syntax: dataset (group)",
                },
            });
        }

        // One by One
        for (const oneAggregation of aggregations) {
            const splittedOneAggregation = oneAggregation.replace(" is the ", " ").replace(" of ", " ").split(" ");

            try { // Objectify

                if (splittedOneAggregation.length !== 3) {
                    return Promise.reject({
                        code: 400,
                        body: {
                            error: "invalid syntax: apply",
                        },
                    });
                 }

                const input      = splittedOneAggregation[0];
                const aggregator = await this.strToAggregator(splittedOneAggregation[1]);
                let key: MKey | SKey;

                if (aggregator === Aggregator.COUNT) { // All Keys is valid
                    key = await this.keyObjectifier.convertToKey(splittedOneAggregation[2]);
                } else { // Only Mkey is valid
                    key = await this.keyObjectifier.convertToMKey(splittedOneAggregation[2]);
                }

                if (input.includes("_") || input.includes("*")) { // Input validation
                    return Promise.reject({
                        code: 400,
                        body: {
                            error: "invalid syntax: apply (input)",
                        },
                    });
                }

                aggregationObjs.push({
                    input,
                    aggregator,
                    key,
                });

            } catch (err) {
                return Promise.reject(err);
            }
        }

        return Promise.resolve(aggregationObjs);
    }

    private async parseDisplay(display: string[], applyObj: IAggregation[]): Promise<IKey []> {
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
                const keyObj = await this.keyObjectifier.convertToKey(key);
                displayObj.push({key: keyObj});
            } catch (err) {

                // Reject if the apply is undefined
                if (applyObj === undefined) {
                    return Promise.reject(err);
                }

                // Add if it is an aggregated input
                let flag = true;
                for (const oneAggregation of applyObj) {
                    if (key === oneAggregation.input) {
                        displayObj.push({key});
                        flag = false;
                    }
                }

                // Reject if it is not aggregated input
                if (flag) {
                    return Promise.reject(err);
                }
            }
        }

        return Promise.resolve(displayObj);
    }

    private async parseSort(sort: string[], displayObj: IKey[]): Promise<IAggregateSort> {

        // Syntactic validation
        if (sort === undefined || sort.length < 2) {
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
            sort.shift();
            sortKindObj = SortKind.Ascending;
        } else if (sortKind === "sort in descending order by") {
            sort.shift();
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
        const displayKeys: string[] = [];
        for (const displayKey of displayObj) {
            displayKeys.push(displayKey.key);
        }

        const sortKeyObjs: Array<MKey | SKey | string> = [];
        for (const sortKey of sort) { // For each key
            let sortKeyObj: MKey | SKey | string;
            try {

                try { // Try For MKey and SKey
                    sortKeyObj = await this.keyObjectifier.convertToKey(sortKey);
                    sortKeyObjs.push(sortKeyObj);
                } catch (e) {
                    if (displayKeys.includes(sortKey)) {
                        sortKeyObjs.push(sortKey);
                    }
                }

                if (!displayKeys.includes(sortKey)) { // Try For Input
                    return Promise.reject({
                        code: 400,
                        body: {
                            error: "invalid key: " + sortKey,
                        },
                    });
                }

            } catch (err) { // Else
                return Promise.reject(err);
            }
        }

        return Promise.resolve({kind: sortKindObj, keys: sortKeyObjs});
    }

    private strToAggregator(aggregate: string): Promise<Aggregator> {
        switch (aggregate) {
            case Aggregator.MIN:
                return Promise.resolve(Aggregator.MIN);
            case Aggregator.MAX:
                return Promise.resolve(Aggregator.MAX);
            case Aggregator.AVG:
                return Promise.resolve(Aggregator.AVG);
            case Aggregator.SUM:
                return Promise.resolve(Aggregator.SUM);
            case Aggregator.COUNT:
                return Promise.resolve(Aggregator.COUNT);
            default:
                return Promise.reject({
                    code: 400,
                    body: {
                        error: aggregate + " is an invalid aggregator",
                    },
                });
        }
    }
}
