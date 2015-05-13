/***** < ivan *****/
exports.create = function(usn, psw, host) {
    return phantom.createSMTP(usn, psw, host);
};
/***** ivan > *****/
