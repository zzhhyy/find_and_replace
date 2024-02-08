/*global chrome*/

import { CONTEXT_MENU_ID, SETTINGS } from "./constant";

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

export async function CreateContextMenu(turn_on_run_all, turn_on_run_group, turn_on_run_rule) {
  const localSettings = await chrome.storage.local.get(null);
  const rules = await chrome.storage.sync.get(null);
  if (localSettings[SETTINGS.CONTEXT_MENU.RUN_ALL] === true) {
    if (turn_on_run_all === false) {
      chrome.contextMenus.remove(CONTEXT_MENU_ID.RUN_ALL);
    }
    chrome.contextMenus.create({
      title: "Run all",
      contexts: ["all"],
      type: "normal",
      id: CONTEXT_MENU_ID.RUN_ALL,
    });
  }
  if (localSettings[SETTINGS.CONTEXT_MENU.RUN_GROUP] === true) {
    if (turn_on_run_group === false) {
      chrome.contextMenus.remove(CONTEXT_MENU_ID.RUN_GROUP);
    }
    let parent = chrome.contextMenus.create({
      title: "Run group",
      contexts: ["all"],
      type: "normal",
      id: CONTEXT_MENU_ID.RUN_GROUP,
    });
    for (const group of Object.keys(rules)) {
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
    if (turn_on_run_rule === false) {
      chrome.contextMenus.remove(CONTEXT_MENU_ID.RUN_RULE);
    }
    let parent = chrome.contextMenus.create({
      title: "Run rule",
      contexts: ["all"],
      type: "normal",
      id: CONTEXT_MENU_ID.RUN_RULE,
    });

    for (const [group, childRules] of Object.entries(rules)) {
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
