import { InsightDatasetKind } from "../IInsightFacade";
/**
 * A simple parser and filter for performQuery method of InsightFacade
 */

// Parser
export interface IParserResponse {
    code: number;
    body: IParserResponseSuccessBody | IParserResponseErrorBody;
 }

export interface IParserResponseSuccessBody {
    dataset: ISimpleDataset | IAggregateDataset;
    filter: IFilter;
    display: IKey[];
    apply?: IAggregation[];
    sort: ISimpleSort | IAggregateSort;
    type: ParserType;
}

export interface IParserResponseErrorBody {
    error: string;
}

// Properties
export interface ISimpleDataset {
    id: string;
    kind: InsightDatasetKind;
}

export interface IAggregateDataset {
    id: string;
    kind: InsightDatasetKind;
    group: IKey[];
}

export interface IFilter {
    isAllEntries: boolean;
    criteria: ICriteria[];
    logicalOperator: LogicalOperator[];
}

export interface ISimpleSort {
    kind: SortKind;
    key: MKey | SKey;
}

export interface IAggregateSort {
    kind: SortKind;
    keys: Array<MKey | SKey | string>;
}

export interface IKey {
    key: MKey | SKey | string;
}

export interface IAggregation {
    input: string;
    aggregator: Aggregator;
    key: MKey | SKey;
}

export interface ICriteria {
    criteria: IMCriteria | ISCriteria;
}

export interface IMCriteria {
    key: MKey;
    operator: MOperator;
    operand: number;
}

export interface ISCriteria {
    key: SKey;
    operator: SOperator;
    operand: string;
}

 // Enums
export enum SortKind {
     Ascending = "ascending",
     Descending = "descending",
}

export enum MKey {
    Average = "Average",
    Pass = "Pass",
    Fail = "Fail",
    Audit = "Audit",
    Year = "Year",
    Latitude = "Latitude",
    Longitude = "Longitude",
    Seats = "Seats",
}

export enum SKey {
    Department = "Department",
    ID = "ID",
    Instructor = "Instructor",
    Title = "Title",
    UUID = "UUID",
    FullName = "FullName",
    ShortName = "ShortName",
    Number = "Number",
    Name = "Name",
    Address = "Address",
    Type = "Type",
    Furniture = "Furniture",
    Link = "Link",
}

export enum MOperator {
    Greater = "is greater than",
    Less = "is less than",
    Equal = "is equal to",
    notGreater = "is not greater than",
    notLess = "is not less than",
    notEqual = "is not equal to",
}

export enum SOperator {
    Is = "is",
    isNot = "is not",
    Includes = "includes",
    Begins = "begins with",
    Ends = "ends with",
    notInclude = "does not include",
    notBegin = "does not begin with",
    notEnd = "does not end with",
}

export enum LogicalOperator {
    AND = "and",
    OR = "or",
}

export enum Aggregator {
    MIN   = "MIN",
    MAX   = "MAX",
    AVG   = "AVG",
    SUM   = "SUM",
    COUNT = "COUNT",
}

export enum ParserType {
    Simple    = "simple",
    Aggregate = "Aggregate",
}

export default interface IParser {
    /**
     * Parse the given query and identify its four parts (dataset, filter, sort, display)
     *
     * @return Promise <IParserResponse>
     *
     * The promise should return an IParserResponse for both fulfill and reject.
     *
     * Fulfill should be for 2XX codes and reject for everything else.
     *
     * Response codes:
     *
     * 204: the operation was successful
     * 400: the operation failed. The body should contain {"error": "my text"}
     * to explain what went wrong.
     */
    performParse(query: string): Promise<IParserResponse>;
 }
