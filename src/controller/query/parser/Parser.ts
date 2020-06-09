/**
 * This is our implementation of simple parser
 */

import IParser, { IParserResponse } from "./IParser";
import SimpleParser from "./types/SimpleParser";
import AggregateParser from "./types/AggregateParser";

export default class Parser implements IParser {
    private simpleParser: SimpleParser;
    private aggregateParser: AggregateParser;

    constructor() {
        this.simpleParser = new SimpleParser();
        this.aggregateParser = new AggregateParser();
    }

    public performParse(query: string): Promise<IParserResponse> {
        const dataset: string = query.split("; ")[0].split(", find")[0];

        if (dataset.includes("grouped by")) {
            return this.aggregateParser.performParse(query);
        } else {
            return this.simpleParser.performParse(query);
        }
    }
}
