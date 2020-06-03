import { InsightResponse, InsightDataset, InsightResponseSuccessBody } from "../IInsightFacade";
import JSZip = require("jszip");
import { parseFragment } from "parse5";

export default class Validator {

    public idValidation(id: string, insightDatasets: InsightDataset[]): Promise<InsightResponse> {
        const reservedWords: string[] =
            ["In", "dataset", "find", "all", "show", "and", "or",
             "sort", "by", "entries", "the", "of", "whose", "greater",
             "less", "than", "equal", "to", "includes", "include",
             "begins", "begin", "ends", "end", "is", "does", "not", "with"];

        return new Promise((fulfill, reject) => {

            // ID is invalid
            if (id === null) { // Check for null
                reject({
                    code: 400,
                    body: {
                        error: "the given id is null",
                    },
                });
            } else if (id === undefined) { // Check for undefined
                reject({
                    code: 400,
                    body: {
                        error: "the given id is undefined",
                    },
                });
            } else if (id.includes(" ")) { // Check for spane " "
                reject({
                    code: 400,
                    body: {
                        error: "the given id contains space",
                    },
                });
            } else if (id.includes("_")) { // Check for underscore "_"
                reject({
                    code: 400,
                    body: {
                        error: "the given id contains underscore",
                    },
                });
            } else if (reservedWords.includes(id)) { // Check for reserved Words
                reject({
                    code: 400,
                    body: {
                        error: id + " ID is a reserved keyword",
                    },
                });
            } else { // Check for using same id twice
                for (const insightDataset of insightDatasets) {
                    if (id === insightDataset.id) {
                        reject({
                            code: 400,
                            body: {
                                error: id + " ID has been used before",
                            },
                        });
                    }
                }
            }

            // ID is valid
            fulfill({
                code: 204,
                body: {
                    result: "the given id is valid",
                },
            });
        });
    }

    public coursesDatasetValidation(dataset: string): Promise<JSZip.JSZipObject[]> {
        return new Promise((fulfill, reject) => {

            // Dataset is invalid
            this.datasetValidation(dataset).
            then((zip) => {
                const folder: RegExp = /courses/;

                if (!zip.folder(folder).length) { // Check for courses folder
                    reject({
                        code: 400,
                        body: {
                            result: "the given dataset doesnot have courses folder",
                        },
                    });
                }

                const files =  zip.folder("courses").filter((path, file) => file.name.includes(".csv"));
                if (!files.length) { // Check for csv files
                    reject({
                        code: 400,
                        body: {
                            result: "the given dataset doesnot have csv files",
                        },
                    });
                }

                // Dataset is valid (primary)
                fulfill(files);
            }).

            catch((err) => reject(err));
        });
    }

    public RoomsDatasetValidation(dataset: string): Promise<[string[], JSZip]> {
        return new Promise((fulfill, reject) => {
            this.datasetValidation(dataset).
            then(async (zip) => {

                const index: JSZip.JSZipObject = zip.file(/index.xml/)[0];
                if (index === undefined) { // Check for index.xml file
                    reject({
                        code: 400,
                        body: {
                            result: "the given dataset doesnot have index.xml file",
                        },
                    });
                }

                try {
                    const indexContent: string        = await index.async("text");
                    const indexDocument: any          = parseFragment(indexContent);
                    const pathsOfbuildings: string[]  = indexDocument.childNodes[2].childNodes.
                                                                    filter((e: any) => e.nodeName !== "#text").
                                                                    map((e: any) => e.attrs[2].value.replace("./", ""));

                    if (!pathsOfbuildings.length) { // Check for building Tag
                        reject({
                            code: 400,
                            body: {
                                result: "the given dataset doesnot have any building tag inside index.xml file",
                            },
                        });
                    }

                    fulfill([pathsOfbuildings, zip]);

                } catch (err) { // Check for buildings Tag
                    reject({
                        code: 400,
                        body: {
                            result: "the given dataset doesnot have buildings tag inside index.xml file",
                        },
                    });
                }
            }).

            catch((err) => reject(err));
        });
    }

    private datasetValidation(dataset: string): Promise<JSZip> {
        return new Promise(async (fulfill, reject) => {

            // Dataset is invalid
            if (dataset === null) { // Check for null
                reject({
                    code: 400,
                    body: {
                        error: "the given dataset is null",
                    },
                });
            } else if (dataset === undefined) { // Check for undefined
                reject({
                    code: 400,
                    body: {
                        error: "the given dataset is undefined",
                    },
                });
            } else { // Check for base64

                const notBase64 = /[^A-Z0-9+\/=]/i;
                const len = dataset.length;
                if (!len || len % 4 !== 0 || notBase64.test(dataset)) {
                    reject({
                        code: 400,
                        body: {
                            error: "the given dataset is not base64",
                        },
                    });
                }

                const firstPaddingChar = dataset.indexOf("=");
                if (!(firstPaddingChar === -1 ||
                      firstPaddingChar === len - 1 ||
                      (firstPaddingChar === len - 2 && dataset[len - 1] === "="))) {
                        reject({
                            code: 400,
                            body: {
                                error: "the given dataset is not base64",
                            },
                        });
                    }
            }

            let zip: JSZip = new JSZip();
            try { // Check for zip file
                zip = await zip.loadAsync(dataset, {base64: true});
            } catch (err) {
                reject({
                    code: 400,
                    body: {
                        result: "the given dataset is not serialized zip file",
                    },
                });
            }

            // Dataset is valid
            fulfill(zip);
        });
    }
}
