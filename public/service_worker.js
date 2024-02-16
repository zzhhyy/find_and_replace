chrome.runtime.onInstalled.addListener(details => {
  if (details.reason === chrome.runtime.OnInstalledReason.UPDATE) {
    chrome.storage.local.get(["settings.general.open_mode"], result => {
      if (result["settings.general.open_mode"] === "pop_up") {
        chrome.action.setPopup({ popup: "index.html" });
      }
    });
    CreateContextMenu(true, true, true);
  }
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(["settings.general.open_mode"], result => {
    if (result["settings.general.open_mode"] === "pop_up") {
      chrome.action.setPopup({ popup: "index.html" });
    }
  });
});

chrome.action.onClicked.addListener(tab => {
  chrome.storage.local.get(["settings.general.open_mode"], result => {
    if (result["settings.general.open_mode"] !== "pop_up") {
      chrome.sidePanel.open({ windowId: tab.windowId });
    } else {
      chrome.action.setPopup({ popup: "index.html" });
    }
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) {
    return;
  }

  const menuIfo = info.menuItemId.split("\\n");
  let group, find;
  if (menuIfo[0] === "run_all") {
    group = null;
    find = null;
  } else if (menuIfo[0] === "run_group") {
    group = menuIfo[1];
    find = null;
  } else if (menuIfo[0] === "run_rule") {
    group = menuIfo[1];
    find = menuIfo[2];
  } else {
    return;
  }

  chrome.storage.local.set({ cmd: { type: "run_rule", group: group, find: find } }, () => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["content.js"],
    });
  });
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://")) {
    return;
  }

  let group;
  const value = (await chrome.storage.local.get(command))[command];
  if (value === undefined) {
    return;
  }
  const colonIndex = value.indexOf(":");
  if (colonIndex === -1) {
    return;
  }
  const type = value.substring(0, colonIndex);
  if (type === "cmd") {
    group = null;
  } else {
    group = value.substring(colonIndex + 1);
  }
  chrome.storage.local.set({ cmd: { type: "run_rule", group: group, find: null } }, () => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      files: ["content.js"],
    });
  });
});

/* copy from utils.js/CreateContextMenu */
const SETTINGS = {
  GENERAL: { OPEN_MODE: "settings.general.open_mode" },
  CONTEXT_MENU: {
    RUN_ALL: "settings.context_menu.run_all",
    RUN_GROUP: "settings.context_menu.run_group",
    RUN_RULE: "settings.context_menu.run_rul",
  },
  KEYBOARD_SHORTCUT: {
    CMD1: "settings.keyboard_shortcut.cmd1",
    CMD2: "settings.keyboard_shortcut.cmd2",
    CMD3: "settings.keyboard_shortcut.cmd3",
    CMD4: "settings.keyboard_shortcut.cmd4",
  },
};

const CONTEXT_MENU_ID = {
  RUN_ALL: "run_all",
  RUN_GROUP: "run_group",
  RUN_RULE: "run_rule",
};

async function CreateContextMenu(turn_on_run_all, turn_on_run_group, turn_on_run_rule) {
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
