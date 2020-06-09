import SimpleResult from "./types/SimpleResult";
import AggregateResult from "./types/AggregateResult";
import { IParserResponseSuccessBody, ParserType } from "../parser/IParser";
import { InsightResponse } from "../../IInsightFacade";

export default class Result {
    private simpleResult: SimpleResult;
    private aggregateResult: AggregateResult;

    constructor() {
        this.simpleResult    = new SimpleResult();
        this.aggregateResult = new AggregateResult();
    }

    public performResult(parsedQuery: IParserResponseSuccessBody): Promise<InsightResponse> {
        if (parsedQuery.type === ParserType.Simple) {
            return this.simpleResult.performResult(parsedQuery);
        } else {
            return this.aggregateResult.performResult(parsedQuery);
        }
    }
}
