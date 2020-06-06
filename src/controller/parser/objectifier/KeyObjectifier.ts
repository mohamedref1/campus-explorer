import { MKey, SKey } from "./../IParser";

export default class KeyObjectifier {
    public convertToObject(key: string): Promise<MKey | SKey> {
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
}
