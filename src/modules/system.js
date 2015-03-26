/*
 * CommonJS System/1.0
 * Spec: http://wiki.commonjs.org/wiki/System/1.0
 */

exports.platform = 'phantomjs';

Object.defineProperty(exports, 'stdout', {
    enumerable: true,
    writeable: false,
    get: function() {
        return exports.standardout;
    }
});

Object.defineProperty(exports, 'stdin', {
    enumerable: true,
    writeable: false,
    get: function() {
        return exports.standardin;
    }
});

Object.defineProperty(exports, 'stderr', {
    enumerable: true,
    writeable: false,
    get: function() {
        return exports.standarderr;
    }
});

/***** < ivan *****/
var __arguments;
exports.arg = (function _loadargs() {
    if (__arguments === undefined) {
        __arguments = {};
        exports.args.forEach(function (arg, index) {
            if (index > 0) {
                var s = arg.split('=');
                var n = /[^-].*/.exec(s[0]),
                    v = (s.length > 1) ? s[1] : true;
                __arguments[n] = v;   
            }
        });
    }
    return __arguments;
})();

exports.argDefaults = function(defaults) {
    for (var name in defaults) {
        if (__arguments[name] === undefined) {
            __arguments[name] = defaults[name];
        }
    }
};
/***** ivan > *****/