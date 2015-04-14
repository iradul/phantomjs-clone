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

var handlers = {},
    eventLoopTimer = phantom.createEventLoopTimer();
eventLoopTimer.useCallback = true;
definePageCallbackHandler(eventLoopTimer, handlers, "onTest", "_getTestCallback");

function wait() {
    var callback, timeout, interval;

    if (arguments.length === 1) {
        if (typeof arguments[0] === 'number') {
            return wait(arguments[0], arguments[0], function() { return true; });
        }
        else {
            callback = arguments[0];
        }
    } else if (arguments.length === 2) {
        if (typeof arguments[0] === 'number' && typeof arguments[1] === 'number') {
            timeout = Math.round(arguments[0] + Math.random() * arguments[1])
            return wait(timeout, timeout, function() { return true; });
        }
        else {
            timeout = arguments[0];
            callback = arguments[1];   
        }
    } else if (arguments.length === 3) {
        timeout = arguments[0];
        interval = arguments[1];
        callback = arguments[2];
    }
    if (typeof callback === 'function') {
        timeout = timeout || 5000;
        interval = interval || 200;
        eventLoopTimer.onTest = callback;
        return eventLoopTimer.start(interval, timeout);
    }
    else {
        return false;
    }
}

module.exports = wait;