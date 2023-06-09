function GetReplaceResult(text, find, findRegex, replace) {
  if (text == null) {
    return null;
  }
  let findResult = null;
  if (findRegex) {
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

function DoTaskForElements(rootNode, find, findRegex, replace, check, highlight) {
  const elements = rootNode.querySelectorAll("*");
  let findCount = 0;
  for (const element of elements) {
    const tagName = element.tagName.toLowerCase();
    if (tagName == "script" || tagName == "style" || tagName == "img") {
      continue;
    }
    const visible =
      element.offsetWidth > 0 && element.offsetHeight > 0 && getComputedStyle(element).visibility == "visible";
    if (!visible) {
      continue;
    }
    if (tagName == "input" || tagName == "textarea") {
      const text = element.value;
      const result = GetReplaceResult(text, find, findRegex, replace);
      if (result == null) {
        continue;
      }
      if (replace == result[1] || text.indexOf(result[1]) == -1) {
        findCount = findCount + 1;
        if (highlight) {
          //do nothing
        } else if (check) {
          //do nothing
        } else {
          const newText = text.replaceAll(result[0], result[1]);
          element.value = newText;
        }
      }
    } else if (element.childNodes.length > 0) {
      for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.nodeValue;
          const result = GetReplaceResult(text, find, findRegex, replace);
          if (result == null) {
            continue;
          }
          if (replace == result[1] || text.indexOf(result[1]) == -1) {
            findCount = findCount + 1;
            if (highlight) {
              const html = element.innerHTML;
              const newHtml = html.replaceAll(
                result[0],
                `<span class="class_hl_find_and_replace" style="background-color:yellow">${result[0]}</span>`
              );
              element.innerHTML = newHtml;
              break;
            } else if (check) {
              // do nothing
            } else {
              const newText = text.replaceAll(result[0], result[1]);
              element.replaceChild(document.createTextNode(newText), node);
            }
          }
        }
      }
    }
    if (element.shadowRoot) {
      findCount = findCount + DoTaskForElements(element.shadowRoot, find, findRegex, replace, check, highlight);
    }
  }
  return findCount;
}

function RemoveHighLightElements() {
  while (true) {
    let hightLightElements = document.getElementsByClassName("class_hl_find_and_replace");
    if (hightLightElements.length == 0) {
      break;
    }
    for (const element of hightLightElements) {
      const parentNode = element.parentNode;
      parentNode.replaceChild(element.firstChild, element);
      parentNode.normalize();
    }
  }
}

function FindTextAndDo(find, regex, replace, check, highlight) {
  let findRegex = null;
  if (regex) {
    try {
      findRegex = new RegExp(find, "m");
    } catch (e) {
      return 0;
    }
  }
  return DoTaskForElements(document.body, find, findRegex, replace, check, highlight);
}

function RepeatReplace(times) {
  if (times <= 4) {
    setTimeout(function () {
      chrome.storage.sync.get(null, function (result) {
        for (const rules of Object.values(result)) {
          for (const [find, value] of Object.entries(rules)) {
            if (value.domain != null && value.domain != window.location.host) {
              continue;
            }
            if (value.runtype == "Manual") {
              continue;
            }
            FindTextAndDo(find, value.regex, value.replace, false, false);
          }
        }
        RepeatReplace(times + 1);
      });
    }, times * 1000);
  }
}

function main() {
  // commands
  const kRunRule = "run_rule";
  const kRunTest = "run_test";
  const kRunCheck = "run_check";
  const kHighLight = "run_highlight";

  const kCmd = "cmd";
  const kTmp = "tmp";

  chrome.storage.local.get([kCmd], function (result) {
    if (result[kCmd] == null) {
      RepeatReplace(1);
    } else {
      RemoveHighLightElements();
      chrome.storage.local.remove(kCmd);
      const cmd = result[kCmd];
      if (cmd.type == kRunRule) {
        chrome.storage.sync.get(cmd.group, function (result) {
          let replaceCount = 0;
          for (const rules of Object.values(result)) {
            if (cmd.find == null) {
              for (const [find, value] of Object.entries(rules)) {
                if (value.domain != null && value.domain != window.location.host) {
                  continue;
                }
                replaceCount = replaceCount + FindTextAndDo(find, value.regex, value.replace, false, false);
              }
            } else {
              const find = cmd.find;
              const value = rules[find];
              if (value.domain != null && value.domain != window.location.host) {
                continue;
              }
              replaceCount = replaceCount + FindTextAndDo(find, value.regex, value.replace, false, false);
              break;
            }
          }
          chrome.runtime.sendMessage({ replaceCount: replaceCount });
        });
      } else if (cmd.type == kRunTest) {
        chrome.storage.local.get([kTmp], function (result) {
          const rule = result[kTmp];
          if (rule == null || rule.valid == false) {
            return;
          }
          const value = rule.value;
          if (value.domain != null && value.domain != window.location.host) {
            return;
          }
          FindTextAndDo(rule.find, value.regex, value.replace, false, false);
        });
      } else if (cmd.type == kRunCheck) {
        chrome.storage.local.get([kTmp], function (result) {
          const rule = result[kTmp];
          let findCount = 0;
          if (rule == null || rule.valid == false) {
            findCount = 0;
          } else {
            const value = rule.value;
            if (value.domain != null && value.domain != window.location.host) {
              findCount = 0;
            } else {
              findCount = FindTextAndDo(rule.find, value.regex, value.replace, true, false);
            }
          }
          chrome.runtime.sendMessage({ findCount: findCount });
        });
      } else if (cmd.type == kHighLight) {
        chrome.storage.local.get([kTmp], function (result) {
          const rule = result[kTmp];
          if (rule == null || rule.valid == false) {
            return;
          }
          const value = rule.value;
          if (value.domain != null && value.domain != window.location.host) {
            return;
          }
          FindTextAndDo(rule.find, value.regex, value.replace, false, true);
        });
      }
    }
  });
}

main();
