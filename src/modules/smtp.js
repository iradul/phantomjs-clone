/***** < ivan *****/
exports.create = function(usn, psw, host, port, timeout) {
	port = port ||  465;
	timeout = timeout || 30000;
    return phantom.createSMTP(usn, psw, host, port, timeout);
};
/***** ivan > *****/
