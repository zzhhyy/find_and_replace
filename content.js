function replaceText(find, replace) {
    let elements = document.body.getElementsByTagName('*');
    for (let i = 0; i < elements.length; i++) {
        let element = elements[i];
        if ((element.tagName == "script") || (element.tagName == "style")) {
            continue;
        }
        if (element.childNodes.length > 0) {
            for (let j = 0; j < element.childNodes.length; j++) {
                let node = element.childNodes[j];
                if (node.nodeType === Node.TEXT_NODE) {
                    let findResult = new Array();
                    let text = node.nodeValue;
                    if (text.indexOf(find) !== -1) {
                        findResult.push(find);
                        let realReplace = replace;
                        for (let k = 0; k < findResult.length; k++) {
                            let param = '$' + k;
                            if (realReplace.indexOf(param) !== -1) {
                                realReplace = replace.replaceAll(param, findResult[k]);
                            }
                        }
                        let newText = text.replaceAll(find, realReplace);
                        if (text.indexOf(realReplace) == -1) {
                            element.replaceChild(document.createTextNode(newText), node);
                        }
                    }
                }
            }
        } else if (element.tagName.toLowerCase() == "input") {
            let findResult = new Array();
            let text = element.value;
            if ((text != null) && (text.indexOf(find) !== -1)) {
                findResult.push(find);
                let realReplace = replace;
                for (let k = 0; k < findResult.length; k++) {
                    let param = '$' + k;
                    if (realReplace.indexOf(param) !== -1) {
                        realReplace = replace.replaceAll(param, findResult[k]);
                    }
                }
                let newText = text.replaceAll(find, realReplace);
                if (text.indexOf(realReplace) == -1) {
                    element.value = newText;
                }
            }
        }
    }
}

function repeatReplace(times) {
    if (times <= 4) {
        setTimeout(function () {
            chrome.storage.sync.get(null, function (result) {
                for (let key in result) {
                    let value = result[key];
                    if ((value.domain != null) && (value.domain != window.location.host)) {
                        continue;
                    }
                    if (value.runtype == "Manual") {
                        continue;
                    }
                    replaceText(key, value.replace);
                }
                repeatReplace(times + 1);
            });
        }, 2000);
    }
}

function main() {
    chrome.storage.local.get("cmd", function (result) {
        if (result["cmd"] == null) {
            repeatReplace(1);
        } else {
            let value = result["cmd"];
            chrome.storage.sync.get(value.find, function (result) {
                for (let key in result) {
                    let value = result[key];
                    if ((value.domain != null) && (value.domain != window.location.host)) {
                        continue;
                    }
                    replaceText(key, value.replace);
                }
                chrome.storage.local.remove("cmd");
            });
        }
    });
}

main()