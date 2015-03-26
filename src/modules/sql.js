/***** < ivan *****/
function definePageSignalHandler(page, handlers, handlerName, signalName) {
    page.__defineSetter__(handlerName, function (f) {
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
            }
            this[signalName].connect(f);
        }
    });
    
    page.__defineGetter__(handlerName, function() {
        return !!handlers[handlerName] && typeof handlers[handlerName].callback === "function" ?
            handlers[handlerName].callback :
            undefined;
    });
}

function definePageCallbackHandler(page, handlers, handlerName, callbackConstructor) {
    page.__defineSetter__(handlerName, function(f) {
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
    });
    
    page.__defineGetter__(handlerName, function() {
        var handlerObj = handlers[handlerName];
        return (!!handlerObj && typeof handlerObj.callback === "function" && typeof handlerObj.connector === "function") ?
            handlers[handlerName].callback :
            undefined;
    });
}

exports.create = function () {
    var sql = phantom.createSQL(),
        handlers = {};

    definePageSignalHandler(sql, handlers, "onMessage", "messageReceived");
    return sql;
}

/***** ivan > *****/
