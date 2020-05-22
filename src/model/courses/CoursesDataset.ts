
/**
 * This is our primary coursesDataset model implementation
 */

import ICoursesDataset, { ICourse, IDatasetResponse, ISection } from "./ICoursesDataset";
import Course from "./Course";
import * as fs from "fs";

export default class CoursesDataset implements ICoursesDataset {
    private name: string;
    private courses: Course[];
    private path: string;

    constructor(name: string, courses?: Course[], path?: string) {
        this.name = name;
        if (courses !== undefined) {
            this.courses = courses;
        } else {
            this.courses = [];
        }
        if (path !== undefined) {
            this.path = path;
        } else {
            this.path = "assets/courses";
        }
    }

    public getName(): string {
        return this.name;
    }

    public getCourses(): ICourse[] {
        return this.courses;
    }

    public store(): Promise<IDatasetResponse> {
        return new Promise((fulfill, reject) => {
            let numRow: number = 0;

            // Check if the dataset doesn't exist in memory
            if (this.courses === undefined) {
                reject({
                    code: 400,
                    body: {
                        error: "there is no courses to store",
                    },
                });
            }

            // Intialize directories if doesn't exist
            const directories: string[] = (this.path + "/" + this.name).split("/");
            let prevDir: string = "";
            for (const dir of directories) {
                if (!fs.existsSync(prevDir + dir)) {
                    fs.mkdirSync(prevDir + dir);
                }

                if (prevDir.length) {
                    prevDir = prevDir + "/" + dir + "/";
                } else {
                    prevDir = dir + "/";
                }
            }

            // Create JSON data files and store it on the disk
            const obj: {table: any[]} = {table: []};
            let json: string;
            let path: string;

            prevDir = directories.join("/") + "/";
            for (const course of this.courses) { // for each file
                obj.table = course.getSections();
                json = JSON.stringify(obj);
                path = prevDir + course.getName() + ".json";

                numRow += obj.table.length;

                fs.writeFile(path, json, "utf8", (err) => {
                    reject({
                        code: 400,
                        body: {
                            error: "there is something wrong with storing: " + path + " on the disk",
                        },
                    });
                });

            }

            fulfill({
                code: 204,
                body: {
                    result: numRow,
                },
            });
        });
    }

    public load(): Promise<IDatasetResponse> {
        return new Promise(async (fulfill, reject) => {
            const path: string = this.path + "/" + this.name + "/";

            // Check whether the given dataset id exists or not
            if (!fs.existsSync(path)) {
                reject({
                    code: 400,
                    body: {
                        error: "the given dataset id does not exist on the disk",
                    },
                });
            }

            // Load files
            try {
                this.courses = this.readFiles(path);
            } catch (err) {
                reject({
                    code: 400,
                    body: {
                        error: "there is something wrong with loading id dataset json files",
                    },
                });
            }

            fulfill({
                code: 200,
                body: {
                    result: "courses dataset loaded successfully",
                },
            });
        });
    }

    public remove(): Promise<IDatasetResponse> {
        return new Promise((fulfill, reject) => {
            const path: string = this.path + "/" + this.name;

            if (fs.existsSync(path)) { // Remove
                this.deleteFolderRecursive(path);
                fulfill({
                    code: 204,
                    body: {
                        result: this.name + " dataset has been removed correctly",
                    },
                });
            } else {
                reject({ // Doesn't exist
                    code: 400,
                    body: {
                        error: this.name + " dataset doesnot exist",
                    },
                });
            }
        });
    }

    private deleteFolderRecursive(path: fs.PathLike) {
        const Path = require("path");

        function recursive() {
            if (fs.existsSync(path)) {
                fs.readdirSync(path).forEach((file, index) => {
                  const curPath = Path.join(path, file);
                  if (fs.lstatSync(curPath).isDirectory()) { // Recurse
                    this.deleteFolderRecursive(curPath);
                  } else { // Delete file
                    fs.unlinkSync(curPath);
                  }
                });
                fs.rmdirSync(path);
            }
        }

        recursive();
    }

    private readFiles(dirPath: string): Course[] {
        const courses: Course[] = [];
        let fileNames: string[];
        let fileContet: string;
        let id: string;
        let sections: ISection[];
        let course: Course;

        // Make sure that dirPath exists on the disk
        try {
            fileNames = fs.readdirSync(dirPath);
        } catch (err) {
            throw err;
        }

        // Load course by course
        for (const fileName of fileNames) {
            try {
                fileContet = fs.readFileSync(dirPath + fileName, "utf-8");
                id         = fileName.replace(".json", "");
                sections   = JSON.parse(fileContet).table;
                course    = new Course(id, sections);
            } catch (err) {
                throw err;
            }

            courses.push(course);
        }

        return courses;
      }
 }
