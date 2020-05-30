import Validator from "./Validator";
import { InsightDataset, InsightResponse, InsightDatasetKind } from "../IInsightFacade";
import { IDatasetResponseSuccessBody, ISection } from "../../model/courses/ICoursesDataset";
import Course from "../../model/courses/Course";
import JSZip = require("jszip");
import CoursesDataset from "../../model/courses/CoursesDataset";

export default class InsightCourses {
    private validator: Validator;

    constructor() {
        this.validator = new Validator();
    }

    public addDataset(id: string, content: string, insightDatasets: InsightDataset[]): Promise<InsightResponse> {
        return new Promise(async (fulfill, reject) => {

            try {
                await this.validator.idValidation(id, insightDatasets);

                const files   = await this.validator.coursesDatasetValidation(content);
                const courses = await this.objectifyCoursesDataset(files);
                const res     = await new CoursesDataset(id, courses).store();

                const numRows: number = ((res.body as IDatasetResponseSuccessBody).result as number);
                if (numRows) {
                    insightDatasets.push({
                        id,
                        kind: InsightDatasetKind.Courses,
                        numRows,
                    });

                    fulfill({
                        code: 204,
                        body: {
                            result: insightDatasets,
                        },
                    });
                } else {
                    reject({
                        code: 400,
                        body: {
                            error: "there is an error with local storage",
                        },
                    });
                }

            } catch (err) {
                reject (err);
            }
        });
    }

    public removeDataset(id: string): Promise<InsightResponse> {
        return new Promise((fulfill, reject) => {
            new CoursesDataset(id).remove().
                then(() => {
                    fulfill({
                        code: 204,
                        body: {
                            result: id + " dataset has been removed successfully",
                        },
                    });
                }).
                catch(() => {
                    reject({
                        code: 404,
                        body: {
                            error: id + " dataset doesnot exist on the disk",
                        },
                    });
                });
        });
    }

    private objectifyCoursesDataset(files: JSZip.JSZipObject[]): Promise<Course[]> {
        const header = "Title|id|Professor|Audit|Year|Course|Pass|Fail|Avg|Subject";
        let text: string;
        let listOfLines: string[];
        let listOfWords: string[];
        let sections: ISection[] = [];
        const courses: Course[] = [];

        return new Promise(async (fulfill, reject) => {
            for (const file of files) { // For each file
                sections = [];
                try {
                    text = await file.async("text");
                } catch (err) {
                     continue;
                }

                listOfLines = text.split("\n");

                // Skip invalid csv file that has wrong headers
                if (!listOfLines[0].includes(header)) { continue; }

                for (const line of listOfLines.slice(1)) { // For each line
                    listOfWords = line.split("|");

                    if (listOfWords.length === 10) {
                        const section = {
                            courses_dept: listOfWords[9].replace("\r", ""),
                            courses_id: listOfWords[5],
                            courses_avg: parseFloat(listOfWords[8]),
                            courses_instructor: listOfWords[2],
                            courses_title: listOfWords[0],
                            courses_pass: parseFloat(listOfWords[6]),
                            courses_fail: parseFloat(listOfWords[7]),
                            courses_audit: parseFloat(listOfWords[3]),
                            courses_uuid: listOfWords[1],
                        };

                        sections.push(section);
                    }
                }

                if (sections.length) {
                    const name = file.name.split("/").pop().replace(".csv", "");
                    courses.push(new Course(name, sections));
                }
            }

            if (courses.length) {
                fulfill(courses);
            } else {
                reject({
                    code: 400,
                    body: {
                        error: "all csv files of the given dataset are invalid",
                    },
                });
            }
        });
    }
}
