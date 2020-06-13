/**
 * Receives a query string as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query string
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = function(query) {
    return new Promise((fulfill, reject) => {
        try {
            const http = new XMLHttpRequest();
            http.open("POST", "/query", true);
            http.onload = function() { fulfill(this.response); }
            http.send(query);
        } catch (err) {
            reject(err);
        }
    });
};
