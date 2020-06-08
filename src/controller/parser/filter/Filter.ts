import { SOperator, MOperator, IFilter, LogicalOperator, ICriteria, MKey, SKey,
         IMCriteria, ISCriteria } from "../IParser";
import Slicer from "../slicer/Slicer";
import Converter from "../converter/converter";

export default class Filter {
    private slicer: Slicer;
    private converter: Converter;

    constructor() {
        this.slicer = new Slicer();
        this.converter = new Converter();
    }

    public async parse(filter: string[]): Promise<IFilter> {
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
                const splitedOneCriteria = this.slicer.spaceAndQuotesSlicer(oneCriteria);
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
            keyObj = (await this.converter.convertToMKey(key) as MKey);
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
            operatorObj = await this.converter.convertToMOperator(operator);
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
            keyObj = (await this.converter.convertToSKey(key) as SKey);
        } catch (err) {
            return Promise.reject(err);
        }

        // Operand
        if (operand.startsWith("\"") && operand.endsWith("\"") &&
            !operand.includes("*") && !operand.slice(1, -1).includes("\"")) {
                operandObj = operand.split("COMMA&SPACE").join(", ").slice(1, -1);
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
            operatorObj = await this.converter.convertToSOperator(operator);
        } catch (err) {
            return Promise.reject(err);
        }

        return Promise.resolve({key: keyObj, operator: operatorObj, operand: operandObj});
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
