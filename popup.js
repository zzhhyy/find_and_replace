//* constants start */

const kTmp = "tmp";
const kEditMode = "edit_mode";

// commands
const kRunRule = "run_rule";
const kRunTest = "run_test";
const kRunCheck = "run_check";

/* constants end */

/* global vars start */

var g_rule_index = 0; // auto increase every time updateRulesTable, ensure that the ID of the showing rule is unique
var g_edit_mode = false;
var g_adding_rule = false;
var g_last_save_time = 0; // cursor away or click test will save tmp rule, record save time
var g_received_frames = new Set();
var g_find_count = 0;
var g_input_timer = null;
var g_replace_count = 0;
var g_current_group = "";

/* global vars end */

/* helper functions */
function cutString(str, len) {
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

/*
functions to process rules
*/
function showAddRuleBox(group, find, value) {
  if (value.domain == null) {
    document.getElementById("domains_checkbox").checked = true;
    document.getElementById("domains_text").value = "";
  } else {
    document.getElementById("domains_checkbox").checked = false;
    document.getElementById("domains_text").value = value.domain;
  }
  document.getElementById("find_text").value = find;
  if (value.regex == true) {
    document.getElementById("regex_checkbox").checked = true;
  } else {
    document.getElementById("regex_checkbox").checked = false;
  }
  document.getElementById("replace_text").value = value.replace;
  document.getElementById("group").value = group;
  document.getElementById("runtype_select").value = value.runtype;
  document.getElementById("add_rule_box").style.visibility = "visible";
  g_adding_rule = true;
  // update existing groups
  chrome.storage.sync.get(null, function (result) {
    let innerHTML = "";
    for (let group in result) {
      if (group.length > 0) {
        innerHTML = innerHTML + `<option>${group}</option>`;
      }
    }
    document.getElementById("groups").innerHTML = innerHTML;
  });
}

function hideAddRuleBox() {
  g_edit_mode = false;
  g_adding_rule = false;
  document.getElementById("add_rule_box").style.visibility = "hidden";
  chrome.storage.local.remove([kTmp]);
  chrome.storage.local.remove([kEditMode]);
}

function currentAddingRule() {
  let valid = true;
  let checked = document.getElementById("domains_checkbox").checked;
  let domain = null;
  if (!checked) {
    domain = document.getElementById("domains_text").value;
  }
  let find = document.getElementById("find_text").value.trim();
  if (find.length == 0) {
    valid = false;
  }
  let regex = document.getElementById("regex_checkbox").checked;
  let replace = document.getElementById("replace_text").value;
  let group = document.getElementById("group").value.trim();
  let runtype = document.getElementById("runtype_select").value;
  return {
    valid: valid,
    group: group,
    find: find,
    value: {
      domain: domain,
      regex: regex,
      replace: replace,
      runtype: runtype,
    },
  };
}

function saveTmpRule(force) {
  let current_time = Date.now();
  if (current_time - g_last_save_time < 3000 && force == false) {
    return;
  }
  g_last_save_time = current_time;
  let rule = currentAddingRule();
  chrome.storage.local.set({ [kTmp]: rule });
  chrome.storage.local.set({ [kEditMode]: g_edit_mode });
}

function updateFindCount() {
  clearTimeout(g_input_timer);
  g_input_timer = setTimeout(function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.storage.local.set(
        { cmd: { type: kRunCheck, group: null, find: null } },
        function () {
          g_received_frames.clear();
          g_find_count = 0;
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id, allFrames: true },
            files: ["content.js"],
          });
        }
      );
    });
  }, 1000);
}

function runRule(group, find) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.storage.local.set(
      { cmd: { type: kRunRule, group: group, find: find } },
      function () {
        g_received_frames.clear();
        g_replace_count = 0;
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id, allFrames: true },
          files: ["content.js"],
        });
      }
    );
  });
}

function editRule(group, find) {
  chrome.storage.sync.get([group], function (result) {
    const groupMap = result[group];
    const value = groupMap[find];
    g_edit_mode = true;
    showAddRuleBox(group, find, value);
    saveTmpRule(true);
    updateFindCount();
  });
}

function deleteRule(group, find) {
  if (
    confirm(
      `Are you sure you want to delete rule \"${find}\" at group \"${group}\"?`
    )
  ) {
    chrome.storage.sync.get([group], function (result) {
      let groupObj = result[group];
      delete groupObj[find];
      if (Object.keys(groupObj).length == 0) {
        chrome.storage.sync.remove([group]);
        updateRulesTable("");
      } else {
        chrome.storage.sync.set({ [group]: groupObj });
        updateRulesTable(group);
      }
    });
  }
}

function runGroup(group) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.storage.local.set(
      { cmd: { type: kRunRule, group: group, find: null } },
      function () {
        g_received_frames.clear();
        g_replace_count = 0;
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id, allFrames: true },
          files: ["content.js"],
        });
      }
    );
  });
}

function openGroup(group) {
  updateRulesTable(group);
}

function deleteGroup(group) {
  if (confirm(`Are you sure you want to delete group \"${group}\"?`)) {
    chrome.storage.sync.remove([group]);
    updateRulesTable("");
  }
}

function updateRulesTable(group) {
  g_current_group = group;
  let key = group;
  if (group == "") {
    key = null;
  }
  chrome.storage.sync.get(key, function (result) {
    let innerHtml = "";
    let ruleMap = new Map();
    let groupMap = new Map();

    // show groups
    if (group == "") {
      document.getElementById("go_back").style.visibility = "hidden";
      for (let ruleGroup in result) {
        if (ruleGroup.length > 0) {
          g_rule_index++;
          const runButton = "run_button_" + g_rule_index;
          const openButton = "open_button_" + g_rule_index;
          const deleteButton = "delete_button_" + g_rule_index;
          const display = cutString(ruleGroup, 32);
          groupMap.set(ruleGroup, {
            run: runButton,
            open: openButton,
            delete: deleteButton,
          });
          innerHtml =
            innerHtml +
            `<tr><td><img src=\"image/folder.png\"/></td><td>${display}</td><td><button id=\"${runButton}\" class=\"pure-button button-success\">Run</button></td><td><button id=\"${openButton}\" class=\"pure-button button-success\">Open</button></td><td><button id=\"${deleteButton}\" class=\"pure-button button-error\">Delete</button></td></tr>`;
        }
      }
    } else {
      document.getElementById("go_back").style.visibility = "visible";
    }

    for (let find in result[group]) {
      g_rule_index++;
      const runButton = "run_button_" + g_rule_index;
      const editButton = "edit_button_" + g_rule_index;
      const deleteButton = "delete_button_" + g_rule_index;
      const display = cutString(find, 32);
      ruleMap.set(find, {
        run: runButton,
        edit: editButton,
        delete: deleteButton,
      });
      innerHtml =
        innerHtml +
        `<tr><td><img src=\"image/document.png\"/></td><td>${display}</td><td><button id=\"${runButton}\" class=\"pure-button button-success\">Run</button></td><td><button id=\"${editButton}\" class=\"pure-button button-success\">Edit</button></td><td><button id=\"${deleteButton}\" class=\"pure-button button-error\">Delete</button></td></tr>`;
    }

    document.getElementById("rule_table").innerHTML = innerHtml;
    // add event lisenter after added to dom
    for (let [find, value] of ruleMap) {
      document
        .getElementById(value["run"])
        .addEventListener("click", function () {
          runRule(group, find);
        });
      document
        .getElementById(value["edit"])
        .addEventListener("click", function () {
          editRule(group, find);
        });
      document
        .getElementById(value["delete"])
        .addEventListener("click", function () {
          deleteRule(group, find);
        });
    }

    for (let [ruleGroup, value] of groupMap) {
      document
        .getElementById(value["run"])
        .addEventListener("click", function () {
          runGroup(ruleGroup);
        });

      document
        .getElementById(value["open"])
        .addEventListener("click", function () {
          openGroup(ruleGroup);
        });

      document
        .getElementById(value["delete"])
        .addEventListener("click", function () {
          deleteGroup(ruleGroup);
        });
    }
  });
  //  update usage
  chrome.storage.sync.getBytesInUse(null, function (result) {
    let percent = ((result * 100) / 102400).toFixed(2);
    if (percent > 100) {
      percent = 100;
    }
    document.getElementById("all_usage").innerText = `All usage : ${percent}%`;
  });
  chrome.storage.sync.getBytesInUse(group, function (result) {
    let percent = ((result * 100) / 8192).toFixed(2);
    if (percent > 100) {
      percent = 100;
    }
    const displayGroup = cutString(group, 32);
    document.getElementById(
      "group_usage"
    ).innerText = `Group ${displayGroup} usage : ${percent}%`;
  });
}

document.addEventListener("DOMContentLoaded", function () {
  updateRulesTable("");
  console.log(document.getElementById("header").style);
  document.getElementById("header_placeholder").style.height =
    document.getElementById("header").clientHeight;

  // add rule button
  document
    .getElementById("add_rule_button")
    .addEventListener("click", function () {
      showAddRuleBox(g_current_group, "", {
        domain: "",
        regex: false,
        replace: "",
        runtype: "Auto",
      });
      chrome.tabs.query(
        { active: true, lastFocusedWindow: true },
        function (tabs) {
          let url = tabs[0].url;
          let domain = new URL(url).hostname;
          document.getElementById("domains_text").value = domain;
        }
      );
    });

  // run all button
  document
    .getElementById("run_all_button")
    .addEventListener("click", function () {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.storage.local.set(
          { cmd: { type: kRunRule, group: null, find: null } },
          function () {
            g_received_frames.clear();
            g_replace_count = 0;
            chrome.scripting.executeScript({
              target: { tabId: tabs[0].id, allFrames: true },
              files: ["content.js"],
            });
          }
        );
      });
    });

  document.getElementById("go_back").addEventListener("click", function () {
    updateRulesTable("");
  });

  // test rule button
  document.getElementById("test_button").addEventListener("click", function () {
    let rule = currentAddingRule();
    if (rule.valid == false) {
      alert("Find is empty");
      return;
    }
    saveTmpRule(true);
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.storage.local.set(
        { cmd: { type: kRunTest, group: null, find: null } },
        function () {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id, allFrames: true },
            files: ["content.js"],
          });
          updateFindCount();
        }
      );
    });
  });

  // save rule button
  document.getElementById("save_button").addEventListener("click", function () {
    let rule = currentAddingRule();
    if (rule.valid == false) {
      alert("Find is empty");
      return;
    }
    const group = rule.group;
    const find = rule.find;
    chrome.storage.sync.get(group, function (result) {
      if (result[group] == null) {
        let newGroup = new Object();
        newGroup[find] = rule.value;
        chrome.storage.sync.set({ [group]: newGroup });
        updateRulesTable(g_current_group);
        hideAddRuleBox();
      } else {
        let currentGroup = result[group];
        if (g_edit_mode || !currentGroup.hasOwnProperty(find)) {
          currentGroup[find] = rule.value;
          chrome.storage.sync.set({ [group]: currentGroup });
          updateRulesTable(g_current_group);
          hideAddRuleBox();
        } else {
          alert("Duplicate rule, save failed!");
        }
      }
    });
  });

  // cancel button
  document
    .getElementById("cancel_button")
    .addEventListener("click", function () {
      hideAddRuleBox();
    });

  // save tmp rule when lose focus
  document
    .getElementById("add_rule")
    .addEventListener("mouseleave", function () {
      if (g_adding_rule == false) {
        return;
      }
      console.log("save tmp");
      saveTmpRule(false);
    });

  // detect find value change and auto refresh find count
  document.getElementById("find_text").onkeyup = function () {
    saveTmpRule(true);
    updateFindCount();
  };
  document
    .getElementById("regex_checkbox")
    .addEventListener("change", function () {
      saveTmpRule(true);
      updateFindCount();
    });

  // show add rule if has tmp
  chrome.storage.local.get([kTmp], function (result) {
    console.log(result);
    if (result[kTmp] != null) {
      showAddRuleBox(result[kTmp].group, result[kTmp].find, result[kTmp].value);
      updateFindCount();
      chrome.storage.local.get([kEditMode], function (result) {
        const value = result[kEditMode];
        if (value != null) {
          g_edit_mode = value;
        }
      });
    }
  });
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (g_received_frames.has(sender.frameId) == false) {
    g_received_frames.add(sender.frameId);

    // check find count
    let findCount = request.findCount;
    if (findCount != null) {
      g_find_count = g_find_count + findCount;
      document.getElementById("find_count").innerText = "Find " + g_find_count;
    }

    // check replace count
    let replaceCount = request.replaceCount;
    if (replaceCount != null) {
      g_replace_count = g_replace_count + replaceCount;
      document.getElementById("details").innerText =
        g_replace_count + " places were replaced";
    }
  }
});
