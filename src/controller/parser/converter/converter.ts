import { MKey, SKey, SOperator, MOperator, Aggregator } from "../IParser";

export default class Converter {
    public convertToKey(key: string): Promise<MKey | SKey> {
        return new Promise((fulfill, reject) => {
            this.convertToMKey(key).
            then((mkey) => fulfill(mkey)).
            catch(() => {
                this.convertToSKey(key).
                then((skey) => fulfill(skey)).
                catch((err) => reject(err));
            });

        });
    }

    public convertToMKey(key: string): Promise<MKey> {
        switch (key) {
            case MKey.Audit:
                return Promise.resolve(MKey.Audit);
            case MKey.Average:
                return Promise.resolve(MKey.Average);
            case MKey.Fail:
                return Promise.resolve(MKey.Fail);
            case MKey.Pass:
                return Promise.resolve(MKey.Pass);
            case MKey.Year:
                return Promise.resolve(MKey.Year);
            case MKey.Seats:
                return Promise.resolve(MKey.Seats);
            case MKey.Latitude:
                return Promise.resolve(MKey.Latitude);
            case MKey.Longitude:
                return Promise.resolve(MKey.Longitude);
            case SKey.Department:
            default:
                return Promise.reject({
                    code: 400,
                    body: {
                        error: "invalid key: " + key,
                    },
                });
        }
    }

    public convertToSKey(key: string): Promise<SKey> {
        switch (key) {
            case SKey.Department:
                return Promise.resolve(SKey.Department);
            case SKey.ID:
                return Promise.resolve(SKey.ID);
            case SKey.Instructor:
                return Promise.resolve(SKey.Instructor);
            case SKey.Title:
                return Promise.resolve(SKey.Title);
            case SKey.UUID:
                return Promise.resolve(SKey.UUID);
            case SKey.FullName:
                return Promise.resolve(SKey.FullName);
            case SKey.ShortName:
                return Promise.resolve(SKey.ShortName);
            case SKey.Number:
                return Promise.resolve(SKey.Number);
            case SKey.Name:
                return Promise.resolve(SKey.Name);
            case SKey.Address:
                return Promise.resolve(SKey.Address);
            case SKey.Furniture:
                return Promise.resolve(SKey.Furniture);
            case SKey.Type:
                return Promise.resolve(SKey.Type);
            case SKey.Link:
                return Promise.resolve(SKey.Link);
            default:
                return Promise.reject({
                    code: 400,
                    body: {
                        error: "invalid key: " + key,
                    },
                });
        }
    }

    public convertToProperty(key: string): Promise<string> {
        return new Promise((fulfill, reject) => {
            this.convertToCoursesProperty(key).
            then((mkey) => fulfill(mkey)).
            catch(() => {
                this.convertToRoomsProperty(key).
                then((skey) => fulfill(skey)).
                catch((err) => reject(err));
            });

        });
    }

    public convertToCoursesProperty(key: string): Promise<string> {
        const strKeys: string[] = [];

        switch (key) {
            case MKey.Audit:
                return Promise.resolve("courses_audit");
            case MKey.Average:
                return Promise.resolve("courses_avg");
            case MKey.Fail:
                return Promise.resolve("courses_fail");
            case MKey.Pass:
                return Promise.resolve("courses_pass");
            case MKey.Year:
                return Promise.resolve("courses_year");
            case SKey.Department:
                return Promise.resolve("courses_dept");
            case SKey.ID:
                return Promise.resolve("courses_id");
            case SKey.UUID:
                return Promise.resolve("courses_uuid");
            case SKey.Instructor:
                return Promise.resolve("courses_instructor");
            case SKey.Title:
                return Promise.resolve("courses_title");
            default:
                return Promise.reject({
                    code: 400,
                    body: {
                        error: "the given display \"" + key + "\" key is invalid",
                    },
                });
        }
    }

    public convertToRoomsProperty(key: string): Promise<string> {
        const strKeys: string[] = [];

        switch (key) {
            case MKey.Seats:
                return Promise.resolve("rooms_seats");
            case MKey.Latitude:
                return Promise.resolve("rooms_lat");
            case MKey.Longitude:
                return Promise.resolve("rooms_lon");
            case SKey.FullName:
                return Promise.resolve("rooms_fullname");
            case SKey.ShortName:
                return Promise.resolve("rooms_shortname");
            case SKey.Number:
                return Promise.resolve("rooms_number");
            case SKey.Name:
                return Promise.resolve("rooms_name");
            case SKey.Address:
                return Promise.resolve("rooms_address");
            case SKey.Type:
                return Promise.resolve("rooms_type");
            case SKey.Furniture:
                return Promise.resolve("rooms_furniture");
            case SKey.Link:
                return Promise.resolve("rooms_href");
            default:
                return Promise.reject({
                    code: 400,
                    body: {
                        error: "the given display \"" + key + "\" key is invalid",
                    },
                });
        }
    }

    public convertToOperator(operator: string): Promise<MOperator | SOperator> {
        return new Promise((fulfill, reject) => {
            this.convertToMOperator(operator).
            then((mkey) => fulfill(mkey)).
            catch(() => {
                this.convertToMOperator(operator).
                then((skey) => fulfill(skey)).
                catch((err) => reject(err));
            });

        });
    }

    public convertToMOperator(operator: string): Promise<MOperator> {
        switch (operator) {
            case MOperator.Equal:
                return Promise.resolve(MOperator.Equal);
            case MOperator.Greater:
                return Promise.resolve(MOperator.Greater);
            case MOperator.Less:
                return Promise.resolve(MOperator.Less);
            case MOperator.notEqual:
                return Promise.resolve(MOperator.notEqual);
            case MOperator.notGreater:
                return Promise.resolve(MOperator.notGreater);
            case MOperator.notLess:
                return Promise.resolve(MOperator.notLess);
            default:
                return Promise.reject({
                    code: 400,
                    body: {
                        error: "invalid mathematical operator: " + operator,
                    },
                });
        }
    }

    public convertToSOperator(operator: string): Promise<SOperator> {
        switch (operator) {
            case SOperator.Is:
                return Promise.resolve(SOperator.Is);
            case SOperator.Includes:
                return Promise.resolve(SOperator.Includes);
            case SOperator.Begins:
                return Promise.resolve(SOperator.Begins);
            case SOperator.Ends:
                return Promise.resolve(SOperator.Ends);
            case SOperator.isNot:
                return Promise.resolve(SOperator.isNot);
            case SOperator.notInclude:
                return Promise.resolve(SOperator.notInclude);
            case SOperator.notBegin:
                return Promise.resolve(SOperator.notBegin);
            case SOperator.notEnd:
                return Promise.resolve(SOperator.notEnd);
            default:
                return Promise.reject({
                    code: 400,
                    body: {
                        error: "invalid string operator: " + operator,
                    },
                });
        }
    }

    public convertToAggregator(aggregate: string): Promise<Aggregator> {
        switch (aggregate) {
            case Aggregator.MIN:
                return Promise.resolve(Aggregator.MIN);
            case Aggregator.MAX:
                return Promise.resolve(Aggregator.MAX);
            case Aggregator.AVG:
                return Promise.resolve(Aggregator.AVG);
            case Aggregator.SUM:
                return Promise.resolve(Aggregator.SUM);
            case Aggregator.COUNT:
                return Promise.resolve(Aggregator.COUNT);
            default:
                return Promise.reject({
                    code: 400,
                    body: {
                        error: aggregate + " is an invalid aggregator",
                    },
                });
        }
    }
}
