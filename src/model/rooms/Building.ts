import { IBuilding, IRoom } from "./IBuildingsDataset";

/**
 * This is our primary building model implementation
 */

export default class Building implements IBuilding {
    private name: string;
    private rooms: IRoom[];

    constructor(name: string, sections: IRoom[]) {
        this.name = name;
        this.rooms = sections;
    }

    public getName(): string {
        return this.name;
    }
    public getRooms(): IRoom[] {
        return this.rooms;
    }

 }
