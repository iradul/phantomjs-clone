/***** < ivan *****/
function defineSignalHandler(obj, native, handlers, handlerName, signalName) {
    Object.defineProperty(obj, handlerName, {
        set: function (f) {
            // Disconnect previous handler (if any)
            if (!!handlers[handlerName] && typeof handlers[handlerName].callback === "function") {
                try {
                    native[signalName].disconnect(handlers[handlerName].callback);
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
                native[signalName].connect(f);
            }
        },
        get: function() {
            return !!handlers[handlerName] && typeof handlers[handlerName].callback === "function" ?
                handlers[handlerName].callback :
                undefined;
        },
    });
}

function copyProperty(obj, native, p) {
    Object.defineProperty(obj, p, {
        set: function (v) { native[p] = v; },
        get: function () { return native[p]; },
    });
}
function copyProperties(obj, native) {
    for (var p in native) {
        if (typeof(native[p]) != 'function' && p != 'objectName') {
            // we must do this in separate function
            // otherwise p will always have latest value
            // and setter or getter will work totaly wrong
            copyProperty(obj, native, p);
        }
    }
}
function copyFunction(obj, native, nativename, name) {
    if (!name) name = nativename;
    obj[name] = function() {
        return native[nativename].apply(this,arguments);
    };
}

exports.create = function() {
    var nativeClient = phantom.createAMQPClient();
    var clientHandlers = {};
    var client = {
        _native: nativeClient
    };
    copyProperties(client, nativeClient);
    copyFunction(client, nativeClient, "connectToHost", "connect");
    copyFunction(client, nativeClient, "disconnectFromHost", "disconnect");
    Object.defineProperty(client, "error", { get: function () { return nativeClient.errorString(); } });
    Object.defineProperty(client, "socketError", { get: function () { return nativeClient.socketErrorString(); } });
    Object.defineProperty(client, "connected", { get: function () { return nativeClient.isConnected(); } });
    client.createExchange = function() {
        var nativeExchange = nativeClient.createExchange.apply(this,arguments);
        var exchange = {
                _native: nativeExchange
            },
            exchangeHandlers = {};
        copyProperties(exchange, nativeExchange);
        copyFunction(exchange, nativeExchange, "declare");
        copyFunction(exchange, nativeExchange, "remove");
        exchange.publish = function() {
            var len = arguments.length,
                args = Array.prototype.slice.call(arguments);
            if (len <= 1) {
                throw Error('Invalid use. Payload and routeing key are required.');
            } 
            if (len == 2) {
                args.push("text.plain"); // mime-type
            }
            if (len <= 3) {
                args.push({}); // headers
            } 
            return nativeExchange.publish.apply(this,args);
        };
        defineSignalHandler(exchange, nativeExchange, exchangeHandlers, "onDeclared", "declared");
        defineSignalHandler(exchange, nativeExchange, exchangeHandlers, "onRemoved", "removed");
        
        // from channel
        copyFunction(exchange, nativeExchange, "qos"); 
        Object.defineProperty(exchange, "error", { get: function () { return nativeExchange.errorString(); } });
        Object.defineProperty(exchange, "prefetchSize", { get: function () { return nativeExchange.prefetchSize(); } });
        Object.defineProperty(exchange, "prefetchCount", { get: function () { return nativeExchange.prefetchCount(); } });
        defineSignalHandler(exchange, nativeExchange, exchangeHandlers, "onQosDefined", "qosDefined");
        defineSignalHandler(exchange, nativeExchange, exchangeHandlers, "onError", "error");
        defineSignalHandler(exchange, nativeExchange, exchangeHandlers, "onPaused", "paused");
        defineSignalHandler(exchange, nativeExchange, exchangeHandlers, "onResumed", "resumed");
        defineSignalHandler(exchange, nativeExchange, exchangeHandlers, "onClosed", "closed");
        defineSignalHandler(exchange, nativeExchange, exchangeHandlers, "onOpened", "opened");
        return exchange;
    };
    client.createQueue = function() {
        var nativeQueue = nativeClient.createQueue.apply(this,arguments);
        var queue = {
                _native: nativeQueue
            },
            queueHandlers = {};
        copyProperties(queue, nativeQueue);
        copyFunction(queue, nativeQueue, "message");
        copyFunction(queue, nativeQueue, "declare");
        copyFunction(queue, nativeQueue, "bind");
        copyFunction(queue, nativeQueue, "unbind");
        copyFunction(queue, nativeQueue, "purge");
        copyFunction(queue, nativeQueue, "remove");
        copyFunction(queue, nativeQueue, "consume");
        copyFunction(queue, nativeQueue, "get");
        copyFunction(queue, nativeQueue, "ack");
        copyFunction(queue, nativeQueue, "cancel");
        Object.defineProperty(client, "empty", { get: function () { return nativeQueue.empty; } });
        defineSignalHandler(queue, nativeQueue, queueHandlers, "onDeclared", "declared");
        defineSignalHandler(queue, nativeQueue, queueHandlers, "onBound", "bound");
        defineSignalHandler(queue, nativeQueue, queueHandlers, "onUnbound", "unbound");
        defineSignalHandler(queue, nativeQueue, queueHandlers, "onRemoved", "removed");
        defineSignalHandler(queue, nativeQueue, queueHandlers, "onPurged", "purged");
        defineSignalHandler(queue, nativeQueue, queueHandlers, "onMessage", "messageReceived");
        defineSignalHandler(queue, nativeQueue, queueHandlers, "onEmpty", "empty");
        defineSignalHandler(queue, nativeQueue, queueHandlers, "onConsuming", "consuming");
        defineSignalHandler(queue, nativeQueue, queueHandlers, "onCancelled", "cancelled");
        
        // from channel
        copyFunction(queue, nativeQueue, "qos");
        Object.defineProperty(queue, "error", { get: function () { return nativeQueue.errorString(); } });
        Object.defineProperty(queue, "prefetchSize", { get: function () { return nativeQueue.prefetchSize(); } });
        Object.defineProperty(queue, "prefetchCount", { get: function () { return nativeQueue.prefetchCount(); } });
        defineSignalHandler(queue, nativeQueue, queueHandlers, "onQosDefined", "qosDefined");
        defineSignalHandler(queue, nativeQueue, queueHandlers, "onError", "error");
        defineSignalHandler(queue, nativeQueue, queueHandlers, "onPaused", "paused");
        defineSignalHandler(queue, nativeQueue, queueHandlers, "onResumed", "resumed");
        defineSignalHandler(queue, nativeQueue, queueHandlers, "onClosed", "closed");
        defineSignalHandler(queue, nativeQueue, queueHandlers, "onOpened", "opened");
        return queue;
    };
    defineSignalHandler(client, nativeClient, clientHandlers, "onConnected", "connected");
    defineSignalHandler(client, nativeClient, clientHandlers, "onDisconnected", "disconnected");
    defineSignalHandler(client, nativeClient, clientHandlers, "onError", "error");
    defineSignalHandler(client, nativeClient, clientHandlers, "onSocketError", "socketError");

    client.Exchange = {
        ExchangeType : {
            Direct      : "direct",
            FanOut      : "fanout",
            Topic       : "topic",
            Headers     : "headers",
        },
        ExchangeOption : {
            NoOptions   : 0x0,
            Passive     : 0x01,
            Durable     : 0x02,
            AutoDelete  : 0x04,
            Internal    : 0x08,
            NoWait      : 0x10
        },
        PublishOption : {
            NoOptions   : 0x0,
            Mandatory   : 0x01,
            Immediate   : 0x02
        },
        RemoveOption : {
            Force       : 0x0,
            IfUnused    : 0x01,
            NoWait      : 0x04
        }
    };
    client.Queue = {
        QueueOption : {
            NoOptions   : 0x0,
            Passive     : 0x01,
            Durable     : 0x02,
            Exclusive   : 0x04,
            AutoDelete  : 0x08,
            NoWait      : 0x10
        },
        ConsumeOption : {
            NoLocal     : 0x01,
            NoAck       : 0x02,
            Exclusive   : 0x04,
            NoWait      : 0x08
        },
        RemoveOption : {
            Force       : 0x0,
            IfUnused    : 0x01,
            IfEmpty     : 0x02,
            NoWait      : 0x04
        }
    };
    return client;
};

/***** ivan > *****/
