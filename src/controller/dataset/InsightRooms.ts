import { InsightResponse, InsightDataset } from "../IInsightFacade";

// [TODO]
export default class InsightRooms {

    public addDataset(id: string, content: string, insightDatasets: InsightDataset[]): Promise<InsightResponse> {
        return Promise.reject({
            code: 400,
            body: {
                error: "adding dataset of kind rooms doesnot available yet",
            },
        });
    }

    public removeDataset(id: string): Promise<InsightResponse> {
        return Promise.reject({
            code: 404,
            body: {
                error: "rooms dataset is not supported yet",
            },
        });
    }
}
