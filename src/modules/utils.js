/***** < ivan *****/
exports.hash = (function () {
    //  SHA-1 implementation in JavaScript | (c) Chris Veness 2002-2010 | www.movable-type.co.uk
    function f(s, x, y, z) {
        switch (s) {
            case 0: return (x & y) ^ (~x & z);
            case 1: return x ^ y ^ z;
            case 2: return (x & y) ^ (x & z) ^ (y & z);
            case 3: return x ^ y ^ z;
        }
    }
    function ROTL(x, n) {
        return (x << n) | (x >>> (32 - n));
    }
    function toHexStr(n) {
        var s = "", v;
        for (var i = 7; i >= 0; i--) { v = (n >>> (i * 4)) & 0xf; s += v.toString(16); }
        return s;
    }
    function encodeUtf8(strUni) {
        var strUtf = strUni.replace(
            function (c) {
                var cc = c.charCodeAt(0);
                return String.fromCharCode(0xc0 | cc >> 6, 0x80 | cc & 0x3f);
            }
        );
        strUtf = strUtf.replace(
            function (c) {
                var cc = c.charCodeAt(0);
                return String.fromCharCode(0xe0 | cc >> 12, 0x80 | cc >> 6 & 0x3F, 0x80 | cc & 0x3f);
            }
        );
        return strUtf;
    }
    function decodeUtf8(strUtf) {
        var strUni = strUtf.replace(
            function (c) {
                var cc = ((c.charCodeAt(0) & 0x0f) << 12) | ((c.charCodeAt(1) & 0x3f) << 6) | (c.charCodeAt(2) & 0x3f);
                return String.fromCharCode(cc);
            }
        );
        strUni = strUni.replace(
            function (c) {
                var cc = (c.charCodeAt(0) & 0x1f) << 6 | c.charCodeAt(1) & 0x3f;
                return String.fromCharCode(cc);
            }
        );
        return strUni;
    }
    return function (msg, utf8encode) {
        utf8encode = (typeof utf8encode == 'undefined') ? true : utf8encode;
        if (utf8encode) msg = encodeUtf8(msg);
        var K = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
        msg += String.fromCharCode(0x80);  // add trailing '1' bit (+ 0's padding) to string [§5.1.1]
        var l = msg.length / 4 + 2;  // length (in 32-bit integers) of msg + ‘1’ + appended length
        var N = Math.ceil(l / 16);   // number of 16-integer-blocks required to hold 'l' ints
        var M = new Array(N);
        for (var i = 0; i < N; i++) {
            M[i] = new Array(16);
            for (var j = 0; j < 16; j++) {  // encode 4 chars per integer, big-endian encoding
                M[i][j] = (msg.charCodeAt(i * 64 + j * 4) << 24) | (msg.charCodeAt(i * 64 + j * 4 + 1) << 16) |
                    (msg.charCodeAt(i * 64 + j * 4 + 2) << 8) | (msg.charCodeAt(i * 64 + j * 4 + 3));
            }
        }
        M[N - 1][14] = ((msg.length - 1) * 8) / Math.pow(2, 32); M[N - 1][14] = Math.floor(M[N - 1][14])
        M[N - 1][15] = ((msg.length - 1) * 8) & 0xffffffff;
        var H0 = 0x67452301;
        var H1 = 0xefcdab89;
        var H2 = 0x98badcfe;
        var H3 = 0x10325476;
        var H4 = 0xc3d2e1f0;
        var W = new Array(80); var a, b, c, d, e;
        for (var i = 0; i < N; i++) {
            for (var t = 0; t < 16; t++) W[t] = M[i][t];
            for (var t = 16; t < 80; t++) W[t] = ROTL(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
            a = H0; b = H1; c = H2; d = H3; e = H4;
            for (var t = 0; t < 80; t++) {
                var s = Math.floor(t / 20);
                var T = (ROTL(a, 5) + f(s, b, c, d) + e + K[s] + W[t]) & 0xffffffff;
                e = d;
                d = c;
                c = ROTL(b, 30);
                b = a;
                a = T;
            }
            H0 = (H0 + a) & 0xffffffff;
            H1 = (H1 + b) & 0xffffffff;
            H2 = (H2 + c) & 0xffffffff;
            H3 = (H3 + d) & 0xffffffff;
            H4 = (H4 + e) & 0xffffffff;
        }
        return toHexStr(H0) + toHexStr(H1) +
            toHexStr(H2) + toHexStr(H3) + toHexStr(H4);
    }
})();

exports.project = function (source, projection) {
    var destination = {};
    for (var n in projection) {
        var value = "";
        if (source[n] || typeof projection[n] === 'function') {
            if (projection[n] === 1) {
                value = source[n];
            }
            else if (typeof projection[n] === 'function') {
                value = projection[n].call(source);
            }
            else if (typeof projection[n] === 'string') {
                value = source[n];
                n = projection[n];
            }
        }
        if (projection[n] !== 0) {
            destination[n] = value;
        }
    }
    return destination;
};

exports.log = function(x, projection) {
    if (x == null && x == undefined) {
        return;
    }
    else if (typeof(x) === 'object') {
        if (!projection || typeof(projection) !== 'object') {
            console.log(JSON.stringify(x, null, 2));
        }
        else {
            console.log(JSON.stringify(this.project(x, projection), null, 2));
        }
    }
    else {
        console.log(x);
    }
};

var sys = require('system');

exports.debug = function() {
    if (sys.arg.debug && arguments.length > 0) {
        var args = [];
        args.push(arguments[0]); // x
        var debugLvl;
        if (arguments.length >= 3) {
            args.push(arguments[1]); // projection
            debugLvl = arguments[2];
        } else if (arguments.length == 2) {
            if (typeof(arguments[1]) == 'object') {
                args.push(arguments[1]); // projection
            }
            else {
                debugLvl = arguments[1];
            }
        }
        if (sys.arg.debug === true || !debugLvl || sys.arg.debug == debugLvl) {
            this.log.apply(this, args);    
        }
    }
};


function strNowDateTime(time) {
    function padnum(num, len, pad) {
        pad = pad || 0;
        num = num.toString();
        while (num.length < len) {
            num = pad + num;
        }
        return num;
    }
    var date = new Date();
    var sdate = date.getFullYear() + '-' + padnum(date.getMonth() + 1, 2) + '-' + padnum(date.getDate(), 2);
    if (time == undefined || time) {
        sdate += ' ' + padnum(date.getHours(), 2) + ':' + padnum(date.getMinutes(), 2) + ':' + padnum(date.getSeconds(), 2);
    }
    return sdate;
};

Object.defineProperty(exports, "now", {
    get: function() {
        return strNowDateTime();
    }
});

Object.defineProperty(exports, "today", {
    get: function() {
        return strNowDateTime(false);
    }
});
/***** ivan > *****/