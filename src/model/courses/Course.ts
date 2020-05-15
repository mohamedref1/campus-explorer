import { ICourse, ISection } from "./ICoursesDataset";

/**
 * This is our primary course model implementation
 */

export default class Course implements ICourse {
    private name: string;
    private sections: ISection[];

    constructor(name: string, sections: ISection[]) {
        this.name = name;
        this.sections = sections;
    }

    public getName(): string {
        return this.name;
    }
    public getSections(): ISection[] {
        return this.sections;
    }

 }
