/*global chrome*/

export const KEY = {
  TMP: "tmp",
  EDIT_MODE: "edit_mode",
};

export const CMD = {
  RUN_RULE: "run_rule",
  RUN_TEST: "run_test",
  RUN_CHECK: "run_check",
  RUN_HIGHLIGHT: "run_highlight",
  CLEAR_HIGHLIGHT: "clear_highlight",
};

export function RunCommand(command, group, find, runBefore, runAfter) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
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
