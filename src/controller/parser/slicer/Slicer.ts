
export default class Slicer {

    public simpleQuerySlice(query: string): Promise<string[][]> {
        let dataset: string[];
        let filter: string[];
        let display: string[];
        let sort: string[];

        try { // Slice depending on "In", "find", "show", "sort" at the beginning
              // and ";", ",", "." at the end
            dataset = query.split("; ")[0].split(", find")[0].split(" ");
            filter  = this.spaceAndQuotesSlicer(query.split("; ")[0].replace(", ", "$SEP@").split("$SEP@")[1]
                                            .split(", ").join("COMMA&SPACE")
                                            .split("Full Name").join("FullName")
                                            .split("Short Name").join("ShortName"));

            display = query.split("; ")[1].replace("show ", "show, ")
                           .split("Full Name").join("FullName")
                           .split("Short Name").join("ShortName")
                           .split(" and").join(",").split(", ");

            if (query.split("; ")[2]) { // If sort part exists
                sort = query.split("; ")[2].replace(" by ", " by,").split(",");

                if (!sort.length || !sort[0].startsWith("sort")) { throw new Error(); }
                const lastSortElement: string = sort.pop();
                if (lastSortElement.slice(-1) !== ".") { throw new Error(); }
                sort.push(lastSortElement.slice(0, -1));

            } else {
                const lastDisplayElement: string = display.pop();
                if (lastDisplayElement.slice(-1) !== ".") { throw new Error(); }
                display.push(lastDisplayElement.slice(0, -1));
            }

            if (dataset === undefined || display === undefined || filter === undefined ||
                dataset[0] !== "In"   || display[0] !== "show" || filter[0] !== "find") { throw new Error(); }

        } catch (err) {
            return Promise.reject({
                code: 400,
                body: {
                    error: "invalid syntax: slice",
                },
            });
        }

        return Promise.resolve([dataset, filter, display, sort]);
    }

    public spaceAndQuotesSlicer(filter: string): string[] {
        // The parenthesis in the regex creates a captured group within the quotes
        const myRegexp = /[^\s"]+|"([^"]*)"/gi;
        const myString  = filter;
        const myArray = [];
        let match: RegExpExecArray;
        do {
            // Each call to exec returns the next regex match as an array
            match = myRegexp.exec(myString);
            if (match != null) {
                // Index 1 in the array is the captured group if it exists
                // Index 0 is the matched text, which we use if no captured group exists
                myArray.push(match[1] ?  "\"" + match[1] + "\"" : match[0]);
            }
        } while (match != null);

        return myArray;
    }
}
