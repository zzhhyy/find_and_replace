if (typeof originNodeValues === "undefined") {
  originNodeValues = new Map();
}

if (typeof executedNodeValues === "undefined") {
  executedNodeValues = new Map();
}

function GetXPath(node) {
  if (node.id) {
    return '//*[@id="' + node.id + '"]';
  }
  if (node === document.body) {
    return "/html/body";
  }
  let ix = 0;
  const siblings = node.parentNode.childNodes;
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    if (sibling === node) {
      return GetXPath(node.parentNode) + "/" + node.tagName + "[" + (ix + 1) + "]";
    }
    if (sibling.nodeType === 1 && sibling.tagName === node.tagName) {
      ix++;
    }
  }
}

function GetReplacedText(text, find, findRegex, replace) {
  if (text == null) {
    return null;
  }
  findRegex.lastIndex = 0;
  const findResult = findRegex.exec(text);
  if (findResult == null) {
    return null;
  }
  let realReplace = replace;
  for (let k = 0; k < findResult.length; k++) {
    const param = "$" + k;
    realReplace = realReplace.replaceAll(param, findResult[k]);
  }
  const index = findResult.index + findResult[0].length;
  const firstPart = text.substring(0, index);
  const secondPart = text.substring(index);
  const firstResult = firstPart.substring(0, findResult.index) + realReplace + firstPart.substring(index);
  const secondResult = GetReplacedText(secondPart, find, findRegex, replace) ?? secondPart;
  return firstResult + secondResult;
}

function DoTaskForElements(rootNode, find, findRegex, replace, check, highlight) {
  const elements = rootNode.querySelectorAll("*");
  let findCount = 0;
  for (const element of elements) {
    const tagName = element.tagName.toLowerCase();
    const exceptTagName = new Set(["head", "script", "style", "meta", "img", "link", "iframe", "title", "noscript", "base", "header", "nav", "article"]);
    if (exceptTagName.has(tagName)) {
      continue;
    }
    const visible = element.offsetWidth > 0 && element.offsetHeight > 0 && getComputedStyle(element).visibility == "visible";
    if (!visible) {
      continue;
    }
    if (tagName == "input" || tagName == "textarea") {
      const text = element.value;
      const result = GetReplacedText(text, find, findRegex, replace);
      if (result == null || result == text) {
        continue;
      }
      findCount = findCount + 1;
      if (highlight) {
        //do nothing
      } else if (check) {
        //do nothing
      } else {
        const path = GetXPath(element);
        if (!originNodeValues.has(path)) {
          originNodeValues.set(path, { node: element, value: text });
        }
        const ruleKey = find + replace;
        if (executedNodeValues.get(ruleKey).get(path) != text) {
          executedNodeValues.get(ruleKey).set(path, result);
          element.value = result;
        }
      }
    } else if (element.childNodes.length > 0) {
      for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.nodeValue;
          const result = GetReplacedText(text, find, findRegex, replace);
          if (result == null || result == text) {
            continue;
          }
          findCount = findCount + 1;
          if (highlight) {
            const html = element.innerHTML;
            const newHtml = html.replace(findRegex, match => `<span class="class_hl_find_and_replace" style="background-color:yellow">${match}</span>`);
            element.innerHTML = newHtml;
            break;
          } else if (check) {
            // do nothing
          } else {
            const path = GetXPath(node);
            if (!originNodeValues.has(path)) {
              originNodeValues.set(path, { node: node, value: text });
            }
            const ruleKey = find + replace;
            if (executedNodeValues.get(ruleKey).get(path) != text) {
              executedNodeValues.get(ruleKey).set(path, result);
              node.nodeValue = result;
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

function FindTextAndDo(find, value, check, highlight) {
  const ruleKey = find + value.replace;
  if (!executedNodeValues.has(ruleKey)) {
    executedNodeValues.set(ruleKey, new Map());
  }
  let findRegex = null;
  try {
    const escapeFind = value.regex === true ? find : find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const targetFind = value.wholeWord === true ? `\\b${escapeFind}\\b` : escapeFind;
    const mode = value.ignoreCase === true ? "gi" : "g";
    findRegex = new RegExp(targetFind, mode);
  } catch (e) {
    return 0;
  }
  return DoTaskForElements(document.body, find, findRegex, value.replace, check, highlight);
}

function RepeatReplace(times) {
  if (times <= 4) {
    setTimeout(async function () {
      const runRule = rules => {
        for (const [find, value] of Object.entries(rules)) {
          if (value.domain != null && value.domain != window.location.host) {
            continue;
          }
          if (value.runtype != "Auto") {
            continue;
          }
          if (value.disabled == true) {
            continue;
          }
          FindTextAndDo(find, value, false, false);
        }
      };

      const syncRules = await chrome.storage.sync.get(null);
      for (const rules of Object.values(syncRules)) {
        runRule(rules);
      }

      const localResult = await chrome.storage.local.get(["local"]);
      const localRules = localResult["local"] ?? {};
      for (const rules of Object.values(localRules)) {
        runRule(rules);
      }

      RepeatReplace(times + 1);
    }, times * 1000);
  }
}

function RealtimeReplace() {
  setTimeout(async function () {
    const runRule = rules => {
      for (const [find, value] of Object.entries(rules)) {
        if (value.domain != null && value.domain != window.location.host) {
          continue;
        }
        if (value.runtype != "Realtime") {
          continue;
        }
        if (value.disabled == true) {
          continue;
        }
        FindTextAndDo(find, value, false, false);
      }
    };

    const syncRules = await chrome.storage.sync.get(null);
    for (const rules of Object.values(syncRules)) {
      runRule(rules);
    }

    const localResult = await chrome.storage.local.get(["local"]);
    const localRules = localResult["local"] ?? {};
    for (const rules of Object.values(localRules)) {
      runRule(rules);
    }

    RealtimeReplace();
  }, 1500);
}

async function main() {
  // commands
  const kRunRule = "run_rule";
  const kRunTest = "run_test";
  const kRunCheck = "run_check";
  const kHighLight = "run_highlight";
  const kRunRecover = "run_recover";

  const kCmd = "cmd";
  const kTmp = "tmp";

  const result = await chrome.storage.local.get([kCmd]);

  // Run automatic and realtime rules on first load
  if (!result.hasOwnProperty(kCmd)) {
    RepeatReplace(1);
    RealtimeReplace();
    return;
  }

  RemoveHighLightElements();
  chrome.storage.local.remove(kCmd);
  const cmd = result[kCmd];
  if (cmd.type == kRunRule) {
    let replaceCount = 0;

    const runRule = (result, cmdGroup, cmdFind) => {
      if (cmdGroup == null) {
        for (const rules of Object.values(result)) {
          for (const [find, value] of Object.entries(rules)) {
            if (value.domain != null && value.domain != window.location.host) {
              continue;
            }
            if (value.disabled == true) {
              continue;
            }
            replaceCount = replaceCount + FindTextAndDo(find, value, false, false);
          }
        }
      } else {
        if (cmdFind == null) {
          for (const [find, value] of Object.entries(result)) {
            if (value.domain != null && value.domain != window.location.host) {
              continue;
            }
            if (value.disabled == true) {
              continue;
            }
            replaceCount = replaceCount + FindTextAndDo(find, value, false, false);
          }
        } else {
          const value = result[cmdFind];
          if (!value) {
            return;
          }
          if (value.domain != null && value.domain != window.location.host) {
            return;
          }
          if (value.disabled == true) {
            return;
          }
          replaceCount = replaceCount + FindTextAndDo(cmdFind, value, false, false);
        }
      }
    };

    const syncRules = await chrome.storage.sync.get(cmd.group);
    runRule(cmd.group == null ? syncRules : syncRules[cmd.group], cmd.group, cmd.find);

    const localResult = await chrome.storage.local.get(["local"]);
    const localRules = localResult["local"] ?? {};
    runRule(cmd.group == null ? localRules : localRules[cmd.group] ?? {}, cmd.group, cmd.find);

    chrome.runtime.sendMessage({ replaceCount: replaceCount });
  } else if (cmd.type == kRunTest) {
    const result = await chrome.storage.local.get([kTmp]);
    const rule = result[kTmp];
    if (rule == null || rule.valid == false) {
      return;
    }
    const value = rule.value;
    if (value.domain != null && value.domain != window.location.host) {
      return;
    }
    FindTextAndDo(rule.find, value, false, false);
  } else if (cmd.type == kRunCheck) {
    const result = await chrome.storage.local.get([kTmp]);
    const rule = result[kTmp];
    let findCount = 0;
    if (rule && rule.valid != false) {
      const value = rule.value;
      if (value.domain == null || value.domain == window.location.host) {
        findCount = FindTextAndDo(rule.find, value, true, false);
      }
    }
    chrome.runtime.sendMessage({ findCount: findCount });
  } else if (cmd.type == kHighLight) {
    const result = await chrome.storage.local.get([kTmp]);
    const rule = result[kTmp];
    if (rule == null || rule.valid == false) {
      return;
    }
    const value = rule.value;
    if (value.domain != null && value.domain != window.location.host) {
      return;
    }
    FindTextAndDo(rule.find, value, false, true);
  } else if (cmd.type == kRunRecover) {
    for (let value of originNodeValues.values()) {
      if (value.node.nodeType === Node.TEXT_NODE) {
        value.node.nodeValue = value.value;
      } else {
        value.node.value = value.value;
      }
    }
  }
}

main();
