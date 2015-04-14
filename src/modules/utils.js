/***** < ivan *****/

// MD5 implementation in JavaScript | http://www.myersdaily.org/joseph/javascript/md5.js
var md5 = (function() {function md5cycle(f,d){var b=f[0],a=f[1],c=f[2],e=f[3],b=ff(b,a,c,e,d[0],7,-680876936),e=ff(e,b,a,c,d[1],12,-389564586),c=ff(c,e,b,a,d[2],17,606105819),a=ff(a,c,e,b,d[3],22,-1044525330),b=ff(b,a,c,e,d[4],7,-176418897),e=ff(e,b,a,c,d[5],12,1200080426),c=ff(c,e,b,a,d[6],17,-1473231341),a=ff(a,c,e,b,d[7],22,-45705983),b=ff(b,a,c,e,d[8],7,1770035416),e=ff(e,b,a,c,d[9],12,-1958414417),c=ff(c,e,b,a,d[10],17,-42063),a=ff(a,c,e,b,d[11],22,-1990404162),b=ff(b,a,c,e,d[12],7,1804603682),e=ff(e,b,a,c,d[13],12,
-40341101),c=ff(c,e,b,a,d[14],17,-1502002290),a=ff(a,c,e,b,d[15],22,1236535329),b=gg(b,a,c,e,d[1],5,-165796510),e=gg(e,b,a,c,d[6],9,-1069501632),c=gg(c,e,b,a,d[11],14,643717713),a=gg(a,c,e,b,d[0],20,-373897302),b=gg(b,a,c,e,d[5],5,-701558691),e=gg(e,b,a,c,d[10],9,38016083),c=gg(c,e,b,a,d[15],14,-660478335),a=gg(a,c,e,b,d[4],20,-405537848),b=gg(b,a,c,e,d[9],5,568446438),e=gg(e,b,a,c,d[14],9,-1019803690),c=gg(c,e,b,a,d[3],14,-187363961),a=gg(a,c,e,b,d[8],20,1163531501),b=gg(b,a,c,e,d[13],5,-1444681467),
e=gg(e,b,a,c,d[2],9,-51403784),c=gg(c,e,b,a,d[7],14,1735328473),a=gg(a,c,e,b,d[12],20,-1926607734),b=hh(b,a,c,e,d[5],4,-378558),e=hh(e,b,a,c,d[8],11,-2022574463),c=hh(c,e,b,a,d[11],16,1839030562),a=hh(a,c,e,b,d[14],23,-35309556),b=hh(b,a,c,e,d[1],4,-1530992060),e=hh(e,b,a,c,d[4],11,1272893353),c=hh(c,e,b,a,d[7],16,-155497632),a=hh(a,c,e,b,d[10],23,-1094730640),b=hh(b,a,c,e,d[13],4,681279174),e=hh(e,b,a,c,d[0],11,-358537222),c=hh(c,e,b,a,d[3],16,-722521979),a=hh(a,c,e,b,d[6],23,76029189),b=hh(b,a,
c,e,d[9],4,-640364487),e=hh(e,b,a,c,d[12],11,-421815835),c=hh(c,e,b,a,d[15],16,530742520),a=hh(a,c,e,b,d[2],23,-995338651),b=ii(b,a,c,e,d[0],6,-198630844),e=ii(e,b,a,c,d[7],10,1126891415),c=ii(c,e,b,a,d[14],15,-1416354905),a=ii(a,c,e,b,d[5],21,-57434055),b=ii(b,a,c,e,d[12],6,1700485571),e=ii(e,b,a,c,d[3],10,-1894986606),c=ii(c,e,b,a,d[10],15,-1051523),a=ii(a,c,e,b,d[1],21,-2054922799),b=ii(b,a,c,e,d[8],6,1873313359),e=ii(e,b,a,c,d[15],10,-30611744),c=ii(c,e,b,a,d[6],15,-1560198380),a=ii(a,c,e,b,d[13],
21,1309151649),b=ii(b,a,c,e,d[4],6,-145523070),e=ii(e,b,a,c,d[11],10,-1120210379),c=ii(c,e,b,a,d[2],15,718787259),a=ii(a,c,e,b,d[9],21,-343485551);f[0]=add32(b,f[0]);f[1]=add32(a,f[1]);f[2]=add32(c,f[2]);f[3]=add32(e,f[3])}function cmn(f,d,b,a,c,e){d=add32(add32(d,f),add32(a,e));return add32(d<<c|d>>>32-c,b)}function ff(f,d,b,a,c,e,g){return cmn(d&b|~d&a,f,d,c,e,g)}function gg(f,d,b,a,c,e,g){return cmn(d&a|b&~a,f,d,c,e,g)}function hh(f,d,b,a,c,e,g){return cmn(d^b^a,f,d,c,e,g)}
function ii(f,d,b,a,c,e,g){return cmn(b^(d|~a),f,d,c,e,g)}function md51(f){txt="";var d=f.length,b=[1732584193,-271733879,-1732584194,271733878],a;for(a=64;a<=f.length;a+=64)md5cycle(b,md5blk(f.substring(a-64,a)));f=f.substring(a-64);var c=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];for(a=0;a<f.length;a++)c[a>>2]|=f.charCodeAt(a)<<(a%4<<3);c[a>>2]|=128<<(a%4<<3);if(55<a)for(md5cycle(b,c),a=0;16>a;a++)c[a]=0;c[14]=8*d;md5cycle(b,c);return b}
function md5blk(f){var d=[],b;for(b=0;64>b;b+=4)d[b>>2]=f.charCodeAt(b)+(f.charCodeAt(b+1)<<8)+(f.charCodeAt(b+2)<<16)+(f.charCodeAt(b+3)<<24);return d}var hex_chr="0123456789abcdef".split("");function rhex(f){for(var d="",b=0;4>b;b++)d+=hex_chr[f>>8*b+4&15]+hex_chr[f>>8*b&15];return d}function hex(f){for(var d=0;d<f.length;d++)f[d]=rhex(f[d]);return f.join("")}function add32(f,d){return f+d&4294967295}function md5(f){return hex(md51(f))};return md5;})();

//  SHA-1 implementation in JavaScript | (c) Chris Veness 2002-2010 | www.movable-type.co.uk
var sha1 = (function(){function l(a){for(var p="",l,e=7;0<=e;e--)l=a>>>4*e&15,p+=l.toString(16);return p}function z(a){a=a.replace(function(a){a=a.charCodeAt(0);return String.fromCharCode(192|a>>6,128|a&63)});return a=a.replace(function(a){a=a.charCodeAt(0);return String.fromCharCode(224|a>>12,128|a>>6&63,128|a&63)})}return function(a,p){("undefined"==typeof p||p)&&(a=z(a));var y=[1518500249,1859775393,2400959708,3395469782];a+=String.fromCharCode(128);for(var e=Math.ceil((a.length/4+2)/16),m=Array(e),c=0;c< e;c++){m[c]=Array(16);for(var d=0;16>d;d++)m[c][d]=a.charCodeAt(64*c+4*d)<<24|a.charCodeAt(64*c+4*d+1)<<16|a.charCodeAt(64*c+4*d+2)<<8|a.charCodeAt(64*c+4*d+3)}m[e-1][14]=8*(a.length-1)/Math.pow(2,32);m[e-1][14]=Math.floor(m[e-1][14]);m[e-1][15]=8*(a.length-1)&4294967295;for(var d=1732584193,r=4023233417,t=2562383102,u=271733878,v=3285377520,n=Array(80),g,f,h,k,w,c=0;c<e;c++){for(var b=0;16>b;b++)n[b]=m[c][b];for(b=16;80>b;b++)g=n[b-3]^n[b-8]^n[b-14]^n[b-16],n[b]=g<<1|g>>>31;g=d;f=r;h=t;k=u;w=v;for(b= 0;80>b;b++){var x=Math.floor(b/20),A=g<<5|g>>>27,q;a:{switch(x){case 0:q=f&h^~f&k;break a;case 1:q=f^h^k;break a;case 2:q=f&h^f&k^h&k;break a;case 3:q=f^h^k;break a}q=void 0}x=A+q+w+y[x]+n[b]&4294967295;w=k;k=h;h=f<<30|f>>>2;f=g;g=x}d=d+g&4294967295;r=r+f&4294967295;t=t+h&4294967295;u=u+k&4294967295;v=v+w&4294967295}return l(d)+l(r)+l(t)+l(u)+l(v)}})();

exports.hash = function(text, method) {
    method = method || 'sha1';
    switch (method.toLowerCase()) {
        case 'md5':
        case 'MD5':
            return md5(text);
        default:
            return sha1(text);
    }
};

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

exports.str = function(x, projection) {
    if (x === null && x === undefined) {
        return null;
    }
    else if (typeof(x) === 'object') {
        if (!projection || typeof(projection) !== 'object') {
            return JSON.stringify(x, null, 2);
        }
        else {
            return JSON.stringify(this.project(x, projection), null, 2);
        }
    }
    else {
        return x + "";
    }
};

exports.log = function(x, projection) {
    var s = this.str(x, projection);
    if (s !== null) console.log(s);
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

exports.toStringDate = function (date, time) {
    function padnum(num, len, pad) {
        pad = pad || 0;
        num = num.toString();
        while (num.length < len) {
            num = pad + num;
        }
        return num;
    }
    var sdate = date.getFullYear() + '-' + padnum(date.getMonth() + 1, 2) + '-' + padnum(date.getDate(), 2);
    if (time === undefined || time) {
        sdate += ' ' + padnum(date.getHours(), 2) + ':' + padnum(date.getMinutes(), 2) + ':' + padnum(date.getSeconds(), 2);
    }
    return sdate;
};

Object.defineProperty(exports, "now", {
    get: function() {
        return this.toStringDate(new Date());
    }
});

Object.defineProperty(exports, "today", {
    get: function() {
        return this.toStringDate(new Date(), false);
    }
});
/***** ivan > *****/