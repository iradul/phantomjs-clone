/*
 This is modified version of original x2js project http://code.google.com/p/x2js/

 Copyright 2011 Abdulla Abdurakhmanov
 Original sources are available at https://code.google.com/p/x2js/

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/***** < ivan *****/
var escapeMode = true;

var DOMNodeTypes = {
    ELEMENT_NODE: 1,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    DOCUMENT_NODE: 9
};

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

function getNodeLocalName(node) {
    var nodeLocalName = node.localName;
    return nodeLocalName;
}

function getNodePrefix(node) {
    return node.prefix;
}

function escapeXmlChars(str) {
    if (typeof (str) == "string")
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g, '&#x2F;');
    else
        return str;
}

function unescapeXmlChars(str) {
    return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#x2F;/g, '\/');
}

function parseDOMChildren(node) {
    if (node.nodeType == DOMNodeTypes.DOCUMENT_NODE) {
        var result = {};
        var child = node.firstChild;
        var childName = getNodeLocalName(child);
        result[childName] = parseDOMChildren(child);
        return result;
    }
    else
    if (node.nodeType == DOMNodeTypes.ELEMENT_NODE && node.attributes.length === 0 && node.childNodes.length == 1 && node.childNodes[0].nodeType == DOMNodeTypes.TEXT_NODE) {
        return node.childNodes[0].nodeValue;
    }
    else if (node.nodeType == DOMNodeTypes.ELEMENT_NODE) {
        var result = {};
        result.__cnt = 0;

        var nodeChildren = node.childNodes;

        // Children nodes
        for (var cidx = 0; cidx < nodeChildren.length; cidx++) {
            var child = nodeChildren.item(cidx); // nodeChildren[cidx];
            var childName = getNodeLocalName(child);

            result.__cnt++;
            if (result[childName] === null) {
                result[childName] = parseDOMChildren(child);
                result[childName + "_asArray"] = new Array(1);
                result[childName + "_asArray"][0] = result[childName];
            }
            else {
                if (result[childName] !== null) {
                    if (!(result[childName] instanceof Array)) {
                        var tmpObj = result[childName];
                        result[childName] = [];
                        result[childName][0] = tmpObj;

                        result[childName + "_asArray"] = result[childName];
                    }
                }
                var aridx = 0;
                while (result[childName][aridx] !== null) aridx++;
                (result[childName])[aridx] = parseDOMChildren(child);
            }
        }

        // Attributes
        for (var aidx = 0; aidx < node.attributes.length; aidx++) {
            var attr = node.attributes.item(aidx); // [aidx];
            result.__cnt++;
            result["_" + attr.name] = attr.value;
        }

        // Node namespace prefix
        var nodePrefix = getNodePrefix(node);
        if (nodePrefix !== null && nodePrefix !== "") {
            result.__cnt++;
            result.__prefix = nodePrefix;
        }

        if (result.__cnt == 1 && result["#text"] !== null) {
            result = result["#text"];
        }

        if (result["#text"] !== null) {
            result.__text = result["#text"];
            if (escapeMode)
                result.__text = unescapeXmlChars(result.__text);
            delete result["#text"];
            delete result["#text_asArray"];
        }
        if (result["#cdata-section"] !== null) {
            result.__cdata = result["#cdata-section"];
            delete result["#cdata-section"];
            delete result["#cdata-section_asArray"];
        }

        if (result.__text !== null || result.__cdata !== null) {
            result.toString = function () {
                return (exports.__text !== null ? exports.__text : '') + (exports.__cdata !== null ? exports.__cdata : '');
            };
        }
        return result;
    }
    else
    if (node.nodeType == DOMNodeTypes.TEXT_NODE || node.nodeType == DOMNodeTypes.CDATA_SECTION_NODE) {
        return node.nodeValue;
    }
}

function startTag(jsonObj, element, attrList, closed) {
    var resultStr = "<" + ((jsonObj !== null && jsonObj.__prefix !== null) ? (jsonObj.__prefix + ":") : "") + element;
    if (attrList !== null) {
        for (var aidx = 0; aidx < attrList.length; aidx++) {
            var attrName = attrList[aidx];
            var attrVal = jsonObj[attrName];
            resultStr += " " + attrName.substr(1) + "='" + attrVal + "'";
        }
    }
    if (!closed)
        resultStr += ">";
    else
        resultStr += "/>";
    return resultStr;
}

function endTag(jsonObj, elementName) {
    return "</" + (jsonObj.__prefix !== null ? (jsonObj.__prefix + ":") : "") + elementName + ">";
}

function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function jsonXmlSpecialElem(jsonObj, jsonObjField) {
    if (endsWith(jsonObjField.toString(), ("_asArray"))
        || jsonObjField.toString().indexOf("_") === 0
        || (jsonObj[jsonObjField] instanceof Function))
        return true;
    else
        return false;
}

function jsonXmlElemCount(jsonObj) {
    var elementsCnt = 0;
    if (jsonObj instanceof Object) {
        for (var it in jsonObj) {
            if (jsonXmlSpecialElem(jsonObj, it))
                continue;
            elementsCnt++;
        }
    }
    return elementsCnt;
}

function parseJSONAttributes(jsonObj) {
    var attrList = [];
    if (jsonObj instanceof Object) {
        for (var ait in jsonObj) {
            if (ait.toString().indexOf("__") == -1 && ait.toString().indexOf("_") === 0) {
                attrList.push(ait);
            }
        }
    }
    return attrList;
}

function parseJSONTextAttrs(jsonTxtObj) {
    var result = "";

    if (jsonTxtObj.__cdata !== null) {
        result += "<![CDATA[" + jsonTxtObj.__cdata + "]]>";
    }

    if (jsonTxtObj.__text !== null) {
        if (escapeMode)
            result += escapeXmlChars(jsonTxtObj.__text);
        else
            result += jsonTxtObj.__text;
    }
    return result;
}

function parseJSONTextObject(jsonTxtObj) {
    var result = "";

    if (jsonTxtObj instanceof Object) {
        result += parseJSONTextAttrs(jsonTxtObj);
    }
    else
    if (jsonTxtObj !== null) {
        if (escapeMode)
            result += escapeXmlChars(jsonTxtObj);
        else
            result += jsonTxtObj;
    }

    return result;
}

function parseJSONArray(jsonArrRoot, jsonArrObj, attrList) {
    var result = "";
    if (jsonArrRoot.length === 0) {
        result += startTag(jsonArrRoot, jsonArrObj, attrList, true);
    }
    else {
        for (var arIdx = 0; arIdx < jsonArrRoot.length; arIdx++) {
            result += startTag(jsonArrRoot[arIdx], jsonArrObj, parseJSONAttributes(jsonArrRoot[arIdx]), false);
            result += parseJSONObject(jsonArrRoot[arIdx]);
            result += endTag(jsonArrRoot[arIdx], jsonArrObj);
        }
    }
    return result;
}

function parseJSONObject(jsonObj) {
    var result = "";

    var elementsCnt = jsonXmlElemCount(jsonObj);

    if (elementsCnt > 0) {
        for (var it in jsonObj) {

            if (jsonXmlSpecialElem(jsonObj, it))
                continue;

            var subObj = jsonObj[it];

            var attrList = parseJSONAttributes(subObj);

            if (subObj === null || subObj === undefined) {
                result += startTag(subObj, it, attrList, true);
            }
            else
            if (subObj instanceof Object) {

                if (subObj instanceof Array) {
                    result += parseJSONArray(subObj, it, attrList);
                }
                else {
                    var subObjElementsCnt = jsonXmlElemCount(subObj);
                    if (subObjElementsCnt > 0 || subObj.__text !== null || subObj.__cdata !== null) {
                        result += startTag(subObj, it, attrList, false);
                        result += parseJSONObject(subObj);
                        result += endTag(subObj, it);
                    }
                    else {
                        result += startTag(subObj, it, attrList, true);
                    }
                }
            }
            else {
                result += startTag(subObj, it, attrList, false);
                result += parseJSONTextObject(subObj);
                result += endTag(subObj, it);
            }
        }
    }
    result += parseJSONTextObject(jsonObj);

    return result;
}

exports.parseXmlString = function (xmlDocStr) {
    var xmlDoc;
    var parser = new window.DOMParser();
    xmlDoc = parser.parseFromString(xmlDocStr, "text/xml");
    return xmlDoc;
};

exports.element2json = function (xmlDoc) {
    return parseDOMChildren(xmlDoc);
};

exports.xml2json = function (xmlDocStr) {
    var xmlDoc = exports.parseXmlString(xmlDocStr);
    return exports.element2json(xmlDoc);
};

exports.json2xml = function (jsonObj, root) {
    if (root === undefined) root = 'root';
    if (root) {
        return '<' + root + '>' + parseJSONObject(jsonObj) + '</' + root + '>';
    }
    else {
        return parseJSONObject(jsonObj);
    }
};

Object.defineProperty(exports, "escape", {
    get: function() {
        return escapeMode;
    },
    set: function (enabled) {
        escapeMode = enabled;
    },
});

exports.base64 = function (str) {
    if (str === undefined || str === null) {
        return "";
    }
    var BASE64_ENCODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    /*jshint maxstatements:30 */
    var out = "", i = 0, len = str.length, c1, c2, c3;
    while (i < len) {
        c1 = str.charCodeAt(i++) & 0xff;
        if (i === len) {
            out += BASE64_ENCODE_CHARS.charAt(c1 >> 2);
            out += BASE64_ENCODE_CHARS.charAt((c1 & 0x3) << 4);
            out += "==";
            break;
        }
        c2 = str.charCodeAt(i++);
        if (i === len) {
            out += BASE64_ENCODE_CHARS.charAt(c1 >> 2);
            out += BASE64_ENCODE_CHARS.charAt(((c1 & 0x3)<< 4) | ((c2 & 0xF0) >> 4));
            out += BASE64_ENCODE_CHARS.charAt((c2 & 0xF) << 2);
            out += "=";
            break;
        }
        c3 = str.charCodeAt(i++);
        out += BASE64_ENCODE_CHARS.charAt(c1 >> 2);
        out += BASE64_ENCODE_CHARS.charAt(((c1 & 0x3) << 4) | ((c2 & 0xF0) >> 4));
        out += BASE64_ENCODE_CHARS.charAt(((c2 & 0xF) << 2) | ((c3 & 0xC0) >> 6));
        out += BASE64_ENCODE_CHARS.charAt(c3 & 0x3F);
    }
    return out;
};

exports.json2base64 = function (jsonObj) {
    var obj = (typeof(jsonObj) === 'object') ? jsonObj : JSON.parse(jsonObj);
    var t = detectType(obj);
    var result = '';
    if (t === 'array') {
        for (var i = 0; i < obj.length; i++) {
            result += exports.json2base64(obj[i]) + '\r\n';
        }
        return result;
    }
    else if (t === 'object') {
        var isFirst = true;
        for (var n in obj) {
            if (isFirst) {
                result = exports.base64(obj[n]);
            }
            else {
                result += '|' + exports.base64(obj[n]);
            }
            isFirst = false;
        }
        return result;
    }
    else if (t === 'string') {
        return exports.base64(obj);
    }
};

/***** ivan > *****/