import IParser, { IParserResponse} from "../IParser";
import Slicer from "../slicer/Slicer";
import KeyObjectifier from "../objectifier/KeyObjectifier";
import Filter from "../filter/Filter";

/**
 * This is our implementation of aggregate parser
 */

export default class AggregateParser implements IParser {
    private slicer: Slicer;
    private filter: Filter;
    private keyObjectifier: KeyObjectifier;

    constructor() {
        this.slicer = new Slicer();
        this.filter = new Filter();
        this.keyObjectifier = new KeyObjectifier();
    }

    public async performParse(query: string): Promise<IParserResponse> {
        return Promise.reject({code: -1, body: null});
    }
}
