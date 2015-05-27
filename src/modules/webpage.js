/*jslint sloppy: true, nomen: true */
/*global exports:true,phantom:true */

/*
  This file is part of the PhantomJS project from Ofi Labs.

  Copyright (C) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>
  Copyright (C) 2011 Ivan De Marino <ivan.de.marino@gmail.com>
  Copyright (C) 2011 James Roe <roejames12@hotmail.com>
  Copyright (C) 2011 execjosh, http://execjosh.blogspot.com
  Copyright (C) 2012 James M. Greene <james.m.greene@gmail.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the <organization> nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

function checkType(o, type) {
    return typeof o === type;
}

function isObject(o) {
    return checkType(o, 'object');
}

function isUndefined(o) {
    return checkType(o, 'undefined');
}

function isUndefinedOrNull(o) {
    return isUndefined(o) || null === o;
}

function copyInto(target, source) {
    if (target === source || isUndefinedOrNull(source)) {
        return target;
    }

    target = target || {};

    // Copy into objects only
    if (isObject(target)) {
        // Make sure source exists
        source = source || {};

        if (isObject(source)) {
            var i, newTarget, newSource;
            for (i in source) {
                if (source.hasOwnProperty(i)) {
                    newTarget = target[i];
                    newSource = source[i];

                    if (newTarget && isObject(newSource)) {
                        // Deep copy
                        newTarget = copyInto(target[i], newSource);
                    } else {
                        newTarget = newSource;
                    }

                    if (!isUndefined(newTarget)) {
                        target[i] = newTarget;
                    }
                }
            }
        } else {
            target = source;
        }
    }

    return target;
}

function definePageSignalHandler(page, handlers, handlerName, signalName) {
    Object.defineProperty(page, handlerName, {
        set: function (f) {
            // Disconnect previous handler (if any)
            if (!!handlers[handlerName] && typeof handlers[handlerName].callback === "function") {
                try {
                    this[signalName].disconnect(handlers[handlerName].callback);
                } catch (e) {}
            }

            // Delete the previous handler
            delete handlers[handlerName];

            // Connect the new handler iff it's a function
            if (typeof f === "function") {
                // Store the new handler for reference
                handlers[handlerName] = {
                    callback: f
                };
                this[signalName].connect(f);
            }
        },
        get: function() {
            return !!handlers[handlerName] && typeof handlers[handlerName].callback === "function" ?
                handlers[handlerName].callback :
                undefined;
        }
    });
}

function definePageCallbackHandler(page, handlers, handlerName, callbackConstructor) {
    Object.defineProperty(page, handlerName, {
        set: function(f) {
            // Fetch the right callback object
            var callbackObj = page[callbackConstructor]();

            // Disconnect previous handler (if any)
            var handlerObj = handlers[handlerName];
            if (!!handlerObj && typeof handlerObj.callback === "function" && typeof handlerObj.connector === "function") {
                try {
                    callbackObj.called.disconnect(handlerObj.connector);
                } catch (e) {
                    console.log(e);
                }
            }

            // Delete the previous handler
            delete handlers[handlerName];

            // Connect the new handler iff it's a function
            if (typeof f === "function") {
                var connector = function() {
                    // Callback will receive a "deserialized", normal "arguments" array
                    callbackObj.returnValue = f.apply(this, arguments[0]);
                };

                // Store the new handler for reference
                handlers[handlerName] = {
                    callback: f,
                    connector: connector
                };

                // Connect a new handler
                callbackObj.called.connect(connector);
            }
        },
        get: function() {
            var handlerObj = handlers[handlerName];
            return (!!handlerObj && typeof handlerObj.callback === "function" && typeof handlerObj.connector === "function") ?
                handlers[handlerName].callback :
                undefined;
        }
    });
}

// Inspired by Douglas Crockford's remedies: proper String quoting.
// @see http://javascript.crockford.com/remedial.html
function quoteString(str) {
    var c, i, l = str.length, o = '"';
    for (i = 0; i < l; i += 1) {
        c = str.charAt(i);
        if (c >= ' ') {
            if (c === '\\' || c === '"') {
                o += '\\';
            }
            o += c;
        } else {
            switch (c) {
            case '\b':
                o += '\\b';
                break;
            case '\f':
                o += '\\f';
                break;
            case '\n':
                o += '\\n';
                break;
            case '\r':
                o += '\\r';
                break;
            case '\t':
                o += '\\t';
                break;
            default:
                c = c.charCodeAt();
                o += '\\u00' + Math.floor(c / 16).toString(16) +
                    (c % 16).toString(16);
            }
        }
    }
    return o + '"';
}

// Inspired by Douglas Crockford's remedies: a better Type Detection.
// @see http://javascript.crockford.com/remedial.html
function detectType(value) {
    var s = typeof value;
    if (s === 'object') {
        if (value) {
            if (value instanceof Array) {
                s = 'array';
            } else if (value instanceof RegExp) {
                s = 'regexp';
            } else if (value instanceof Date) {
                s = 'date';
            }
        } else {
            s = 'null';
        }
    }
    return s;
}

function decorateNewPage(opts, page) {
    var handlers = {};

    try {
        page.rawPageCreated.connect(function(newPage) {
            // Decorate the new raw page appropriately
            newPage = decorateNewPage(opts, newPage);

            // Notify via callback, if a callback was provided
            if (page.onPageCreated && typeof(page.onPageCreated) === "function") {
                page.onPageCreated(newPage);
            }
        });
    } catch (e) {}

    // deep copy
    page.settings = JSON.parse(JSON.stringify(phantom.defaultPageSettings));

    definePageSignalHandler(page, handlers, "onInitialized", "initialized");

    definePageSignalHandler(page, handlers, "onLoadStarted", "loadStarted");

    definePageSignalHandler(page, handlers, "onLoadFinished", "loadFinished");

    definePageSignalHandler(page, handlers, "onUrlChanged", "urlChanged");

    definePageSignalHandler(page, handlers, "onNavigationRequested", "navigationRequested");

    definePageSignalHandler(page, handlers, "onRepaintRequested", "repaintRequested");

    definePageSignalHandler(page, handlers, "onResourceRequested", "resourceRequested");

    definePageSignalHandler(page, handlers, "onResourceReceived", "resourceReceived");

    definePageSignalHandler(page, handlers, "onResourceError", "resourceError");

    definePageSignalHandler(page, handlers, "onResourceTimeout", "resourceTimeout");

    definePageSignalHandler(page, handlers, "onAlert", "javaScriptAlertSent");

    definePageSignalHandler(page, handlers, "onConsoleMessage", "javaScriptConsoleMessageSent");

    definePageSignalHandler(page, handlers, "onClosing", "closing");

    // Private callback for "page.open()"
    definePageSignalHandler(page, handlers, "_onPageOpenFinished", "loadFinished");

    phantom.__defineErrorSignalHandler__(page, page, handlers);

    page.onError = phantom.defaultErrorHandler;

    page.open = function (url, arg1, arg2, arg3, arg4) {
        var thisPage = this;

        if (arguments.length === 1) {
            this.openUrl(url, 'get', this.settings);
            return;
        } else if (arguments.length === 2 && typeof arg1 === 'function') {
            this._onPageOpenFinished = function() {
                thisPage._onPageOpenFinished = null; //< Disconnect callback (should fire only once)
                arg1.apply(thisPage, arguments);     //< Invoke the actual callback
            };
            this.openUrl(url, 'get', this.settings);
            return;
        } else if (arguments.length === 2) {
            this.openUrl(url, arg1, this.settings);
            return;
        } else if (arguments.length === 3 && typeof arg2 === 'function') {
            this._onPageOpenFinished = function() {
                thisPage._onPageOpenFinished = null; //< Disconnect callback (should fire only once)
                arg2.apply(thisPage, arguments);     //< Invoke the actual callback
            };
            this.openUrl(url, arg1, this.settings);
            return;
        } else if (arguments.length === 3) {
            this.openUrl(url, {
                operation: arg1,
                data: arg2
            }, this.settings);
            return;
        } else if (arguments.length === 4) {
            this._onPageOpenFinished = function() {
                thisPage._onPageOpenFinished = null; //< Disconnect callback (should fire only once)
                arg3.apply(thisPage, arguments);     //< Invoke the actual callback
            };
            this.openUrl(url, {
                operation: arg1,
                data: arg2
            }, this.settings);
            return;
        } else if (arguments.length === 5) {
            this._onPageOpenFinished = function() {
                thisPage._onPageOpenFinished = null; //< Disconnect callback (should fire only once)
                arg4.apply(thisPage, arguments);     //< Invoke the actual callback
            };
            this.openUrl(url, {
                operation: arg1,
                data: arg2,
                headers : arg3
            }, this.settings);
            return;
        }
        throw "Wrong use of WebPage#open";
    };

    /**
     * Include an external JavaScript file and notify when done.
     * @param scriptUrl URL to the Script to include
     * @param onScriptLoaded If provided, this call back is executed when the inclusion is done
     */
    page.includeJs = function (scriptUrl, onScriptLoaded) {
        // Register temporary signal handler for 'alert()'
        this.javaScriptAlertSent.connect(function (msgFromAlert) {
            if (msgFromAlert === scriptUrl) {
                // Resource loaded, time to fire the callback (if any)
                if (onScriptLoaded && typeof(onScriptLoaded) === "function") {
                    onScriptLoaded(scriptUrl);
                }
                // And disconnect the signal handler
                try {
                    this.javaScriptAlertSent.disconnect(arguments.callee);
                } catch (e) {}
            }
        });

        // Append the script tag to the body
        this._appendScriptElement(scriptUrl);
    };

    /**
     * evaluate a function in the page
     * @param   {function}  func    the function to evaluate
     * @param   {...}       args    function arguments
     * @return  {*}                 the function call result
     */
    page.evaluate = function (func, args) {
        var str, arg, argType, i, l;
        if (!(func instanceof Function || typeof func === 'string' || func instanceof String)) {
            throw "Wrong use of WebPage#evaluate";
        }
        str = 'function() { return (' + func.toString() + ')(';
        for (i = 1, l = arguments.length; i < l; i++) {
            arg = arguments[i];
            argType = detectType(arg);

            switch (argType) {
            case "object":      //< for type "object"
            case "array":       //< for type "array"
                str += JSON.stringify(arg) + ",";
                break;
            case "date":        //< for type "date"
                str += "new Date(" + JSON.stringify(arg) + "),";
                break;
            case "string":      //< for type "string"
                str += quoteString(arg) + ',';
                break;
            default:            // for types: "null", "number", "function", "regexp", "undefined"
                str += arg + ',';
                break;
            }
        }
        str = str.replace(/,$/, '') + '); }';
        return this.evaluateJavaScript(str);
    };

    /**
     * evaluate a function in the page, asynchronously
     * NOTE: it won't return anything: the execution is asynchronous respect to the call.
     * NOTE: the execution stack starts from within the page object
     * @param   {function}  func    the function to evaluate
     * @param   {number}    timeMs  time to wait before execution
     * @param   {...}       args    function arguments
     */
    page.evaluateAsync = function (func, timeMs, args) {
        // Remove the first 2 arguments because we are going to consume them
        args = Array.prototype.slice.call(arguments, 2);
        var numArgsToAppend = args.length,
            funcTimeoutWrapper;

        if (!(func instanceof Function || typeof func === 'string' || func instanceof String)) {
            throw "Wrong use of WebPage#evaluateAsync";
        }
        // Wrapping the "func" argument into a setTimeout
        funcTimeoutWrapper = "function() { setTimeout(" + func.toString() + ", " + timeMs;
        while(numArgsToAppend > 0) {
            --numArgsToAppend;
            funcTimeoutWrapper += ", arguments[" + numArgsToAppend + "]";
        }
        funcTimeoutWrapper += "); }";

        // Augment the "args" array
        args.splice(0, 0, funcTimeoutWrapper);

        this.evaluate.apply(this, args);
    };

    /**
     * upload a file
     * @param {string}       selector  css selector for the file input element
     * @param {string,array} fileNames the name(s) of the file(s) to upload
     */
    page.uploadFile = function(selector, fileNames) {
        if (typeof fileNames == "string") {
            fileNames = [fileNames];
        }

        this._uploadFile(selector, fileNames);
    };

    // Copy options into page
    if (opts) {
        page = copyInto(page, opts);
    }

    // Calls from within the page to "phantomCallback()" arrive to this handler
    definePageCallbackHandler(page, handlers, "onCallback", "_getGenericCallback");

    // Calls arrive to this handler when the user is asked to pick a file
    definePageCallbackHandler(page, handlers, "onFilePicker", "_getFilePickerCallback");

    // Calls from within the page to "window.confirm(message)" arrive to this handler
    // @see https://developer.mozilla.org/en/DOM/window.confirm
    definePageCallbackHandler(page, handlers, "onConfirm", "_getJsConfirmCallback");

    // Calls from within the page to "window.prompt(message, defaultValue)" arrive to this handler
    // @see https://developer.mozilla.org/en/DOM/window.prompt
    definePageCallbackHandler(page, handlers, "onPrompt", "_getJsPromptCallback");

    // Calls from within the page when some javascript code running to long
    definePageCallbackHandler(page, handlers, "onLongRunningScript", "_getJsInterruptCallback");

/***** < ivan *****/
    definePageCallbackHandler(page, handlers, "_onFilter", "_getFilterCallback");
/***** ivan > *****/

    page.event = {};
    page.event.modifier = {
        shift:  0x02000000,
        ctrl:   0x04000000,
        alt:    0x08000000,
        meta:   0x10000000,
        keypad: 0x20000000
    };

    page.event.key = {
        '0': 48,
        '1': 49,
        '2': 50,
        '3': 51,
        '4': 52,
        '5': 53,
        '6': 54,
        '7': 55,
        '8': 56,
        '9': 57,
        'A': 65,
        'AE': 198,
        'Aacute': 193,
        'Acircumflex': 194,
        'AddFavorite': 16777408,
        'Adiaeresis': 196,
        'Agrave': 192,
        'Alt': 16777251,
        'AltGr': 16781571,
        'Ampersand': 38,
        'Any': 32,
        'Apostrophe': 39,
        'ApplicationLeft': 16777415,
        'ApplicationRight': 16777416,
        'Aring': 197,
        'AsciiCircum': 94,
        'AsciiTilde': 126,
        'Asterisk': 42,
        'At': 64,
        'Atilde': 195,
        'AudioCycleTrack': 16777478,
        'AudioForward': 16777474,
        'AudioRandomPlay': 16777476,
        'AudioRepeat': 16777475,
        'AudioRewind': 16777413,
        'Away': 16777464,
        'B': 66,
        'Back': 16777313,
        'BackForward': 16777414,
        'Backslash': 92,
        'Backspace': 16777219,
        'Backtab': 16777218,
        'Bar': 124,
        'BassBoost': 16777331,
        'BassDown': 16777333,
        'BassUp': 16777332,
        'Battery': 16777470,
        'Bluetooth': 16777471,
        'Book': 16777417,
        'BraceLeft': 123,
        'BraceRight': 125,
        'BracketLeft': 91,
        'BracketRight': 93,
        'BrightnessAdjust': 16777410,
        'C': 67,
        'CD': 16777418,
        'Calculator': 16777419,
        'Calendar': 16777444,
        'Call': 17825796,
        'Camera': 17825824,
        'CameraFocus': 17825825,
        'Cancel': 16908289,
        'CapsLock': 16777252,
        'Ccedilla': 199,
        'Clear': 16777227,
        'ClearGrab': 16777421,
        'Close': 16777422,
        'Codeinput': 16781623,
        'Colon': 58,
        'Comma': 44,
        'Community': 16777412,
        'Context1': 17825792,
        'Context2': 17825793,
        'Context3': 17825794,
        'Context4': 17825795,
        'ContrastAdjust': 16777485,
        'Control': 16777249,
        'Copy': 16777423,
        'Cut': 16777424,
        'D': 68,
        'DOS': 16777426,
        'Dead_Abovedot': 16781910,
        'Dead_Abovering': 16781912,
        'Dead_Acute': 16781905,
        'Dead_Belowdot': 16781920,
        'Dead_Breve': 16781909,
        'Dead_Caron': 16781914,
        'Dead_Cedilla': 16781915,
        'Dead_Circumflex': 16781906,
        'Dead_Diaeresis': 16781911,
        'Dead_Doubleacute': 16781913,
        'Dead_Grave': 16781904,
        'Dead_Hook': 16781921,
        'Dead_Horn': 16781922,
        'Dead_Iota': 16781917,
        'Dead_Macron': 16781908,
        'Dead_Ogonek': 16781916,
        'Dead_Semivoiced_Sound': 16781919,
        'Dead_Tilde': 16781907,
        'Dead_Voiced_Sound': 16781918,
        'Delete': 16777223,
        'Direction_L': 16777305,
        'Direction_R': 16777312,
        'Display': 16777425,
        'Documents': 16777427,
        'Dollar': 36,
        'Down': 16777237,
        'E': 69,
        'ETH': 208,
        'Eacute': 201,
        'Ecircumflex': 202,
        'Ediaeresis': 203,
        'Egrave': 200,
        'Eisu_Shift': 16781615,
        'Eisu_toggle': 16781616,
        'Eject': 16777401,
        'End': 16777233,
        'Enter': 16777221,
        'Equal': 61,
        'Escape': 16777216,
        'Excel': 16777428,
        'Exclam': 33,
        'Execute': 16908291,
        'Explorer': 16777429,
        'F': 70,
        'F1': 16777264,
        'F10': 16777273,
        'F11': 16777274,
        'F12': 16777275,
        'F13': 16777276,
        'F14': 16777277,
        'F15': 16777278,
        'F16': 16777279,
        'F17': 16777280,
        'F18': 16777281,
        'F19': 16777282,
        'F2': 16777265,
        'F20': 16777283,
        'F21': 16777284,
        'F22': 16777285,
        'F23': 16777286,
        'F24': 16777287,
        'F25': 16777288,
        'F26': 16777289,
        'F27': 16777290,
        'F28': 16777291,
        'F29': 16777292,
        'F3': 16777266,
        'F30': 16777293,
        'F31': 16777294,
        'F32': 16777295,
        'F33': 16777296,
        'F34': 16777297,
        'F35': 16777298,
        'F4': 16777267,
        'F5': 16777268,
        'F6': 16777269,
        'F7': 16777270,
        'F8': 16777271,
        'F9': 16777272,
        'Favorites': 16777361,
        'Finance': 16777411,
        'Flip': 17825798,
        'Forward': 16777314,
        'G': 71,
        'Game': 16777430,
        'Go': 16777431,
        'Greater': 62,
        'H': 72,
        'Hangul': 16781617,
        'Hangul_Banja': 16781625,
        'Hangul_End': 16781619,
        'Hangul_Hanja': 16781620,
        'Hangul_Jamo': 16781621,
        'Hangul_Jeonja': 16781624,
        'Hangul_PostHanja': 16781627,
        'Hangul_PreHanja': 16781626,
        'Hangul_Romaja': 16781622,
        'Hangul_Special': 16781631,
        'Hangul_Start': 16781618,
        'Hangup': 17825797,
        'Hankaku': 16781609,
        'Help': 16777304,
        'Henkan': 16781603,
        'Hibernate': 16777480,
        'Hiragana': 16781605,
        'Hiragana_Katakana': 16781607,
        'History': 16777407,
        'Home': 16777232,
        'HomePage': 16777360,
        'HotLinks': 16777409,
        'Hyper_L': 16777302,
        'Hyper_R': 16777303,
        'I': 73,
        'Iacute': 205,
        'Icircumflex': 206,
        'Idiaeresis': 207,
        'Igrave': 204,
        'Insert': 16777222,
        'J': 74,
        'K': 75,
        'Kana_Lock': 16781613,
        'Kana_Shift': 16781614,
        'Kanji': 16781601,
        'Katakana': 16781606,
        'KeyboardBrightnessDown': 16777398,
        'KeyboardBrightnessUp': 16777397,
        'KeyboardLightOnOff': 16777396,
        'L': 76,
        'LastNumberRedial': 17825801,
        'Launch0': 16777378,
        'Launch1': 16777379,
        'Launch2': 16777380,
        'Launch3': 16777381,
        'Launch4': 16777382,
        'Launch5': 16777383,
        'Launch6': 16777384,
        'Launch7': 16777385,
        'Launch8': 16777386,
        'Launch9': 16777387,
        'LaunchA': 16777388,
        'LaunchB': 16777389,
        'LaunchC': 16777390,
        'LaunchD': 16777391,
        'LaunchE': 16777392,
        'LaunchF': 16777393,
        'LaunchG': 16777486,
        'LaunchH': 16777487,
        'LaunchMail': 16777376,
        'LaunchMedia': 16777377,
        'Left': 16777234,
        'Less': 60,
        'LightBulb': 16777405,
        'LogOff': 16777433,
        'M': 77,
        'MailForward': 16777467,
        'Market': 16777434,
        'Massyo': 16781612,
        'MediaLast': 16842751,
        'MediaNext': 16777347,
        'MediaPause': 16777349,
        'MediaPlay': 16777344,
        'MediaPrevious': 16777346,
        'MediaRecord': 16777348,
        'MediaStop': 16777345,
        'MediaTogglePlayPause': 16777350,
        'Meeting': 16777435,
        'Memo': 16777404,
        'Menu': 16777301,
        'MenuKB': 16777436,
        'MenuPB': 16777437,
        'Messenger': 16777465,
        'Meta': 16777250,
        'Minus': 45,
        'Mode_switch': 16781694,
        'MonBrightnessDown': 16777395,
        'MonBrightnessUp': 16777394,
        'Muhenkan': 16781602,
        'Multi_key': 16781600,
        'MultipleCandidate': 16781629,
        'Music': 16777469,
        'MySites': 16777438,
        'N': 78,
        'News': 16777439,
        'No': 16842754,
        'Ntilde': 209,
        'NumLock': 16777253,
        'NumberSign': 35,
        'O': 79,
        'Oacute': 211,
        'Ocircumflex': 212,
        'Odiaeresis': 214,
        'OfficeHome': 16777440,
        'Ograve': 210,
        'Ooblique': 216,
        'OpenUrl': 16777364,
        'Option': 16777441,
        'Otilde': 213,
        'P': 80,
        'PageDown': 16777239,
        'PageUp': 16777238,
        'ParenLeft': 40,
        'ParenRight': 41,
        'Paste': 16777442,
        'Pause': 16777224,
        'Percent': 37,
        'Period': 46,
        'Phone': 16777443,
        'Pictures': 16777468,
        'Play': 16908293,
        'Plus': 43,
        'PowerDown': 16777483,
        'PowerOff': 16777399,
        'PreviousCandidate': 16781630,
        'Print': 16777225,
        'Printer': 16908290,
        'Q': 81,
        'Question': 63,
        'QuoteDbl': 34,
        'QuoteLeft': 96,
        'R': 82,
        'Refresh': 16777316,
        'Reload': 16777446,
        'Reply': 16777445,
        'Return': 16777220,
        'Right': 16777236,
        'Romaji': 16781604,
        'RotateWindows': 16777447,
        'RotationKB': 16777449,
        'RotationPB': 16777448,
        'S': 83,
        'Save': 16777450,
        'ScreenSaver': 16777402,
        'ScrollLock': 16777254,
        'Search': 16777362,
        'Select': 16842752,
        'Semicolon': 59,
        'Send': 16777451,
        'Shift': 16777248,
        'Shop': 16777406,
        'SingleCandidate': 16781628,
        'Slash': 47,
        'Sleep': 16908292,
        'Space': 32,
        'Spell': 16777452,
        'SplitScreen': 16777453,
        'Standby': 16777363,
        'Stop': 16777315,
        'Subtitle': 16777477,
        'Super_L': 16777299,
        'Super_R': 16777300,
        'Support': 16777454,
        'Suspend': 16777484,
        'SysReq': 16777226,
        'T': 84,
        'THORN': 222,
        'Tab': 16777217,
        'TaskPane': 16777455,
        'Terminal': 16777456,
        'Time': 16777479,
        'ToDoList': 16777420,
        'ToggleCallHangup': 17825799,
        'Tools': 16777457,
        'TopMenu': 16777482,
        'Touroku': 16781611,
        'Travel': 16777458,
        'TrebleDown': 16777335,
        'TrebleUp': 16777334,
        'U': 85,
        'UWB': 16777473,
        'Uacute': 218,
        'Ucircumflex': 219,
        'Udiaeresis': 220,
        'Ugrave': 217,
        'Underscore': 95,
        'Up': 16777235,
        'V': 86,
        'Video': 16777459,
        'View': 16777481,
        'VoiceDial': 17825800,
        'VolumeDown': 16777328,
        'VolumeMute': 16777329,
        'VolumeUp': 16777330,
        'W': 87,
        'WLAN': 16777472,
        'WWW': 16777403,
        'WakeUp': 16777400,
        'WebCam': 16777466,
        'Word': 16777460,
        'X': 88,
        'Xfer': 16777461,
        'Y': 89,
        'Yacute': 221,
        'Yes': 16842753,
        'Z': 90,
        'Zenkaku': 16781608,
        'Zenkaku_Hankaku': 16781610,
        'Zoom': 16908294,
        'ZoomIn': 16777462,
        'ZoomOut': 16777463,
        'acute': 180,
        'brokenbar': 166,
        'cedilla': 184,
        'cent': 162,
        'copyright': 169,
        'currency': 164,
        'degree': 176,
        'diaeresis': 168,
        'division': 247,
        'exclamdown': 161,
        'guillemotleft': 171,
        'guillemotright': 187,
        'hyphen': 173,
        'iTouch': 16777432,
        'macron': 175,
        'masculine': 186,
        'mu': 181,
        'multiply': 215,
        'nobreakspace': 160,
        'notsign': 172,
        'onehalf': 189,
        'onequarter': 188,
        'onesuperior': 185,
        'ordfeminine': 170,
        'paragraph': 182,
        'periodcentered': 183,
        'plusminus': 177,
        'questiondown': 191,
        'registered': 174,
        'section': 167,
        'ssharp': 223,
        'sterling': 163,
        'threequarters': 190,
        'threesuperior': 179,
        'twosuperior': 178,
        'unknown': 33554431,
        'ydiaeresis': 255,
        'yen': 165
    };
    
/***** < ivan *****/
    var _utils = require('utils');

    Object.defineProperty(page, "document", {
        get: function() {
            var result;
            result = this._one('body');
            if (result) {
                result = result.parentNode;
                if (result) result = result.parentNode;
            }
            else {
                result = document.querySelector('*');
                if (result) result = result.parentNode;
            }
            return result;
        }
    });

    Object.defineProperty(page, "width", {
        get: function() {
            var doc = page.document.documentElement;
            return Math.max(
                Math.max(doc.scrollWidth, doc.scrollWidth),
                Math.max(doc.offsetWidth, doc.offsetWidth),
                Math.max(doc.clientWidth, doc.clientWidth)
            );
        }
    });

    Object.defineProperty(page, "height", {
        get: function() {
            var doc = page.document.documentElement;
            return Math.max(
                Math.max(doc.scrollHeight, doc.scrollHeight),
                Math.max(doc.offsetHeight, doc.offsetHeight),
                Math.max(doc.clientHeight, doc.clientHeight)
            );
        }
    });

    Object.defineProperty(page, "language", {
        get: function() {
            return phantom.detectLanguage(this.html(), true);
        }
    });
    
    page.oneCss = function(selector, source) {
        var result = null;
        try {
            if (!source) {
                result = this._one(selector);
            }
            else {
                var identitySelectorRex = /:root/, // this will point to source element itself
                    sourceTempAttribute = '__temp_dummy_attrib__';
                source.setAttribute(sourceTempAttribute, "");
                result = source.querySelector(selector.replace(identitySelectorRex, '[' + sourceTempAttribute + ']'));
                source.removeAttribute(sourceTempAttribute);
            }
        }catch(e){}
        return result;
    };

    page.oneXPath = function(selector, source) {
        var result = null;
        try {
            if (!source) {
                var doc = this.document;
                var a = doc.evaluate(selector, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                if (a.snapshotLength > 0) {
                    result = a.snapshotItem(0);
                }
            }
            else {
                var a = this.document.evaluate(selector, source, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                if (a.snapshotLength > 0) {
                    result = a.snapshotItem(0);
                }
            }
        }catch(e){}
        return result;
    };

    page.one = function(selector, source) {
        var result = null;
        if (/\//.test(selector)) { // if starts with / try xpath first
            result = this.oneXPath(selector, source);
            if (result == null) {
                result = this.oneCss(selector, source);
            }
        }
        else {
            result = this.oneCss(selector, source);
            if (result == null) {
                result = this.oneXPath(selector, source);
            }
        }
        return result;
    };
    
    page.allCss = function(selector, source) {
        var result = null;
        try {
            if (!source) {
                result = this.document.querySelectorAll(selector);
            }
            else {
                var identitySelectorRex = /:root/, // this will point to source element itself
                    sourceTempAttribute = '__temp_dummy_attrib__',
                    result;
                source.setAttribute(sourceTempAttribute, "");
                result = source.querySelectorAll(selector.replace(identitySelectorRex, '[' + sourceTempAttribute + ']'));
                source.removeAttribute(sourceTempAttribute);
            }
        }catch(e){}
        return result;
    };
    
    page.allXPath = function(selector, source) {
        var result = null;
        try {
            if (!source) {
                result = [];
                var doc = this.document;
                var a = doc.evaluate(selector, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                for (var i = 0; i < a.snapshotLength; i++) {
                    result.push(a.snapshotItem(i));
                }
            }
            else {
                result = [];
                var a = this.document.evaluate(selector, source, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                for (var i = 0; i < a.snapshotLength; i++) {
                    result.push(a.snapshotItem(i));
                }
            }
        }catch(e){}
        return result;
    };

    page.all = function(selector, source) {
        var result = null;
        if (/\//.test(selector)) { // if starts with / try xpath first
            result = this.allXPath(selector, source);
            if (result == null) {
                result = this.allCss(selector, source);
            }
        }
        else {
            result = this.allCss(selector, source);
            if (result == null) {
                result = this.allXPath(selector, source);
            }
        }
        return result;
    };

    definePageSignalHandler(page, handlers, "_onWaitForTest", "_waitForTest");

    page.wait = function(timeout, maxrnd) {
        if (timeout) {
            timeout = parseInt(timeout);
            if (maxrnd) {
                maxrnd = parseInt(maxrnd);
                timeout = Math.round(timeout + Math.random() * maxrnd);
            }
            _utils.debug('wait ' + timeout + 'ms');
            this._wait(timeout);
        }
    };

    page.waitFor = function(arg1, arg2, arg3) {
        var thisPage = this;
        if (arguments.length === 1 && detectType(arg1) === 'function') {
            this._onWaitForTest = function() {
                thisPage._waitForTestFunctionResult = arg1.apply(thisPage, arguments); //< Invoke the actual callback
            }
            return this._waitForFunction();
        } else if (arguments.length === 2 && detectType(arg1) === 'number' && detectType(arg2) === 'function') {
            this._onWaitForTest = function() {
                thisPage._waitForTestFunctionResult = arg2.apply(thisPage, arguments); //< Invoke the actual callback
            }
            return this._waitForFunction(arg1);
        } else if (arguments.length === 3 && detectType(arg1) === 'number' && detectType(arg2) === 'number' && detectType(arg3) === 'function') {
            this._onWaitForTest = function() {
                thisPage._waitForTestFunctionResult =  arg3.apply(thisPage, arguments); //< Invoke the actual callback
            }
            return this._waitForFunction(arg1, arg2);
        }
        throw "Wrong use of WebPage#waitFor";
    };

    page.visible = function (selector, source) {
        var el = (isElement(selector)) ? selector : page.one(selector, source);

        if (el) {
            var comp = window.getComputedStyle(el, null);
            return comp.visibility !== 'hidden' && comp.display !== 'none' && el.offsetHeight > 0 && el.offsetWidth > 0;
        }
        return false;
    };

    var mutationStarted = false,
        mutationChanged = true,
        mutationObserver = new WebKitMutationObserver(function() { mutationChanged = false; });

    page.mutation = mutationObserver;

    function resetMutation() {
        mutationStarted = false;
        mutationChanged = false;
        mutationObserver.disconnect();
    };

    page.waitForMutationBegin = function(selector, init) {
        resetMutation();
        if (init.childList || init.attributes || init.characterData) {
            var target = page.one(selector);
            if (target) {
                mutationStarted = true;
                mutationObserver.observe(target, init);
                return true;
            }
        }
        return false;
    };

    page.waitForMutation = function() {
        var a = [];
        if (arguments.length == 4) {
            this.waitForMutationBegin(
                arguments[0], // selector
                arguments[1] // init
                );
            a.push(arguments[2]); // timeout
            a.push(arguments[3]); // interval
        }
        else if (arguments.length == 3) {
            this.waitForMutationBegin(
                arguments[0], // selector
                arguments[1] // init
                );
            a.push(arguments[2]); // timeout
        }
        else if (arguments.length == 2) {
            if (typeof(arguments[0]) == 'string') {
                this.waitForMutationBegin(
                    arguments[0], // selector
                    arguments[1] // init
                    );
            }
            else {
                a.push(arguments[0]); // timeout
                a.push(arguments[1]); // interval
            }
        }
        else if (arguments.length == 1) {
            a.push(arguments[0]); // timeout
        }

        var wait = mutationStarted && this.waitFor.apply(this, a.concat(function() {
            if (mutationChanged || mutationObserver.takeRecords().length) {
                return true;
            }
            else {
                return false;
            }
        }));

        return wait;
    };

    page.waitForSelector = function(selector, timeout, interval) {
        var thisPage = this;
        var a = [];
        if (timeout) a.push(timeout);
        if (interval) a.push(interval);
        return this.waitFor.apply(this, a.concat(function() {
            var elem = thisPage.one(selector);
            return elem !== null 
                &&  (elem.nextSibling != null 
                    || thisPage.document.readyState === 'interactive' 
                    || thisPage.document.readyState === 'complete'
                    );
        }));
    };

    page.waitForNotSelector = function(selector, timeout, interval) {
        var thisPage = this;
        var a = [];
        if (timeout) a.push(timeout);
        if (interval) a.push(interval);
        return this.waitFor.apply(this, a.concat(function() {
            return thisPage.one(selector) === null;
        }));
    };

    page.waitForVisible = function(selector, timeout, interval) {
        var thisPage = this;
        var a = [];
        if (timeout) a.push(timeout);
        if (interval) a.push(interval);
        return this.waitFor.apply(this, a.concat(function() {
            return thisPage.visible(selector);
        }));
    };

    page.waitForNotVisible = function(selector, timeout, interval) {
        var thisPage = this;
        var a = [];
        if (timeout) a.push(timeout);
        if (interval) a.push(interval);
        return this.waitFor.apply(this, a.concat(function() {
            return !thisPage.visible(selector);
        }));
    };

    function _onWaitDie(type) {
        if (this.onWaitDie) {
            try {
                this.onWaitDie(type);
                return;
            }
            catch (e) {}
        }
        this.quit('wait timeout for [' + type + ']', 1);
    }

    page.waitForPageOrDie = function () {
        if (!this.waitForPage.apply(this, arguments)) {
            _onWaitDie.call(this,'Page');
        }
    };
    page.waitForSelectorOrDie = function () {
        if (!this.waitForSelector.apply(this, arguments)) {
            _onWaitDie.call(this,'Selector');
        }
    };
    page.waitForNotSelectorOrDie = function () {
        if (!this.waitForNotSelector.apply(this, arguments)) {
            _onWaitDie.call(this,'NotSelector');
        }
    };
    page.waitForOrDie = function () {
        if (!this.waitFor.apply(this, arguments)) {
            _onWaitDie.call(this,'Function');
        }
    };
    page.waitForVisibleOrDie = function () {
        if (!this.waitForVisible.apply(this, arguments)) {
            _onWaitDie.call(this,'Visible');
        }
    };
    page.waitForNotVisibleOrDie = function () {
        if (!this.waitForNotVisible.apply(this, arguments)) {
            _onWaitDie.call(this,'NotVisible');
        }
    };

    page.exists = function(selector, source) {
        return page.one(selector, source) !== null;
    };

    page.remove = function(selector, source) {
        if (selector == '[object NodeList]') {
            var r = true;
            for (var i = 0; i < selector.length; i++) {
                r = r && this.remove(selector[i]);
            }
            return r;
        }
        else if (isElement(selector)) {
            selector.parentNode.removeChild(selector);
            return true;
        }
        else if (selector) {
            return this.remove(this.all(selector, source));
        }
        else {
            return false;
        }
    };

    var networkStats = {
        requests: 0,
        totalBodySize: 0,
        totalBodyResponses: 0,
        aborted: 0,
    };

    Object.defineProperty(page, 'networkStats', {
        get: function() {
            return networkStats;
        }
    });

    /* this code is for handling sync open function */
    definePageSignalHandler(page, handlers, "_onRequested", "resourceRequested");
    definePageSignalHandler(page, handlers, "_onReceived", "resourceReceived");
    definePageSignalHandler(page, handlers, "_onError", "resourceError");
    definePageSignalHandler(page, handlers, "_onTimeout", "resourceTimeout");
    function startCurrentRequest(url) {
        currentRequest.finished = false;
        currentRequest.trace = 1;
        currentRequest.url = (decodeURI(url) !== url) ? url : encodeURI(url); // encode only if it's not already encoded
        currentRequest.origin = url;
    }
    function resetCurrentRequest() {
        currentRequest = {
            finished: true,
            id: -1,
            trace: 0,
            url: undefined,
            origin: undefined,
            redirections: []
        }
    }
    function finishCurrentRequest(s, sm, e, em, t) {
        lastOpenResult = {
            actualUrl: currentRequest.url,
            status: s,
            statusMessage: sm,
            url: currentRequest.origin,
            redirections: currentRequest.redirections,
            error: e,
            errorMessage: em,
            timeout: (t) ? true : false,
            duration: (new Date()).getTime() - currentRequest.started
        }
        resetCurrentRequest();
    }
    var currentRequest, // holds state of current opensync
        lastOpenResult,
        openOnly;
    resetCurrentRequest();
    Object.defineProperty(page, 'openResult', {
        get: function() {
            return lastOpenResult;
        }
    });

    var filters = [];
    Object.defineProperty(page, 'filter', {
        get: function() {
            return filters;
        },
        set: function(val) {
            if (Array.isArray(val)) {
                filters = val;
            }
            else {
                filters = [val];
            }
        }
    });

    page._onFilter = function(url) {
        var ret = false;
        if (url[url.length - 1] === '/') { // always remove trailing slash
            url = url.substr(0,url.length - 1);
        }
        for (var i = 0; i < filters.length; i++) {
            var filter = filters[i];
            if (typeof filter == "string") {
                if (filter[filter.length - 1] === '/') { // always remove trailing slash
                    filter = filter.substr(0,filter.length - 1);
                }
                if(filter != url) {
                    ret = true;
                    break;
                }
            }
            else if (filter instanceof RegExp && !filter.test(url)) { 
                ret = true;
                break;
            }
        }
        return ret;
    }

    page._onRequested = function(request, networkRequest) {
        networkStats.requests++;
        if (currentRequest.trace === 1 &&
                (currentRequest.url === request.url
                ||
                currentRequest.url === request.url.replace(/\/$/, ''))) {
            currentRequest.trace = 2;
            currentRequest.id = request.id; // we identified request id
            currentRequest.started =(new Date()).getTime();
        }
    }
    page._onReceived = function(response) {
        if (response.bodySize) {
            networkStats.totalBodySize += response.bodySize;
            networkStats.totalBodyResponses++;
        }
        if (response.status == null) {
            networkStats.aborted++;
        }
        if (currentRequest.trace === 2 && response.id === currentRequest.id) { // we got response from initial request
            currentRequest.trace = 0;
            currentRequest.status = response.status;
            currentRequest.url = response.url;
            switch (response.status) {
                // http://www.w3.org/Protocols/rfc2616/rfc2616-sec10.html
                case 301: // Moved Permanently
                case 302: // Found
                case 303: // See Other
                case 307: // Temporary Redirect
                    // here we handle redirection
                    var redir;
                    if (response.redirectURL)
                        redir = response.redirectURL;
                    else
                        for (var i = 0; i < response.headers.length; i++) {
                            if (/location/i.test(response.headers[i].name)) {
                                redir = /^https?\:\/\/[^\/:?#]+/i.exec(response.url) + ((response.headers[i].value[0] == '/') ? response.headers[i].value : '/' + response.headers[i].value);
                                break;
                            }
                        }
                    currentRequest.redirections.push(redir);
                    currentRequest.url = redir;
                    currentRequest.trace = 1;
                    if (openOnly) {
                        page.filter = redir;
                    }
                    break;
                case 200:
                default:
                    finishCurrentRequest(response.status, response.statusText); // something is wrong
                    break;
            }
        }
    };
    page._onError = function(resourceError) {
        if (resourceError.id === currentRequest.id) { // we got error response from initial request
            finishCurrentRequest(0, undefined, resourceError.errorCode, resourceError.errorString);
        }
    };
    page._onTimeout = function(resourceError) {
        if (resourceError.id === currentRequest.id) { // we got timeout response from initial request
            finishCurrentRequest(0, undefined, resourceError.errorCode, resourceError.errorString, true);
        }
    };

    page.openonly = function (o) {
        if (typeof o === 'string') {
            o = {
                url : o,
                only : true,
            }
        }
        else if (!o.only) {
            o.only = true;
        }
        return page.opensync(o);
    }

    page.opensync = function() {
        if (arguments.length != 1 || arguments[0] == undefined) {
            finishCurrentRequest(0, '', 'Invalid call', '', false);
        }
        else {
            if (typeof(arguments[0]) == 'string') {
                cmd = {
                    url: arguments[0],
                }
            }
            else {
                cmd = arguments[0];
            }
            if (!/^https?:\/\//.test(cmd.url)) {
                finishCurrentRequest(0, '', 'Invalid url', '', false);
            }
            else {
                var filterBackup = page.filter;
                if (openOnly = !!cmd.only) {
                    page.filter = cmd.url;
                }
                if (cmd.timeout == undefined) cmd.timeout = 300000;
                if (cmd.retries == undefined) cmd.retries = 0;
                var retry = 0;
                while (retry <= cmd.retries) {
                    if (retry > 0 && cmd.delay) {
                        this.wait(cmd.delay);
                    }
                    this.stop();
                    startCurrentRequest(cmd.url);
                    this.open(cmd.url);
                    if (this.waitFor(cmd.timeout, 1000, function() {
                        return currentRequest.finished;
                    })) {
                        this.waitForPage();
                    }
                    else {
                        finishCurrentRequest(0, undefined, 'opensync timeout', 0, true);
                    }
                    if (this.openResult.status == 200) {
                        break;
                    }
                    else if (retry > 0) {
                        _utils.debug('retrying [' + retry + '] ' + cmd.url)
                    }
                    retry++;
                }
                if (openOnly) {
                    page.filter = filterBackup;
                    openOnly = false;
                }
            }
        }
        return this.openResult;
    };

    page.openrawClean = function (html) {
        return html
            .replace(/<!--[\s\S]*?-->/g,'')
            .replace(/<script[\s\S]+?<\/script>/gi,'')
            .replace(/<noscript[\s\S]+?<\/noscript>/gi,'')
            // .replace(/^[\s\S]*?<body[\s\S]*?>/gi, '')
            // .replace(/<\/body>[\s\S]*?$/gi, '')
            ;
    }

    var _net;
    page.openraw = function () {
        if (arguments.length == 0) return null;
        if (!_net) {
            _net = require('net');
            _net.handleRedirections = true;
            _net.bypassProxy = false;
        }
        
        // prepare openResult
        startCurrentRequest();

        _net.userAgent = this.settings.userAgent;
        var html = _net.fetch.apply(_net, arguments);
        html = this.openrawClean(html);

        this.setContent(html, _net.fetchResult.actualUrl);
        this.waitForPage();
        // finish openResult
        finishCurrentRequest(
            _net.fetchResult.status,
            _net.fetchResult.statusMessage,
            _net.fetchResult.error,
            _net.fetchResult.errorMessage
            );
        // fix values
        lastOpenResult.actualUrl = _net.fetchResult.actualUrl;
        lastOpenResult.url = _net.fetchResult.url;
        lastOpenResult.redirections = _net.fetchResult.redirections;

        // update networkStats
        var r = 1 + _net.fetchResult.redirections.length;
        networkStats.requests += r;
        networkStats.totalBodySize += _net.fetchResult.size;
        networkStats.totalBodyResponses += r;

        return this.openResult;
    }

    page.input = function (field, value) {
        if (field instanceof NodeList || field.toString() === '[object NodeList]') {
            for (var i = 0; i < field.length; i++) {
                this.input(field[i], value);
            }
            return;
        }
        var logValue;
        value = logValue = (value || "");
        if (typeof(field) == 'string') {
            field = this.one(field);
        }

        try { field.focus(); } catch (e) {}
        var nodeName = field.nodeName.toLowerCase();
        switch (nodeName) {
            case "input":
                var type = field.getAttribute('type') || "text";
                switch (type.toLowerCase()) {
                    case "color":
                    case "date":
                    case "datetime":
                    case "datetime-local":
                    case "email":
                    case "hidden":
                    case "month":
                    case "number":
                    case "password":
                    case "range":
                    case "search":
                    case "tel":
                    case "text":
                    case "time":
                    case "url":
                    case "week":
                        field.value = value;
                        break;
                    case "checkbox":
                        field.checked = value ? true : false;
                        break;
                    case "radio":
                        field.checked = (field.value === value);
                        break;
                    case "file":
                    default:
                        // throw new Error("Unsupported input field type: " + type);
                        break;
                }
                break;
            case "select":
            case "textarea":
                field.value = value;
                break;
            default:
                // throw new Error('Unsupported field type: ' + nodeName);
                break;
        }

        // firing the `change` and `input` events
        ['change', 'input'].forEach(function(name) {
            var event = this.document.createEvent("HTMLEvents");
            event.initEvent(name, true, true);
            field.dispatchEvent(event);
        });

        // blur the field
        try { field.blur(); } catch (e) {}
    };
        
    page.fill = function (selector, vals, submit) {
        var form;
        submit = submit === true ? submit : false;
        
        var fillResults = {
            success: false,
            errors: [],
            fields: [],
            files:  []
        };
        if (isElement(selector)) {
            form = selector;
        } else {
            form = this.one(selector);
        }
        if (!form) return false;
        for (var name in vals) {
            if (!vals.hasOwnProperty(name)) {
                continue;
            }
            var fields = this.all('[name="' + name + '"]', form);
            var value = vals[name];
            if (!fields || fields.length === 0) {
                continue;
            }
            for (var i = 0; i < fields.length; i++) {
                var field = fields[i];
                if (field.getAttribute('type').toLowerCase() === "file") {
                    fillResults.files.push({
                        name: name,
                        path: value
                    });
                } else {
                    fillResults.fields[name] = this.input(field, value);
                } 
            }
        }

        // File uploads
        if (fillResults.files && fillResults.files.length > 0) {
            (function _each(self) {
                fillResults.files.forEach(function _forEach(file) {
                    var fileFieldSelector = [selector, 'input[name="' + file.name + '"]'].join(' ');
                    self.uploadFile(fileFieldSelector, file.path);
                });
            })(this);
        }
        // Form submission?
        if (submit) {
            var form = this.one(selector);
            var method = (form.getAttribute('method') || "GET").toUpperCase();
            var action = form.getAttribute('action') || "unknown";
            if (typeof form.submit === "function") {
                _utils.debug('submiting form with method [' + method + '] and action [' + action + ']');
                form.submit();
            } else {
                _utils.debug('submiting/clicking form with method [' + method + '] and action [' + action + ']');
                form.submit.click();
            }
            this.wait(50); // we need to delay just a little bit so that pageloading can begin
        }
        return true;
    };

    page.capture = function (targetFile, e, options) {
        var previousClipRect, clipRect;
        if (isElement(e)) {
            clipRect = e.getBoundingClientRect();
        }
        else if (!e) {
            var vps = page.viewportSize;
            clipRect = {
                top: 0,
                left: 0,
                height: vps.height,
                width: vps.width
            };
        }
        else {
            clipRect = e;
        }
        previousClipRect = this.clipRect;
        this.clipRect = clipRect;

        var result = this.render(targetFile, options);
        if (previousClipRect) {
            this.clipRect = previousClipRect;
        }
        return result;
    };

    page.find = function () {
        var patterns, selector, source;
        patterns = arguments[0];
        if (arguments.length == 3) {
            selector = arguments[1];
            source = arguments[2];
        } else if (arguments.length == 2) {
            if (isElement(arguments[1])) {
                source = arguments[1];
            } else {
                selector = arguments[1];
            }
        }
        if (!Array.isArray(patterns)) patterns = [patterns];
        for (var p = 0; p < patterns.length; p++) {
            var pattern = patterns[p];
            var isNotRex = detectType(pattern) != 'regexp';
            if (isNotRex) pattern = pattern.toLowerCase();
            var elems = page.all(selector||'*', source),
                elem = null;
            for (var i = 0; i < elems.length; i++) {
                if (isNotRex && pattern === elems[i].textContent.trim().toLowerCase()
                    ||
                    !isNotRex && pattern.exec(elems[i].textContent.trim()) ) {
                    return elems[i];
                }
            }
        }
        return null;
    }
    
    page.click = function () {
        var elem,
            selector,
            source,
            emulated = 0,
            x,y;

        if (arguments.length == 0) { // ()
            return;
        }
        else if (arguments.length == 1) {
            // (selector)
            // (element)
            selector = arguments[0];
        }
        else if (arguments.length == 2) {
            // (x,y)
            // (selector,source)
            // (selector,emulated)
            // (element,emulated)
            if (typeof arguments[0] == 'number' && typeof arguments[1]  == 'number') { // (x,y)
                x = arguments[0];
                y = arguments[1];
            }
            else {
                selector = arguments[0];
                if (typeof arguments[1] == 'boolean' || typeof arguments[1] == 'number') { // (selector,source)
                    emulated = arguments[1];
                } else { // (*,emulated)
                    source = arguments[1];
                }
            }
        }
        else {
            // (selector,source,emulated)
            selector = arguments[0];
            source = arguments[1];
            emulated = arguments[2];
        }
        if (typeof emulated == 'boolean') {
            emulated = emulated ? 1 : 0;
        }


        if (typeof selector == 'string') {
            elem = this.one(selector, source);
        }
        else if (selector == '[object NodeList]') {
            var ret = true;
            for (var i = 0; i < selector.length; i++) {
                ret = ret && this.click(selector[i], emulated);
            }
            return ret;
        }
        else {
            elem = selector;
        }
        if (emulated == 1) {
            try {
                var evt = this.document.createEvent("MouseEvents");
                var center_x = 1, center_y = 1;
                try {
                    var pos = elem.getBoundingClientRect();
                    center_x = Math.floor((pos.left + pos.right) / 2),
                    center_y = Math.floor((pos.top + pos.bottom) / 2);
                } catch (e) { }
                evt.initMouseEvent('click', true, true, this.document.defaultView, 1, 1, 1, center_x, center_y, false, false, false, false, 0, elem);
                elem.dispatchEvent(evt);
                return true;
            }
            catch (e) {
                return false;
            }
        }
        else if (emulated == 2) {
            if (elem.click && /\[native code\]/.test(elem.click.toString())) {
                try {
                    elem.click();
                    return true;
                }
                catch (e) {
                    return false;
                }
            }
            else {
                return false;
            }
        }
        else {
            // backup viewport size & and make it biggest posible so that click can work
            var backupSize = this.viewportSize,
                backupScroll = this.scrollPosition;
            this.viewportSize = { width: this.width, height: this.height };
            this.scrollPosition = { left: 0, top: 0 };
            try {
                if (x != undefined) {
                    this.sendEvent.apply(this, ['click', x + backupScroll.left, y + backupScroll.top]);
                    return true;
                }
                else {
                    var clipRect = elem.getBoundingClientRect();
                    var x = Math.round(clipRect.left + clipRect.width / 2);
                    var y = Math.round(clipRect.top  + clipRect.height / 2);

                    this.sendEvent.apply(this, ['click', x, y]);
                }
                return true;
            } catch (e) {
                return false;
            }
            finally {
                // restore viewport and scroll to original
                this.viewportSize = backupSize;
                this.scrollPosition = backupScroll;
            }
        }
    };

    function hasProperty(obj, prop) {
        var proto = obj.__proto__ || obj.constructor.prototype;
        return (prop in obj) || (prop in proto) && proto[prop] === obj[prop];
    }

    function isElement(something) {
        return (something && typeof something === 'object' && hasProperty(something, 'innerHTML') && hasProperty(something, 'tagName') && hasProperty(something, 'querySelector'));
    }

    function text0helper(e, filter) {
        var txt = '',
            filterIndex = -1;
        for (var n = 0; n < e.childNodes.length; n++) {
            if (e.childNodes[n].nodeType == 3) {
                filterIndex++;
                if (!filter || filter.indexOf(filterIndex) !== -1) {
                    txt += e.childNodes[n].nodeValue + ' ';
                }
            }
        }
        return txt.trim();
    }

    page.text0 = function() {
        var element, filter, separator = ' ';
        if (arguments.length === 0) { // ()
            throw  new Error('Invalid use of function');
        }
        else if (arguments.length === 1) {
            // (element)
            // (nodeList)
            if (isElement(arguments[0]) || arguments[0] == '[object NodeList]') {
                element = arguments[0];
            }
            else {
                throw  new Error('Invalid use of function');
            }
        }
        else if (arguments.length === 2) {
            // (nodeList,separator)
            if (arguments[0] == '[object NodeList]' && typeof arguments[1] === 'string') {
                separator = arguments[1];
                element = arguments[0];
            }
            // (element,filter)
            // (nodeList,filter)
            else if ((isElement(arguments[0]) || arguments[0] == '[object NodeList]') && detectType(arguments[1]) === 'array') {
                filter = arguments[1];
                element = arguments[0];
            }
            else {
                throw  new Error('Invalid use of function');
            }
        }
        else if (arguments.length === 3) {
            // (nodeList,filter,separator)
            if (arguments[0] == '[object NodeList]' && detectType(arguments[1]) === 'array' && typeof arguments[2] === 'string') {
                separator = arguments[2];
                filter = arguments[1];
                element = arguments[0];
            }
            else {
                throw  new Error('Invalid use of function');
            }
        }
        if (element == '[object NodeList]') {
            var result = [];
            for (var i = 0; i < element.length; i++) {
                result.push(text0helper(element[i], filter));
            }
            if (separator != '[]') {
                return result.join(separator);
            }
            else {
                return result;
            }
        }
        else {
            return text0helper(element, filter);
        }
    }

    page.text = function() {
        var element, visibleOnly = false, separator = ' ';
        if (arguments.length === 0) { // ()
            element = page.one('body');
        }
        else if (arguments.length === 1) {
            // (visibleOnly)
            if (typeof arguments[0] === 'boolean') {
                visibleOnly = arguments[0];
                element = page.one('body');
            }
            // (source)
            // (nodeList)
            else if (isElement(arguments[0]) || arguments[0] == '[object NodeList]') {
                element = arguments[0];
            }
            // (selector)
            else if (typeof arguments[0] === 'string') {
                element = this.one(arguments[0]);
            }
            else {
                throw  new Error('Invalid use of function');
            }
        }
        else if (arguments.length === 2) {
            // (nodeList,separator)
            if (arguments[0] == '[object NodeList]' && typeof arguments[1] === 'string') {
                separator = arguments[1];
                element = arguments[0];
            }
            // (nodeList,visibleOnly)
            else if (arguments[0] == '[object NodeList]' && typeof arguments[1] === 'boolean') {
                visibleOnly = arguments[1];
                element = arguments[0];
            }
            // (source,visibleOnly)
            else if (isElement(arguments[0]) && typeof arguments[1] === 'boolean') {
                visibleOnly = arguments[1];
                element = arguments[0];
            }
            // (selector,visibleOnly)
            else if (typeof arguments[0] === 'string' && typeof arguments[1] === 'boolean') {
                visibleOnly = arguments[1];
                element = this.one(arguments[0]);
            }
            // (selector, source)
            else if (typeof arguments[0] === 'string' && isElement(arguments[1])) {
                element = this.one(arguments[0], arguments[1]);
            }
            else {
                throw  new Error('Invalid use of function');
            }
        }
        else if (arguments.length === 3) {
            // (nodeList,separator,visibleOnly)
            if (arguments[0] == '[object NodeList]' && typeof arguments[1] === 'string' && typeof arguments[2] === 'boolean') {
                visibleOnly = arguments[2];
                separator = arguments[1];
                element = arguments[0];
            }
            // (selector,source,visibleOnly)
            else if (typeof arguments[0] === 'string' && isElement(arguments[1]) && typeof arguments[2] === 'boolean') {
                visibleOnly = arguments[2];
                element = this.one(arguments[0], arguments[1]);
            }
            else {
                throw  new Error('Invalid use of function');
            }
        }
        else {
            throw  new Error('Invalid use of function');
        }
        if (element == '[object NodeList]') {
            var result = [];
            for (var i = 0; i < element.length; i++) {
                result.push((visibleOnly) ? element[i].innerText.trim() : element[i].textContent.trim());
            }
            if (separator != '[]') {
                return result.join(separator);
            }
            else {
                return result;
            }
        }
        else {
            return (element) ? ((visibleOnly) ? element.innerText.trim() : element.textContent.trim())  : '';
        }
    };

    page.html = function() {
        var element, outer = false, separator='';
        if (arguments.length === 0) { // ()
            var body = page.one('body');
            if (body) {
                element = body.parentNode;
            }
        }
        else if (arguments.length === 1) {
            // (outer)
            if (typeof arguments[0] === 'boolean') {
                outer = arguments[0];
                var body = page.one('body');
                if (body) {
                    element = body.parentNode;
                }
            }
            // (source)
            // (nodeList)
            else if (isElement(arguments[0]) || arguments[0] == '[object NodeList]') {
                element = arguments[0];
            }
            // (selector)
            else if (typeof arguments[0] === 'string') {
                element = this.one(arguments[0]);
            }
            else {
                throw  new Error('Invalid use of function');
            }
        }
        else if (arguments.length === 2) {
            // (nodeList,separator)
            if (arguments[0] == '[object NodeList]' && typeof arguments[1] === 'string') {
                separator = arguments[1];
                element = arguments[0];
            }
            // (nodeList,outer)
            else if (arguments[0] == '[object NodeList]' && typeof arguments[1] === 'boolean') {
                outer = arguments[1];
                element = arguments[0];
            }
            // (source,outer)
            else if (isElement(arguments[0]) && typeof arguments[1] === 'boolean') {
                outer = arguments[1];
                element = arguments[0];
            }
            // (selector,outer)
            else if (typeof arguments[0] === 'string' && typeof arguments[1] === 'boolean') {
                outer = arguments[1];
                element = this.one(arguments[0]);
            }
            // (selector, source)
            else if (typeof arguments[0] === 'string' && isElement(arguments[1])) {
                element = this.one(arguments[0], arguments[1]);
            }
            else {
                throw  new Error('Invalid use of function');
            }
        }
        else if (arguments.length === 3) {
            // (nodeList,separator,outer)
            if (arguments[0] == '[object NodeList]' && typeof arguments[1] === 'string' && typeof arguments[2] === 'boolean') {
                outer = arguments[2];
                separator = arguments[1];
                element = arguments[0];
            }
            // (selector,source,outer)
            else if (typeof arguments[0] === 'string' && isElement(arguments[1]) && typeof arguments[2] === 'boolean') {
                outer = arguments[2];
                element = this.one(arguments[0], arguments[1]);
            }
            else {
                throw  new Error('Invalid use of function');
            }
        }
        else {
            throw  new Error('Invalid use of function');
        }
        if (element == '[object NodeList]') {
            var result = [];
            for (var i = 0; i < element.length; i++) {
                result.push((outer) ? element[i].outerHTML : element[i].innerHTML);
            }
            if (separator != '[]') {
                return result.join(separator);
            }
            else {
                return result;
            }
        }
        else {
            return (element) ? ((outer) ? element.outerHTML : element.innerHTML)  : '';
        }
    };

    page.quit = function(msg, code) {
        if (msg) {
            console.log(msg);
        }
        if (code) {
            phantom.exit(code);
        }
        else {
            phantom.exit();
        }
    };

    page.back = function() {
        if (this.goBack()) {
            return this.waitForPage();
        }
        else {
            return false;
        }
    };

    page.forward = function() {
        if (this.goForward()) {
            return this.waitForPage();
        }
        else {
            return false;
        }
    };

    // grabbed from: http://james.padolsey.com/javascript/getting-a-fully-o-url/
    page.getUrl = function(e,attr){
        var url = "";
        if (isElement(e)) {
            if (attr) {
                url = e.getAttribute(attr);
            }
            else {
                url = e.getAttribute('href');
                if (url == null) url = e.getAttribute('src');
            }
            if (url == null) {
                if (attr) {
                    e = page.one('[' + attr + ']', e);
                }
                else {
                    e = page.one('a[href],img[src]', e);
                }
                if (e) {
                    return this.getUrl(e, attr);
                }
                else {
                    return "";
                }
            }
        }
        else {
            url = e;
        }
        if (url != null) {
            return page.resolveUrl(url);
            // var img = page.document.createElement('img');
            // img.src = url; // set string url
            // url = img.src; // get qualified url
            // img.src = 'http://'; // no server request
        }
        return url;
    };

    page.ajax = function(url, method, data, settings) {
        return this.evaluate(function(url, method, data, settings) {
            try {
                var xhr = new XMLHttpRequest(),
                    dataString = "",
                    dataList = [];
                method = method && method.toUpperCase() || "GET";
                var contentType = settings && settings.contentType || "application/x-www-form-urlencoded";
                xhr.open(method, url, false);
                if (settings && settings.overrideMimeType) {
                    xhr.overrideMimeType(settings.overrideMimeType);
                }
                if (settings && settings.headers) {
                    for (var h in settings.headers) {
                        xhr.setRequestHeader(h, settings.headers[h]);
                    }
                }
                if (method === "POST") {
                    if (typeof data === "object") {
                        for (var k in data) {
                            dataList.push(encodeURIComponent(k) + "=" + encodeURIComponent(data[k].toString()));
                        }
                        dataString = dataList.join('&');
                    } else if (typeof data === "string") {
                        dataString = data;
                    }
                    xhr.setRequestHeader("Content-Type", contentType);
                }
                xhr.send(method === "POST" ? dataString : null);
                return xhr.responseText;
            } catch (e) {
                return null;
            }
        }, url, method, data, settings);
    };

    // scroll to element or (x,y) position
    page.scrollTo = function() {
        var x,y;
        if (arguments.length == 1) {
            var elem;
            if (typeof arguments[0] == 'string') {
                elem = this.one(arguments[0]);
            }
            else {
                elem = arguments[0];
            }
            if (isElement(elem)) {
                var displayNone = elem.style.display == "none"; // if display=none then getBoundingClientRect() returns ZERO!
                if (displayNone) elem.style.display = "block";
                var pos = elem.getBoundingClientRect(),
                    currentScroll = this.scrollPosition;
                x = pos.left + currentScroll.left;
                y = pos.top + currentScroll.top; 
                if (displayNone) elem.style.display = "none";
            }
        }
        else if (arguments.length == 2) {
            x = arguments[0];
            y = arguments[1];
        }
        if (!isNaN(x) && !isNaN(y)) {
            if (x < 0) x = 0; else if (x > this.width) x = this.width;
            if (y < 0) y = 0; else if (y > this.height) y = this.height;
            this.scrollPosition = { left: x, top: y };
            return this.scrollPosition;
        }
    }

    page.scrollToTop = function() {
        return this.scrollTo(this.scrollPosition.left,0);
    }

    page.scrollToBottom = function() {
        var top = this.height - this.viewportSize.height;
        if (top < 0) top = 0;
        return this.scrollTo(this.scrollPosition.left, top);
    }

    page.serializeForm = function() {
        var form = (isElement(arguments[0])) ? arguments[0] : this.one(arguments[0], arguments[1]);
        if (!form || !form.elements) return null;

        var obj = null,
            rCRLF = /\r?\n/g,
            elems = form.elements;
        // test each form element
        for (var ie = 0; ie < elems.length; ie++) {
            var elem = elems[ie],
                type = elem.type;
            // test if "elem" should be included
            if (elem.name
                && !elem.disabled // don't include if it's disabled
                && /^(?:input|select|textarea|keygen)/i.test(elem.nodeName) // element must be form element
                && !/^(?:submit|button|image|reset|file)$/i.test(type) // element should not be submit element
                && (elem.checked || !/^(?:checkbox|radio)$/i.test(type)) // include "check type" element only if it's checked
                ) {
                var value;

                if (elem.selectedIndex === undefined) {
                    value = elem.value;
                }
                else { // "select" element
                    var values = [],
                        index = elem.selectedIndex,
                        options = elem.options,
                        one = elem.type === "select-one";

                    if ( index >= 0 ) {
                        // Loop through all the selected options
                        for ( var i = one ? index : 0, max = one ? index + 1 : options.length; i < max; i++ ) {
                            var option = options[ i ];

                            // Don't return options that are disabled or in a disabled optgroup
                            if (option.selected 
                                && !option.disabled
                                && (!option.parentNode || !option.parentNode.disabled || !option.parentNode.nodeName == "optgroup") ) {

                                // Get the specific value for the option
                                value = option.value;

                                // We don't need an array for one selects
                                if ( one ) {
                                    break;
                                }

                                // Multi-Selects return an array
                                values.push( value );
                            }
                        }

                        if (!one) {
                            value = values;
                        }
                    }
                }
                if (value != undefined) {
                    if (!obj) obj = {};
                    obj[elem.name] = (Array.isArray(value)) ? value : value.replace( rCRLF, "\r\n" );   
                }
            }
        };
        return obj;
    }

    function switchToDocFrame(page, doc) {
        if (page.document === doc) {
            return true;
        }

        for (var i = 0; i < page.framesCount; i++) { // loop trought all frame nodes on current frame and try to find selframe element index
            if (page.switchToFrame(i)) { // switch to that "i"th frame
                if (page.document === doc) {
                    return true;
                }
                else {
                    page.switchToParentFrame(); // we need to undo switch because it's not the right frame
                }
            }
        }

        return false;
    }

    // f: can be name or index or selector that points to the iframe element
    page.switchToThisFrame = function (f) {
        var frame = this.one(f);
        if (frame) {
            return switchToDocFrame(this, frame.contentDocument);
        }
        else {
            return this.switchToFrame(f);
        }
        
    }

/***** ivan > *****/

    return page;
}

exports.create = function (opts) {
    return decorateNewPage(opts, phantom.createWebPage());
};