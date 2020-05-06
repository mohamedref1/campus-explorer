import { expect } from "chai";

import { InsightResponse, InsightResponseSuccessBody, InsightDatasetKind } from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

// This should match the JSON schema described in test/query.schema.json
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    response: InsightResponse;
    filename: string;  // This is injected when reading the file
}

describe("InsightFacade Add/Remove Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the Before All hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        courses7Z: "./test/data/courses.7z",
        coursesWithoutFolder: "./test/data/coursesWithoutFolder.zip",
        coursesWithoutCSVfiles: "./test/data/coursesWithoutCSVfiles.zip",
        coursesWithoutSections: "./test/data/coursesWithoutSections.zip",
        coursesWithoutRightHeadings: "./test/data/coursesWithoutRightHeadings.zip",
    };

    let insightFacade: InsightFacade;
    let datasets: { [id: string]: string };

    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToLoad)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map((buf, i) => {
                return { [Object.keys(datasetsToLoad)[i]]: buf.toString("base64") };
            });
            datasets = Object.assign({}, ...loadedDatasets);
            expect(Object.keys(datasets)).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    describe("InsightFacade addDataset", function () {
        it("Should add a valid dataset", async () => {
            const expectedCode: number = 204;
            const id: string = "courses";
            let response: InsightResponse;

            try {
                response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
            } catch (err) {
                response = err;
            } finally {
                expect(response.code).to.equal(expectedCode);
            }
        });

        it("Shoudn't add a dataset with an id that used before", async () => {
            const id: string = "courses";
            const expectedCode: number = 400;
            let response: InsightResponse;

            try {
                response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
            } catch (err) {
                response = err;
            } finally {
                expect(response.code).to.equal(expectedCode);
            }
        });

        describe("Shouldn't add a dataset with an incorrect id", function () {
            const expectedCode: number = 400;
            const validDataID: string = "courses";
            let invalidID: string;
            let response: InsightResponse;

            it("Shouldn't accept null id", async () => {
                invalidID = null;
                try {
                    response = await insightFacade.addDataset(invalidID, datasets[validDataID],
                        InsightDatasetKind.Courses);
                } catch (err) {
                    response = err;
                } finally {
                    expect(response.code).to.equal(expectedCode);
                }
            });

            it("Shouldn't accept undefined id", async () => {
                invalidID = undefined;
                try {
                    response = await insightFacade.addDataset(invalidID, datasets[validDataID],
                        InsightDatasetKind.Courses);
                } catch (err) {
                    response = err;
                } finally {
                    expect(response.code).to.equal(expectedCode);
                }
            });

            it("Shouldn't accept id that has space", async () => {
                invalidID = "new courses";
                try {
                    response = await insightFacade.addDataset(invalidID, datasets[validDataID],
                        InsightDatasetKind.Courses);
                } catch (err) {
                    response = err;
                } finally {
                    expect(response.code).to.equal(expectedCode);
                }
            });

            it("Shouldn't accept id that has underscore", async () => {
                invalidID = "new_courses";
                try {
                    response = await insightFacade.addDataset(invalidID, datasets[validDataID],
                        InsightDatasetKind.Courses);
                } catch (err) {
                    response = err;
                } finally {
                    expect(response.code).to.equal(expectedCode);
                }
            });
        });

        describe("Shouldn't add an invalid dataset ", function () {
            const expectedCode: number = 400;
            let invalidDataID: string;
            let response: InsightResponse;

            it("Shouldn't accept null dataset", async () => {
                invalidDataID = "test1";
                try {
                    response = await insightFacade.addDataset(invalidDataID, null, InsightDatasetKind.Courses);
                } catch (err) {
                    response = err;
                } finally {
                    expect(response.code).to.equal(expectedCode);
                }
            });

            it("Shouldn't accept undefined dataset", async () => {
                invalidDataID = "test2";
                try {
                    response = await insightFacade.addDataset(invalidDataID, undefined, InsightDatasetKind.Courses);
                } catch (err) {
                    response = err;
                } finally {
                    expect(response.code).to.equal(expectedCode);
                }
            });

            it("Shouldn't accept a non-base64 dataset", async () => {
                invalidDataID = "simpleSentence";
                try {
                    response = await insightFacade.addDataset(invalidDataID,
                        "this is a string", InsightDatasetKind.Courses);
                } catch (err) {
                    response = err;
                } finally {
                    expect(response.code).to.equal(expectedCode);
                }
            });

            it("Shouldn't accept a non-serialized zip file dataset", async () => {
                invalidDataID = "courses7Z";
                try {
                    response = await insightFacade.addDataset(invalidDataID, datasets[invalidDataID],
                         InsightDatasetKind.Courses);
                } catch (err) {
                    response = err;
                } finally {
                    expect(response.code).to.equal(expectedCode);
                }
            });

            it("Shouldn't accept a dataset that doesn't have (/courses) folder", async () => {
                invalidDataID = "coursesWithoutFolder";
                try {
                    response = await insightFacade.addDataset(invalidDataID, datasets[invalidDataID],
                        InsightDatasetKind.Courses);
                } catch (err) {
                    response = err;
                } finally {
                    expect(response.code).to.equal(expectedCode);
                }
            });

            it("Shouldn't accept a dataset that doesn't have (/courses/*.csv) files", async () => {
                invalidDataID = "coursesWithoutCSVfiles";
                try {
                    response = await insightFacade.addDataset(invalidDataID, datasets[invalidDataID],
                        InsightDatasetKind.Courses);
                } catch (err) {
                    response = err;
                } finally {
                    expect(response.code).to.equal(expectedCode);
                }
            });

            it("Shouldn't accept a dataset that has empty csv files (no sections)", async () => {
                invalidDataID = "coursesWithoutSections";
                try {
                    response = await insightFacade.addDataset(invalidDataID, datasets[invalidDataID],
                        InsightDatasetKind.Courses);
                } catch (err) {
                    response = err;
                } finally {
                    expect(response.code).to.equal(expectedCode);
                }
            });

            it("Shouldn't accept a dataset that has csv files with no right headings", async () => {
                invalidDataID = "coursesWithoutRightHeadings";
                try {
                    response = await insightFacade.addDataset(invalidDataID, datasets[invalidDataID],
                        InsightDatasetKind.Courses);
                } catch (err) {
                    response = err;
                } finally {
                    expect(response.code).to.equal(expectedCode);
                }
            });

            it("Shouldn't accept a dataset that doesn't match the correct InsightDatasetKind", async () => {
                invalidDataID = "courses";
                try {
                    response = await insightFacade.addDataset("test3", datasets[invalidDataID],
                        InsightDatasetKind.Rooms);
                } catch (err) {
                    response = err;
                } finally {
                    expect(response.code).to.equal(expectedCode);
                }
            });
        });
    });

    describe("InsightFacade removeDataset", function () {
        it("Should remove the courses dataset", async () => {
            const id: string = "courses";
            const expectedCode: number = 204;
            let response: InsightResponse;

            try {
                response = await insightFacade.removeDataset(id);
            } catch (err) {
                response = err;
            } finally {
                expect(response.code).to.equal(expectedCode);
            }
        });

        it("Shouldn't remove a non-existed dataset", async () => {
            const id: string = "courses";
            const expectedCode: number = 404;
            let response: InsightResponse;

            try {
                response = await insightFacade.removeDataset(id);
            } catch (err) {
                response = err;
            } finally {
                expect(response.code).to.equal(expectedCode);
            }
        });

        describe("Shouldn't remove a dataset with an invalid id", function () {
            const expectedCode: number = 404;
            let id: string;
            let response: InsightResponse;

            it("Souldn't accept null id", async () => {
                try {
                    response = await insightFacade.removeDataset(null);
                } catch (err) {
                    response = err;
                } finally {
                    expect(response.code).to.equal(expectedCode);
                }
            });

            it("Shouldn't accept undefined id", async () => {
                try {
                    response = await insightFacade.removeDataset(undefined);
                } catch (err) {
                    response = err;
                } finally {
                    expect(response.code).to.equal(expectedCode);
                }
            });

            it("Shouldn't accept id that has space", async () => {
                id = "new courses";
                try {
                    response = await insightFacade.removeDataset(id);
                } catch (err) {
                    response = err;
                } finally {
                    expect(response.code).to.equal(expectedCode);
                }
            });

            it("Shouldn't accpet id that has underscore", async () => {
                id = "new_courses";
                try {
                    response = await insightFacade.removeDataset(id);
                } catch (err) {
                    response = err;
                } finally {
                    expect(response.code).to.equal(expectedCode);
                }
            });

            it("Shouldn't accept a non-existed id", async () => {
                id = "Courses";
                try {
                    response = await insightFacade.removeDataset(id);
                } catch (err) {
                    response = err;
                } finally {
                    expect(response.code).to.equal(expectedCode);
                }
            });
        });
    });
});

// This test suite dynamically generates tests from the JSON files in test/queries.
// You should not need to modify it; instead, add additional files to the queries directory.
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Create a new instance of InsightFacade, read in the test queries from test/queries and
    // add the datasets specified in datasetsToQuery.
    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = await TestUtil.readTestQueries();
            expect(testQueries).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${JSON.stringify(err)}`);
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Fail if there is a problem reading ANY dataset.
        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToQuery)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map((buf, i) => {
                return { [Object.keys(datasetsToQuery)[i]]: buf.toString("base64") };
            });
            expect(loadedDatasets).to.have.length.greaterThan(0);

            const responsePromises: Array<Promise<InsightResponse>> = [];
            const datasets: { [id: string]: string } = Object.assign({}, ...loadedDatasets);
            for (const [id, content] of Object.entries(datasets)) {
                responsePromises.push(insightFacade.addDataset(id, content, InsightDatasetKind.Courses));
            }

            // This try/catch is a hack to let your dynamic tests execute enough the addDataset method fails.
            // In D1, you should remove this try/catch to ensure your datasets load successfully before trying
            // to run you queries.
            try {
                const responses: InsightResponse[] = await Promise.all(responsePromises);
                responses.forEach((response) => expect(response.code).to.equal(204));
            } catch (err) {
                Log.warn(`Ignoring addDataset errors. For D1, you should allow errors to fail the Before All hook.`);
            }
        } catch (err) {
            expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // Dynamically create and run a test for each query in testQueries
    it("Should run test queries", () => {
        describe("Dynamic InsightFacade PerformQuery tests", () => {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, async () => {
                    let response: InsightResponse;

                    try {
                        response = await insightFacade.performQuery(test.query);
                    } catch (err) {
                        response = err;
                    } finally {
                        expect(response.code).to.equal(test.response.code);

                        if (test.response.code >= 400) {
                            expect(response.body).to.have.property("error");
                        } else {
                            expect(response.body).to.have.property("result");
                            const expectedResult = (test.response.body as InsightResponseSuccessBody).result;
                            const actualResult = (response.body as InsightResponseSuccessBody).result;
                            expect(actualResult).to.deep.equal(expectedResult);
                        }
                    }
                });
            }
        });
    });
});
