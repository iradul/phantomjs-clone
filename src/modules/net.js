/***** < ivan *****/
Object.defineProperty(exports, 'handleRedirections', {
    value: false,
    writable: true,
    enumerable: true,
    configurable: false
});

Object.defineProperty(exports, 'maxRedirections', {
    value: 10,
    writable: true,
    enumerable: true,
    configurable: false
});

exports.upload = function (url, file, mime, headers, method) {
    var postObj = {
        headers: headers || '',
        upload: { 
            file: file,
            mime: mime
        }
    };
    method = (method || 'POST').toUpperCase();
    return this._fetchUrl(url, method, postObj);
};

exports.download = function (url, file, headers, method) {
    var postObj = {
        headers: headers || '',
        download: { 
            file: file
        }
    };
    method = (method || 'GET').toUpperCase();
    return this._fetchUrl(url, method, postObj);
};

exports.fetch = function (url, method, data, headers, encode, fileEncoding) {
    if (arguments.length == 1 && typeof(arguments[0]) == 'object') {
        // make a copy of object, because later url & mode will be deleted
        var config = {};
        for (var p in arguments[0]) {
            config[p] = arguments[0][p];
        }
        method = (config.method || 'GET').toUpperCase();
        url = config.url;
        delete config.url;
        delete config.method;
        return this._fetchUrl(url, method, config);
    }
    var postObj = {};
    encode = (encode === undefined || encode) ? true : false;
    if (typeof method !== "string" || ["GET", "POST", "PUT", "DELETE", "HEAD"].indexOf(method.toUpperCase()) === -1) {
        method = "GET";
    } else {
        method = method.toUpperCase();
    }
    var dataString = "";
    if (typeof data === "object") {
        var dataList = [];
        for (var k in data) {
            var dataValues = (Array.isArray(data[k])) ? data[k] : [data[k]];
            dataValues.forEach(function(value) { // we need to handle "multiple select" case
                if (encode) {
                    dataList.push(encodeURIComponent(k) + "=" + encodeURIComponent(value.toString()));
                }
                else {
                    dataList.push(k + "=" + value.toString());
                }
            });
        }
        dataString = dataList.join('&');
    } else if (typeof data === "string") {
        if (encode) {
            dataString = encodeURIComponent(data);
        }
        else {
            dataString = data;
        }
    }

    if (headers) {
        postObj.headers = headers;
    }

    if (method === "POST" || method === "PUT") {
        postObj.encoding = 'utf-8';
        postObj.data = dataString;
    }
    else if (dataString !== "") {
        if (url.indexOf('?') === -1)
            url += '?' + dataString;
        else
            url += '&' + dataString;
    }
    if (fileEncoding) {
        postObj.fileEncoding = fileEncoding;
    }
    var html = this._fetchUrl(url, method, postObj);
    if (this.handleRedirections) {
        var redirections = [],
            counter = (this.maxRedirections > 0) ? this.maxRedirections : 99999,
            size = this.fetchResult.size,
            originalUrl = this.fetchResult.url;
        while (counter-- > 0) {
            if ([301,302,303,307].indexOf(this.fetchResult.status) != -1) {
                redirections.push(this.fetchResult.actualUrl);
                html = this._fetchUrl(this.fetchResult.actualUrl, method, postObj);
                size += this.fetchResult.size;
            } else {
                break;
            }
        }
        var result = this.fetchResult;
        result.redirections = redirections;
        result.size = size;
        result.url = originalUrl;
        this._setFetchResult(result);
    }
    return html;
};
/***** ivan > *****/