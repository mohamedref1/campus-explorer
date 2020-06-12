import Server from "../src/rest/Server";

import InsightFacade from "../src/controller/InsightFacade";
import chai = require("chai");
import fs   = require("fs");

import chaiHttp = require("chai-http");
import { expect } from "chai";
import Log from "../src/Util";
import { InsightDatasetKind } from "../src/controller/IInsightFacade";

describe("Facade Rest Server", function () {

    let server: Server        = null;
    const port: number        = 4321;
    const URL: string         = "http://localhost:4321";

    chai.use(chaiHttp);

    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        server = new Server(port);

        const expected: boolean = true;
        let actual: boolean;
        try {
            actual = await server.start();
        } catch (err) {
            actual = err;
        } finally {
            expect(actual).to.be.equal(expected);
        }
    });

    after(async function () {
        Log.test(`After: ${this.test.parent.title}`);

        const expected: boolean = true;
        let actual: boolean;
        try {
            actual = await server.stop();
        } catch (err) {
            actual = err;
        } finally {
            expect(actual).to.be.equal(expected);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    const courses = fs.readFileSync("./test/data/courses.zip");
    const rooms   = fs.readFileSync("./test/data/rooms.zip");
    const invalidCourses = fs.readFileSync("./test/data/courses.rar");

    it("PUT test for courses dataset", function () {
        try {
            return chai.request(URL)
                .put("/dataset/mycourses/courses")
                .attach("body", courses, "courses.zip")
                .then(function (res) {
                    // some logging here please!
                    Log.trace("PUT Executed");
                    Log.trace("Status Code: " + res.status);
                    expect(res.status).to.be.equal(204);
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.trace("PUT Error");
                    Log.trace("Status Code: " + err.status);
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("PUT Faild");
            expect.fail();
        }
    });

    it("PUT test for rooms dataset", function () {
        try {
            return chai.request(URL)
                .put("/dataset/myrooms/rooms")
                .attach("body", rooms, "rooms.zip")
                .then(function (res) {
                    // some logging here please!
                    Log.trace("PUT Executed");
                    Log.trace("Status Code: " + res.status);
                    expect(res.status).to.be.equal(204);
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.trace("PUT Error");
                    Log.trace("Status Code: " + err.status);
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("PUT Faild");
            expect.fail();
        }
    });

    it("PUT test for invalid courses dataset", function () {
        try {
            return chai.request(URL)
                .put("/dataset/myrarcourses/courses")
                .attach("body", invalidCourses, "courses.rar")
                .then(function (res) {
                    // some logging here please!
                    Log.trace("PUT Executed");
                    Log.trace("Status Code: " + res.status);
                    expect.fail();
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.trace("PUT Error");
                    Log.trace("Status Code: " + err.status);
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("PUT Faild");
            expect.fail();
        }
    });

    it("PUT test for rooms dataset", function () {
        try {
            return chai.request(URL)
                .put("/dataset/myrooms/rooms")
                .attach("body", rooms, "rooms.zip")
                .then(function (res) {
                    // some logging here please!
                    Log.trace("PUT Executed");
                    Log.trace("Status Code: " + res.status);
                    expect.fail();
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.trace("PUT Error");
                    Log.trace("Status Code: " + err.status);
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("PUT Faild");
            expect.fail();
        }
    });

    it("Get test for dataset list", function () {
        const expected: any = {result: [{id: "mycourses", kind: InsightDatasetKind.Courses, numRows: 49044},
                                        {id: "myrooms", kind: InsightDatasetKind.Rooms, numRows: 284}]};
        try {
            return chai.request(URL)
                .get("/dataset")
                .then(function (res) {
                    // some logging here please!
                    Log.trace("GET Executed");
                    Log.trace("Status Code: " + res.status);
                    expect(res.status).to.be.equal(200);
                    expect(res.body).to.deep.equal(expected);
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.trace("GET Error");
                    Log.trace("Status Code: " + err.status);
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("GET Faild");
            expect.fail();
        }
    });

    it("DEL test for courses dataset", function () {
        try {
            return chai.request(URL)
                .del("/dataset/mycourses")
                .then(function (res) {
                    // some logging here please!
                    Log.trace("DEL Executed");
                    Log.trace("Status Code: " + res.status);
                    expect(res.status).to.be.equal(204);
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.trace("DEL Error");
                    Log.trace("Status Code: " + err.status);
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("DEL Faild");
            expect.fail();
        }
    });

    it("DEL test for in correct courses id dataset", function () {
        try {
            return chai.request(URL)
                .del("/dataset/mycourses2")
                .then(function (res) {
                    // some logging here please!
                    Log.trace("DEL Executed");
                    Log.trace("Status Code: " + res.status);
                    expect.fail();
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.trace("DEL Error");
                    Log.trace("Status Code: " + err.status);
                    expect(err.status).to.be.equal(404);
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("DEL Faild");
            expect.fail();
        }
    });

    it("DEL test for courses dataset twice", function () {
        try {
            return chai.request(URL)
                .del("/dataset/mycourses")
                .then(function (res) {
                    // some logging here please!
                    Log.trace("DEL Executed");
                    Log.trace("Status Code: " + res.status);
                    expect.fail();
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.trace("DEL Error");
                    Log.trace("Status Code: " + err.status);
                    expect(err.status).to.be.equal(404);
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("DEL Faild");
            expect.fail();
        }
    });

    it("POST test for rooms dataset valid query", function () {
        const query  = "In rooms dataset myrooms, find entries whose Seats is greater than 350; show Name and Seats.";
        const result = [{rooms_name: "CIRS_1250", rooms_seats: 426},
                        {rooms_name: "HEBB_100", rooms_seats: 375},
                        {rooms_name: "WOOD_2", rooms_seats: 503}];

        try {
            return chai.request(URL)
                .post("/query")
                .send(query)
                .then(function (res) {
                    // some logging here please!
                    Log.trace("POST Executed");
                    Log.trace("Status Code: " + res.status);
                    expect(res.status).to.be.equal(200);
                    expect(res.body.result).to.deep.equal(result);
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.trace("POST Error");
                    Log.trace("Status Code: " + err.status);
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("POST Faild");
            expect.fail();
        }
    });

    it("POST test for rooms dataset invalid query", function () {
        const query  = "In rooms dataset rooms, find entries whose seats is greater than 350; show Name and Seats.";

        try {
            return chai.request(URL)
                .post("/query")
                .send(query)
                .then(function (res) {
                    // some logging here please!
                    Log.trace("POST Executed");
                    Log.trace("Status Code: " + res.status);
                    expect.fail();
                })
                .catch(function (err) {
                    // some logging here please!
                    Log.trace("POST Error");
                    Log.trace("Status Code: " + err.status);
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            // and some more logging here!
            Log.trace("POST Faild");
            expect.fail();
        }
    });

});
