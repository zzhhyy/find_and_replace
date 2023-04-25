function replaceText(text, find, regex, findRegex, replace) {
    if (text == null) {
        return null;
    }
    let findResult = null;
    if (regex) {
        findResult = findRegex.exec(text);
    } else {
        if (text.indexOf(find) != -1) {
            findResult = new Array();
            findResult.push(find);
        }
    }
    if ((findResult == null) || (findResult.length == 0)) {
        return null;
    }
    let realReplace = replace;
    for (let k = 0; k < findResult.length; k++) {
        let param = '$' + k;
        if (realReplace.indexOf(param) != -1) {
            realReplace = realReplace.replaceAll(param, findResult[k]);
        }
    }
    let result = new Array();
    result.push(findResult[0]);
    result.push(realReplace);
    return result;
}

function replaceElementText(find, regex, replace) {
    let elements = document.body.getElementsByTagName('*');
    const findRegex = new RegExp(find, 'm');
    for (let i = 0; i < elements.length; i++) {
        let element = elements[i];
        const tagName = element.tagName.toLowerCase();
        if ((tagName == "script") || (tagName == "style") || (tagName == "img")) {
            continue;
        }
        if (element.childNodes.length > 0) {
            for (let j = 0; j < element.childNodes.length; j++) {
                let node = element.childNodes[j];
                if (node.nodeType === Node.TEXT_NODE) {
                    let text = node.nodeValue;
                    let result = replaceText(text, find, regex, findRegex, replace);
                    if (result == null) {
                        continue;
                    }
                    if (text.indexOf(result[1]) == -1) {
                        let newText = text.replaceAll(result[0], result[1]);
                        element.replaceChild(document.createTextNode(newText), node);
                    }
                }
            }
        } else if (element.tagName.toLowerCase() == "input") {
            let text = element.value;
            let result = replaceText(text, find, regex, findRegex, replace);
            if (result == null) {
                continue;
            }
            if (text.indexOf(result[1]) == -1) {
                let newText = text.replaceAll(result[0], result[1]);
                element.value = newText;
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
                    replaceElementText(key, value.regex, value.replace);
                }
                repeatReplace(times + 1);
            });
        }, times * 1000);
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
                    replaceElementText(key, value.regex, value.replace);
                }
                chrome.storage.local.remove("cmd");
            });
        }
    });
}

main()