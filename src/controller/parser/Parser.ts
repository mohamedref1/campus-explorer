import IParser, { IParserResponse, IDataset, IFilter, IKey, MKey, SKey, ISort,
                  SortKind, LogicalOperator, ICriteria, MOperator, SOperator,
                  IMCriteria, ISCriteria} from "./IParser";
import { InsightDatasetKind } from "../IInsightFacade";

/**
 * This is our implementation of parser
 */

export default class Parser implements IParser {

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
            const queryParts = await this.querySlice(query); // returns four lists of strings
            dataset = queryParts[0];
            filter  = queryParts[1];
            display = queryParts[2];
            sort    = queryParts[3];
        } catch (err) {
            return Promise.reject(err);
        }

        // Objectify
        try {
            datasetObj = await this.parseDataset(dataset);
            filterObj = await this.parseFilter(filter);
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

    private querySlice(query: string): Promise<string[][]> {
        let dataset: string[];
        let filter: string[];
        let display: string[];
        let sort: string[];

        try { // Slice depending on "In", "find", "show", "sort" at the beginning
              // and ";", ",", "." at the end
            dataset = query.split("; ")[0].split(", ")[0].split(" ");
            filter  = query.split("; ")[0].replace(", ", "SEP").split("SEP")[1]
                           .split(", ").join("COMMA&SPACE").split(" ");

            display = query.split("; ")[1].replace("show ", "show, ")
                           .split(" and").join(",").split(", ");

            if (query.split("; ")[2]) { // If sort part exists
                sort = query.split("; ")[2].replace(" by ", " by,").split(",");

                if (!sort.length || !sort[0].startsWith("sort")) { throw new Error(); }
                const lastSortElement: string = sort.pop();
                if (lastSortElement.slice(-1) !== ".") { throw new Error(); }
                sort.push(lastSortElement.slice(0, -1));

            } else {
                const lastDisplayElement: string = display.pop();
                if (lastDisplayElement.slice(-1) !== ".") { throw new Error(); }
                display.push(lastDisplayElement.slice(0, -1));
            }

            if (dataset === undefined || display === undefined || filter === undefined ||
                dataset[0] !== "In"   || display[0] !== "show" || filter[0] !== "find") { throw new Error(); }

        } catch (err) {
            return Promise.reject({
                code: 400,
                body: {
                    error: "invalid syntax: slice",
                },
            });
        }

        return Promise.resolve([dataset, filter, display, sort]);
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
            return Promise.reject({
                code: 400,
                body: {
                    error: "rooms dataset does not available yet",
                },
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

    private async parseFilter(filter: string[]): Promise<IFilter> {
        // Syntactic validation
        if (filter[0] === "find" && filter[1] === "all" && filter[2] === "entries") { // Find all entries
            filter.splice(0, 3);
            if (!filter.length) {
                return Promise.resolve({
                    isAllEntries: true,
                    criteria: [],
                    logicalOperator: [],
                });
            }
        } else if (filter[0] === "find" && filter[1] === "entries" && filter[2] === "whose") { // Find entries whose
            filter.splice(0, 3);
            if (!filter.length) {
                return Promise.reject({
                    code: 400,
                    body: {
                        error: "invalid syntax: filter",
                    },
                });
            }

        } else { // Invalid syntax
            return Promise.reject({
                code: 400,
                body: {
                    error: "invalid syntax: filter",
                },
            });
        }

        // Parse logical Operators
        filter = filter.join(" ").split(" and ").join(",and,").split(" or ").join(",or,").split(",");

        const logicalOperatorObj: LogicalOperator[] = [];

        for (const word of filter) {
            if (word === LogicalOperator.AND) {
                logicalOperatorObj.push(LogicalOperator.AND);
            } else if (word === LogicalOperator.OR) {
                logicalOperatorObj.push(LogicalOperator.OR);
            }
        }

        // Parse criteria
        const criteria: string[] = filter.join(" ").split(" and ").join(",").split(" or ").join(",").split(",");
        let criteriaObj: ICriteria[];
        try {
            criteriaObj = await this.parseCriteria(criteria);
        } catch (err) {
            return Promise.reject(err);
        }

        return Promise.resolve({
            isAllEntries: false,
            criteria: criteriaObj,
            logicalOperator: logicalOperatorObj,
         });
    }

    private  async parseCriteria(criteria: string[]): Promise<ICriteria[]> {
    const criteriaObj: ICriteria[] = [];

    // Syntactic validation
    if (!criteria.length) {
        return Promise.reject({
            code: 400,
            body: {
                error: "invalid syntax: filter (criteria)",
            },
        });
    }

    // One criteria by one
    for (const oneCriteria of criteria) {
        try {
            const splitedOneCriteria = oneCriteria.split(" ");
            const key: string = splitedOneCriteria.shift();
            const operand: string = splitedOneCriteria.pop();
            const operator: string = splitedOneCriteria.join(" ");

            if (key === undefined || operand === undefined || operator === undefined) { throw new Error(); }

            criteriaObj.push(await this.parseOneCriteria(key, operand, operator));

        } catch (err) {
            return Promise.reject(err);
        }
    }

    return Promise.resolve(criteriaObj);
    }

    private  async parseOneCriteria(key: string, operand: string, operator: string): Promise<ICriteria> {
    const criteria: ICriteria = {criteria: undefined};

    if ((Object as any).values(MKey).includes(key)) { // MCriteria
        criteria.criteria = await this.parseOneMCriteria(key, operand, operator);
    } else if ((Object as any).values(SKey).includes(key)) { // SCriteria
        criteria.criteria = await this.parseOneSCriteria(key, operand, operator);
    } else {
        return Promise.reject({ // Invalid
            code: 400,
            body: {
                error: "invalid syntax: filter (one criteria)",
            },
        });
    }

    return Promise.resolve(criteria);
    }

    private async parseOneMCriteria(key: string, operand: string, operator: string): Promise<IMCriteria> {
        let keyObj: MKey;
        let operandObj: number;
        let operatorObj: MOperator;

        // Key
        try {
            keyObj = (await this.strToKeyObj(key) as MKey);
        } catch (err) {
            return Promise.reject(err);
        }

        // Operand
        operandObj = parseFloat(operand);
        if (!this.isFloat(operand)) {
            return Promise.reject({
                code: 400,
                body: {
                    error: "invalid syntax: filter (mcriteria operand)",
                },
            });
        }

        // Operator
        try {
            operatorObj = await this.strToMOperatorObj(operator);
        } catch (err) {
            return Promise.reject(err);
        }

        return Promise.resolve({key: keyObj, operator: operatorObj, operand: operandObj});
    }

    private async parseOneSCriteria(key: string, operand: string, operator: string): Promise<ISCriteria> {
        let keyObj: SKey;
        let operandObj: string;
        let operatorObj: SOperator;

        // Key
        try {
            keyObj = (await this.strToKeyObj(key) as SKey);
        } catch (err) {
            return Promise.reject(err);
        }

        // Operand
        if (operand.startsWith("\"") && operand.endsWith("\"") &&
            !operand.includes("*") && !operand.slice(1, -1).includes("\"")) {
            operandObj = operand.replace("COMMA&SPACE", ", ").slice(1, -1);
        } else {
            return Promise.reject({
                code: 400,
                body: {
                    error: "invalid syntax: filter (scriteria operand)",
                },
            });
        }

        // Operator
        try {
            operatorObj = await this.strToSOperatorObj(operator);
        } catch (err) {
            return Promise.reject(err);
        }

        return Promise.resolve({key: keyObj, operator: operatorObj, operand: operandObj});
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
                const keyObj = await this.strToKeyObj(key);
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
            return Promise.reject({
                code: 400,
                body: {
                    error: "sort in descending order does not available yet",
                },
            });
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
            sortKeyObj = await this.strToKeyObj(sortKey);

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

    private strToKeyObj(key: string): Promise<MKey | SKey> {
        switch (key) {
            case MKey.Audit:
                return Promise.resolve(MKey.Audit);
            case MKey.Average:
                return Promise.resolve(MKey.Average);
            case MKey.Fail:
                return Promise.resolve(MKey.Fail);
            case MKey.Pass:
                return Promise.resolve(MKey.Pass);
            case MKey.Year:
                return Promise.resolve(MKey.Year);
            case SKey.Department:
                return Promise.resolve(SKey.Department);
            case SKey.ID:
                return Promise.resolve(SKey.ID);
            case SKey.Instructor:
                return Promise.resolve(SKey.Instructor);
            case SKey.Title:
                return Promise.resolve(SKey.Title);
            case SKey.UUID:
                return Promise.resolve(SKey.UUID);
            default:
                return Promise.reject({
                    code: 400,
                    body: {
                        error: "invalid key: " + key,
                    },
                });
        }
    }

    private strToMOperatorObj(operator: string): Promise<MOperator> {
        switch (operator) {
            case MOperator.Equal:
                return Promise.resolve(MOperator.Equal);
            case MOperator.Greater:
                return Promise.resolve(MOperator.Greater);
            case MOperator.Less:
                return Promise.resolve(MOperator.Less);
            case MOperator.notEqual:
                return Promise.resolve(MOperator.notEqual);
            case MOperator.notGreater:
                return Promise.resolve(MOperator.notGreater);
            case MOperator.notLess:
                return Promise.resolve(MOperator.notLess);
            default:
                return Promise.reject({
                    code: 400,
                    body: {
                        error: "invalid mathematical operator: " + operator,
                    },
                });
        }
    }

    private strToSOperatorObj(operator: string): Promise<SOperator> {
        switch (operator) {
            case SOperator.Is:
                return Promise.resolve(SOperator.Is);
            case SOperator.Includes:
                return Promise.resolve(SOperator.Includes);
            case SOperator.Begins:
                return Promise.resolve(SOperator.Begins);
            case SOperator.Ends:
                return Promise.resolve(SOperator.Ends);
            case SOperator.isNot:
                return Promise.resolve(SOperator.isNot);
            case SOperator.notInclude:
                return Promise.resolve(SOperator.notInclude);
            case SOperator.notBegin:
                return Promise.resolve(SOperator.notBegin);
            case SOperator.notEnd:
                return Promise.resolve(SOperator.notEnd);
            default:
                return Promise.reject({
                    code: 400,
                    body: {
                        error: "invalid string operator: " + operator,
                    },
                });
        }
    }

    private isFloat(value: string): boolean {
        const floatRegex: RegExp = /^-?\d+(?:[.]\d*?)?$/;
        if (!floatRegex.test(value)) {
            return false;
        }

        const parsedVal: number = parseFloat(value);
        if (isNaN(parsedVal)) {
            return false;
        }

        return true;
    }
 }
