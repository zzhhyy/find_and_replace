/*global chrome*/

import { Command, CONTEXT_MENU_ID, KEY, Profile, SERVER_URL, SETTINGS } from "./constant";

export function CutString(str, len) {
  let str_length = 0;
  let str_cut = "";
  for (let i = 0; i < str.length; i++) {
    let a = str.charAt(i);
    str_length++;
    if (a.length > 1) {
      str_length++;
    }
    str_cut = str_cut.concat(a);
    if (str_length >= len) {
      str_cut = str_cut.concat("...");
      return str_cut;
    }
  }
  if (str_length < len) {
    return str;
  }
}

export function RunCommand(command, group, find, runBefore, runAfter) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0].url.startsWith("chrome://") || tabs[0].url.startsWith("edge://")) {
      return;
    }
    chrome.storage.local.set({ cmd: { type: command, group: group, find: find } }, function () {
      if (runBefore) {
        runBefore();
      }
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id, allFrames: true },
        files: ["content.js"],
      });
      if (runAfter) {
        runAfter();
      }
    });
  });
}

export function IsChrome() {
  return !navigator.userAgent.includes("Edg");
}

export function IsSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent) && /apple/i.test(navigator.vendor);
}

export async function CreateContextMenu() {
  const localSettings = await chrome.storage.local.get(null);
  const localResult = await chrome.storage.local.get([KEY.LOCAL]);
  const localRules = localResult[KEY.LOCAL] ?? {};
  chrome.contextMenus.removeAll();
  if (localSettings[SETTINGS.CONTEXT_MENU.RUN_ALL] === true) {
    chrome.contextMenus.create({
      title: "Run all",
      contexts: ["all"],
      type: "normal",
      id: CONTEXT_MENU_ID.RUN_ALL,
    });
  }
  if (localSettings[SETTINGS.CONTEXT_MENU.RUN_GROUP] === true) {
    let parent = chrome.contextMenus.create({
      title: "Run group",
      contexts: ["all"],
      type: "normal",
      id: CONTEXT_MENU_ID.RUN_GROUP,
    });

    for (const group of Object.keys(localRules)) {
      if (group.length > 0) {
        chrome.contextMenus.create({
          title: "Group " + group,
          contexts: ["all"],
          type: "normal",
          id: CONTEXT_MENU_ID.RUN_GROUP + "\\n" + group,
          parentId: parent,
        });
      }
    }
  }
  if (localSettings[SETTINGS.CONTEXT_MENU.RUN_RULE] === true) {
    let parent = chrome.contextMenus.create({
      title: "Run rule",
      contexts: ["all"],
      type: "normal",
      id: CONTEXT_MENU_ID.RUN_RULE,
    });

    for (const [group, childRules] of Object.entries(localRules)) {
      let secondParent = parent;
      if (group !== "") {
        secondParent = chrome.contextMenus.create({
          title: "Group " + group,
          contexts: ["all"],
          type: "normal",
          id: CONTEXT_MENU_ID.RUN_RULE + "\\n" + group,
          parentId: parent,
        });
      }
      for (const find in childRules) {
        chrome.contextMenus.create({
          title: "Rule " + find,
          contexts: ["all"],
          type: "normal",
          id: CONTEXT_MENU_ID.RUN_RULE + "\\n" + group + "\\n" + find,
          parentId: secondParent,
        });
      }
    }
  }
}

let internalIsFirstRun = null;
export function IsFirstRun() {
  if (internalIsFirstRun == null) {
    internalIsFirstRun = localStorage.getItem("first_run") == null;
    if (internalIsFirstRun) {
      localStorage.setItem("first_run", "inited");
    }
  }
  return internalIsFirstRun;
}

export async function UpdateRule(addRule, removeRule) {
  const id = (await chrome.storage.local.get([Profile.ID]))[Profile.ID];
  const token = (await chrome.storage.local.get([Profile.TOKEN]))[Profile.TOKEN];
  if (!id || !token) {
    return;
  }
  let actions = [];
  for (const group in addRule) {
    for (const find in addRule[group]) {
      actions.push({ type: "add", group: group, find: find, rule: addRule[group][find] });
    }
  }
  for (const group in removeRule) {
    for (const find in removeRule[group]) {
      actions.push({ type: "remove", group: group, find: find });
    }
  }

  await fetch(SERVER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cmd: Command.UPDATE_RULE, email: id, token: token, actions: JSON.stringify(actions) }),
  });
}

export async function GetRule() {
  const id = (await chrome.storage.local.get([Profile.ID]))[Profile.ID];
  const token = (await chrome.storage.local.get([Profile.TOKEN]))[Profile.TOKEN];
  const time = (await chrome.storage.local.get([Profile.TIME]))[Profile.TIME];
  if (!id || !token) {
    return;
  }
  await fetch(SERVER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cmd: Command.GET_RULE, email: id, token: token, time: time }),
  })
    .then(response => response.json())
    .then(data => {
      if (data.rules) {
        chrome.storage.local.set({ [KEY.LOCAL]: JSON.parse(data.rules), [Profile.TIME]: data.time }, function () {
          CreateContextMenu();
        });
      }
    });
}
