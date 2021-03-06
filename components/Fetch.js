var request = require('request');

const url = process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : window.location.origin;

function fetchResults(route, obj, timeout, callback, progressCallback) {
    let progress = 0;
    let interval = setInterval(() => {
        progress = progress + 100 / timeout;
        progressCallback(progress);
    }, 1000);
    request({
        url: url + '/' + route + '/'
        , method: "POST"
        , json: true
        , headers: {
            "content-type": "application/json"
        }
        , body: obj
    }, (err, res, body) => {
        clearInterval(interval);
        callback(body, err);
    });
}

function fetchContent(route, id, callback) {
    request.get(url + '/'+ route+'/' + id, (err, res, body) => {
        let result;
        if (body) {
            result = JSON.parse(body);
        }
        callback(result);
    });
}

export default {
    fetchResults: fetchResults,
    fetchContent: fetchContent
}