import IBuildingsDataset, { IDatasetResponse, IBuilding, IRoom } from "./IBuildingsDataset";
import Building from "./Building";
import * as fs from "fs";

/**
 * This is our primary buildings dataset model implementation
 */

export default class BuildingsDataset implements IBuildingsDataset {
    private name: string;
    private buildings: Building[];
    private path: string;

    constructor(name: string, buildings?: Building[], path?: string) {
        this.name = name;
        if (buildings !== undefined) {
            this.buildings = buildings;
        } else {
            this.buildings = [];
        }
        if (path !== undefined) {
            this.path = path;
        } else {
            this.path = "assets/rooms";
        }
    }

    public getName(): string {
        return this.name;
    }

    public getBuildings(): IBuilding[] {
        return this.buildings;
    }

    public store(): Promise<IDatasetResponse> {
        return new Promise((fulfill, reject) => {
            let numOfRooms: number = 0;

            // Check if the dataset doesn't exist in memory
            if (this.buildings === undefined) {
                reject({
                    code: 400,
                    body: {
                        error: "there is no buildings to store",
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
            for (const building of this.buildings) { // for each file
                obj.table = building.getRooms();
                json = JSON.stringify(obj);
                path = prevDir + building.getName() + ".json";

                numOfRooms += obj.table.length;

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
                    result: numOfRooms,
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
                this.buildings = this.readFiles(path);
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

    private readFiles(dirPath: string): Building[] {
        const buildings: Building[] = [];
        let fileNames: string[];
        let fileContet: string;
        let id: string;
        let rooms: IRoom[];
        let building: Building;

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
                rooms   = JSON.parse(fileContet).table;
                building    = new Building(id, rooms);
            } catch (err) {
                throw err;
            }

            buildings.push(building);
        }

        return buildings;
    }
 }
