import { InsightResponse, InsightDataset, InsightDatasetKind } from "../IInsightFacade";
import Validator from "./Validator";
import JSZip = require("jszip");
import { parseFragment } from "parse5";
import { IRoom, IDatasetResponseSuccessBody } from "../../model/rooms/IBuildingsDataset";
import Building from "../../model/rooms/Building";
import BuildingsDataset from "../../model/rooms/BuildingsDataset";

interface ICoordinates {
    lat?: number;
    lon?: number;
    error?: string;
}

export default class InsightRooms {
    private validator: Validator;

    constructor() {
        this.validator = new Validator();
    }

    public addDataset(id: string, content: string, insightDatasets: InsightDataset[]): Promise<InsightResponse> {
        return new Promise(async (fulfill, reject) => {
            try {
                await this.validator.idValidation(id, insightDatasets);

                const [pathsOfbuildings, zip]  = await this.validator.RoomsDatasetValidation(content);
                const buildings: Building[]    = await this.objectifyRoomsDataset(pathsOfbuildings, zip);
                const res                      = await new BuildingsDataset(id, buildings).store();

                const numRows: number = ((res.body as IDatasetResponseSuccessBody).result as number);
                if (numRows) {
                    insightDatasets.push({
                        id,
                        kind: InsightDatasetKind.Rooms,
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
                reject(err);
            }
        });
    }

    public removeDataset(id: string): Promise<InsightResponse> {
        return new Promise((fulfill, reject) => {
            new BuildingsDataset(id).remove().
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

    private async objectifyRoomsDataset(paths: string[], zip: JSZip): Promise<Building[]> {
        const buildings: Building[] = [];
        const urls = [];

        for (const pathOfBuilding of paths) { // Building path By Building path
            const rooms = [];

            // Get the text of the given building path
            let fileText: string;
            try {
                fileText = await zip.file(pathOfBuilding).async("text");
            } catch (err) {
                return Promise.reject({
                    code: 400,
                    body: "the " + pathOfBuilding + " building doesnot exist",
                });
            }

            // Get Rooms Elements and handle it one by one
            try {
                // Getting the list of xml Rooms Elements
                const fileDocument: any     = parseFragment(fileText);
                const buildingElement: any  = fileDocument.childNodes[2];
                const roomsElements: any[]  = fileDocument.childNodes[2].childNodes[1].childNodes.
                                                            filter((e: any) => e.nodeName !== "#text");

                // Assign Building getting coordinates url to urls
                urls.push("http://sdmm.cs.ubc.ca:11316/api/v1/teamsecap_nullamagister/"
                            + buildingElement.attrs[1].value.split(" ").join("%20"));

                for (const roomElement of roomsElements) { // Room Element By Room Element
                    const webElement: any    = roomElement.childNodes[1];
                    const spaceElement: any  = webElement.childNodes[1];

                    rooms.push({rooms_fullname: buildingElement.attrs[2].value,
                                rooms_shortname: buildingElement.attrs[0].value,
                                rooms_number: roomElement.attrs[0].value,
                                rooms_name: buildingElement.attrs[0].value + "_" + roomElement.attrs[0].value,
                                rooms_address: buildingElement.attrs[1].value,
                                rooms_seats: parseInt(spaceElement.attrs[0].value, 10),
                                rooms_type: spaceElement.attrs[2].value,
                                rooms_furniture: spaceElement.attrs[1].value,
                                rooms_href: webElement.attrs[0].value});
                }

                const splittedPath: string[]  = pathOfBuilding.split("/");
                const name: string            = splittedPath[splittedPath.length - 1];
                buildings.push(new Building(name, rooms));

            } catch (err) {
                return Promise.reject({
                    code: 400,
                    body: "the " + pathOfBuilding + " building file is not in an xml format",
                });
            }
        }

        // Assign Coordinates for each room
        const coords: ICoordinates[] = await this.getCoordinates(urls);
        for (const building of buildings) {
            const oneCoords = coords.shift();
            for (const room of building.getRooms()) {
                if (Object.keys(oneCoords).includes("lat") && Object.keys(oneCoords).includes("lon")) {
                    room["rooms_lat"] = oneCoords.lat;
                    room["rooms_lon"] = oneCoords.lon;
                } else {
                    room["rooms_lat"] = undefined;
                    room["rooms_lon"] = undefined;
                }

            }
        }

        return Promise.resolve(buildings);
    }

    private async getCoordinates(urls: string[]): Promise<ICoordinates[]> {

        const coordsPromises: Array<Promise<ICoordinates>> = [];
        for (const url of urls) { coordsPromises.push(this.httpRequest(url)); }

        const coords = await Promise.all(coordsPromises);
        return Promise.resolve(coords);
    }

    private httpRequest(url: string): Promise<ICoordinates> {
        return new Promise((fulfill, reject) => {
            const http = require("http");

            const req = http.request(url, (res: any) => {
                // reject on bad status
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    return reject(new Error("statusCode=" + res.statusCode));
                }
                // cumulate data
                const body: any[] = [];
                let parsedData: ICoordinates;

                res.on("data", (chunk: any) => {
                    body.push(chunk);
                });
                // resolve on end
                res.on("end", () => {
                    try {
                        parsedData = JSON.parse(Buffer.concat(body).toString());
                    } catch (err) {
                        reject(err);
                    }
                    fulfill(parsedData);
                });
            });

            // reject on request error
            req.on("error", (err: any) => {
                // This is not a "Second reject", just a different sort of failure
                reject(err);
            });

            // IMPORTANT
            req.end();
        });
    }
}
