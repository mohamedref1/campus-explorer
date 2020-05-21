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
    dataset: IDataset;
    filter: IFilter;
    display: IKey[];
    sort: ISort;
}

export interface IParserResponseErrorBody {
    error: string;
}

// Properties
export interface IDataset {
     id: string;
     kind: InsightDatasetKind;
}

export interface IFilter {
    isAllEntries: boolean;
    criteria: ICriteria[];
    logicalOperator: LogicalOperator[];
}

export interface ISort {
    kind: SortKind;
    key: MKey | SKey;
}

export interface IKey {
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
}

export enum SKey {
    Department = "Department",
    ID = "ID",
    Instructor = "Instructor",
    Title = "Title",
    UUID = "UUID",
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

export default interface IParser {
    performParse(query: string): Promise<IParserResponse>;
 }
