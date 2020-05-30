import { InsightResponse, InsightDataset } from "../IInsightFacade";

// [TODO]
export default class InsightRooms {

    public addDataset(id: string, content: string, insightDatasets: InsightDataset[]): Promise<InsightResponse> {
        return Promise.reject({code: -1, body: null});
    }

    public removeDataset(id: string): Promise<InsightResponse> {
        return Promise.reject({code: -1, body: null});
    }
}
