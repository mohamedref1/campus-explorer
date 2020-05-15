
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

    constructor(name: string, courses?: Course[]) {
        this.name = name;
        if ( courses !== undefined) {
            this.courses = courses;
        } else {
            this.courses = [];
        }
        this.path = "assets/courses";
    }

    public getName(): string {
        return this.name;
    }

    public getCourses(): ICourse[] {
        return this.courses;
    }

    public store(): Promise<IDatasetResponse> {
        return new Promise((fulfull, reject) => {
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

            // Create JSON data files
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
                    reject(err);
                });

            }

            fulfull({
                code: 204,
                body: {
                    result: numRow,
                },
            });
        });
    }

    public load(): Promise<IDatasetResponse> {
        return Promise.reject({code: -1, body: null});
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
                  if (fs.lstatSync(curPath).isDirectory()) { // recurse
                    this.deleteFolderRecursive(curPath);
                  } else { // delete file
                    fs.unlinkSync(curPath);
                  }
                });
                fs.rmdirSync(path);
            }
        }

        recursive();
    }
 }
