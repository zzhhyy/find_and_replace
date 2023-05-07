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
  if (findResult == null || findResult.length == 0) {
    return null;
  }
  let realReplace = replace;
  for (let k = 0; k < findResult.length; k++) {
    const param = "$" + k;
    if (realReplace.indexOf(param) != -1) {
      realReplace = realReplace.replaceAll(param, findResult[k]);
    }
  }
  let result = new Array();
  result.push(findResult[0]);
  result.push(realReplace);
  return result;
}

function replaceElementText(find, regex, replace, check) {
  const elements = document.body.getElementsByTagName("*");
  let findRegex = null;
  if (regex) {
    try {
      findRegex = new RegExp(find, "m");
    } catch (e) {
      return 0;
    }
  }
  let findCount = 0;
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    const tagName = element.tagName.toLowerCase();
    if (tagName == "script" || tagName == "style" || tagName == "img") {
      continue;
    }
    const visible = element.offsetWidth > 0 && element.offsetHeight > 0;
    if (!visible) {
      continue;
    }
    if (element.childNodes.length > 0) {
      for (let j = 0; j < element.childNodes.length; j++) {
        const node = element.childNodes[j];
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.nodeValue;
          const result = replaceText(text, find, regex, findRegex, replace);
          if (result == null) {
            continue;
          }
          if (replace == result[1] || text.indexOf(result[1]) == -1) {
            findCount = findCount + 1;
            if (check == false) {
              const newText = text.replaceAll(result[0], result[1]);
              element.replaceChild(document.createTextNode(newText), node);
            }
          }
        }
      }
    } else if (element.tagName.toLowerCase() == "input") {
      const text = element.value;
      const result = replaceText(text, find, regex, findRegex, replace);
      if (result == null) {
        continue;
      }
      if (replace == result[1] || text.indexOf(result[1]) == -1) {
        findCount = findCount + 1;
        if (check == false) {
          const newText = text.replaceAll(result[0], result[1]);
          element.value = newText;
        }
      }
    }
  }
  return findCount;
}

function repeatReplace(times) {
  if (times <= 4) {
    setTimeout(function () {
      chrome.storage.sync.get(null, function (result) {
        for (let key in result) {
          const value = result[key];
          if (value.domain != null && value.domain != window.location.host) {
            continue;
          }
          if (value.runtype == "Manual") {
            continue;
          }
          replaceElementText(key, value.regex, value.replace, false);
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
      chrome.storage.local.remove("cmd");
      const value = result["cmd"];
      if (value.type == "once") {
        chrome.storage.sync.get(value.find, function (result) {
          let replaceCount = 0;
          for (let key in result) {
            const value = result[key];
            if (value.domain != null && value.domain != window.location.host) {
              continue;
            }
            replaceCount =
              replaceCount +
              replaceElementText(key, value.regex, value.replace, false);
          }
          chrome.runtime.sendMessage({ replaceCount: replaceCount });
        });
      } else if (value.type == "test") {
        chrome.storage.local.get("tmp", function (result) {
          const rule = result["tmp"];
          if (rule == null || rule.valid == false) {
            return;
          }
          const value = rule.value;
          if (value.domain != null && value.domain != window.location.host) {
            return;
          }
          replaceElementText(rule.key, value.regex, value.replace, false);
        });
      } else if (value.type == "check") {
        chrome.storage.local.get("tmp", function (result) {
          const rule = result["tmp"];
          let findCount = 0;
          if (rule == null || rule.valid == false) {
            findCount = 0;
          } else {
            const value = rule.value;
            if (value.domain != null && value.domain != window.location.host) {
              findCount = 0;
            } else {
              findCount = replaceElementText(
                rule.key,
                value.regex,
                value.replace,
                true
              );
            }
          }
          chrome.runtime.sendMessage({ findCount: findCount });
        });
      }
    }
  });
}

main();
