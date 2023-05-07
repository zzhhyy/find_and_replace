// global vars
var g_rule_index = 0; // auto increase every time updateRulesTable, ensure that the ID of the showing rule row is unique
var g_edit_mode = false;
var g_adding_rule = false;
var g_last_save_time = 0; // cursor away or click test will save tmp rule, record last save time
var g_received_frames = new Set();
var g_find_count = 0;
var g_input_timer = null;
var g_replace_count = 0;

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
function showAddRuleBox(key, value) {
  if (value.domain == null) {
    document.getElementById("domains_checkbox").checked = true;
    document.getElementById("domains_text").value = "";
  } else {
    document.getElementById("domains_checkbox").checked = false;
    document.getElementById("domains_text").value = value.domain;
  }
  document.getElementById("find_text").value = key;
  if (value.regex == true) {
    document.getElementById("regex_checkbox").checked = true;
  } else {
    document.getElementById("regex_checkbox").checked = false;
  }
  document.getElementById("replace_text").value = value.replace;
  document.getElementById("runtype_select").value = value.runtype;
  document.getElementById("add_rule_box").style.visibility = "visible";
  g_adding_rule = true;
}

function hideAddRuleBox() {
  g_edit_mode = false;
  g_adding_rule = false;
  document.getElementById("add_rule_box").style.visibility = "hidden";
  chrome.storage.local.remove("tmp");
}

function currentAddingRule() {
  let valid = true;
  let checked = document.getElementById("domains_checkbox").checked;
  let domain = null;
  if (!checked) {
    domain = document.getElementById("domains_text").value;
  }
  let find = document.getElementById("find_text").value;
  if (!find || find.trim().length == 0) {
    valid = false;
  }
  let regex = document.getElementById("regex_checkbox").checked;
  let replace = document.getElementById("replace_text").value;
  replace = replace != null ? replace : "";
  let runtype = document.getElementById("runtype_select").value;
  return {
    valid: valid,
    key: find,
    value: { domain: domain, regex: regex, replace: replace, runtype: runtype },
  };
}

function saveTmpRule(force) {
  let current_time = Date.now();
  if (current_time - g_last_save_time < 3000 && force == false) {
    return;
  }
  g_last_save_time = current_time;
  let rule = currentAddingRule();
  chrome.storage.local.set({ tmp: rule });
  chrome.storage.local.set({ edit_mode: g_edit_mode });
}

function updateFindCount() {
  clearTimeout(g_input_timer);
  g_input_timer = setTimeout(function () {
    let rule = currentAddingRule();
    chrome.storage.local.set({ tmp: rule });
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.storage.local.set(
        { cmd: { type: "check", find: null } },
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

function runRule(key) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.storage.local.set({ cmd: { type: "once", find: key } }, function () {
      g_received_frames.clear();
      g_replace_count = 0;
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id, allFrames: true },
        files: ["content.js"],
      });
    });
  });
}

function editRule(key) {
  chrome.storage.sync.get([key], function (result) {
    let value = result[key];
    if (value == null) {
      // do nothing
    } else {
      g_edit_mode = true;
      showAddRuleBox(key, value);
      updateFindCount();
    }
  });
}

function deleteRule(key) {
  if (confirm("Are you sure you want to delete this rule?")) {
    chrome.storage.sync.remove([key]);
    updateRulesTable();
  }
}

function updateRulesTable() {
  chrome.storage.sync.get(null, function (result) {
    let innerHtml = "";
    let map = new Map();
    for (let key in result) {
      g_rule_index++;
      const runButton = "run_button_" + g_rule_index;
      const editButton = "edit_button_" + g_rule_index;
      const deleteButton = "delete_button_" + g_rule_index;
      const display = cutString(key, 32);
      map.set(key, { run: runButton, edit: editButton, delete: deleteButton });
      innerHtml =
        innerHtml +
        `<tr><td>${display}</td><td><button id=\"${runButton}\" class=\"pure-button button-success\">Run</button></td><td><button id=\"${editButton}\" class=\"pure-button button-secondary\">Edit</button></td><td><button id=\"${deleteButton}\" class=\"pure-button button-error\">Delete</button></td></tr>`;
    }
    document.getElementById("rule_table").innerHTML = innerHtml;
    // add event lisenter after added to dom
    for (let [key, value] of map) {
      document
        .getElementById(value["run"])
        .addEventListener("click", function () {
          runRule(key);
        });
      document
        .getElementById(value["edit"])
        .addEventListener("click", function () {
          editRule(key);
        });
      document
        .getElementById(value["delete"])
        .addEventListener("click", function () {
          deleteRule(key);
        });
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  updateRulesTable();

  // add rule button
  document
    .getElementById("add_rule_button")
    .addEventListener("click", function () {
      showAddRuleBox("", {
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
          { cmd: { type: "once", find: null } },
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
        { cmd: { type: "test", find: null } },
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

    chrome.storage.sync.get([rule.key], function (result) {
      if (g_edit_mode || result[rule.key] == null) {
        chrome.storage.sync.set({ [rule.key]: rule.value });
        updateRulesTable();
        hideAddRuleBox();
      } else {
        alert("Duplicate find, save failed!");
      }
    });
  });

  // cancel button
  document
    .getElementById("cancel_button")
    .addEventListener("click", function () {
      hideAddRuleBox();
    });

  // save tmp rule
  document
    .getElementById("add_rule")
    .addEventListener("mouseleave", function () {
      if (g_adding_rule == false) {
        return;
      }
      saveTmpRule(false);
    });

  // detect find value change
  document.getElementById("find_text").onkeyup = function () {
    updateFindCount();
  };
  document
    .getElementById("regex_checkbox")
    .addEventListener("change", function () {
      updateFindCount();
    });

  // show add rule if has tmp
  chrome.storage.local.get("tmp", function (result) {
    if (result["tmp"] != null) {
      showAddRuleBox(result["tmp"].key, result["tmp"].value);
      updateFindCount();
      chrome.storage.local.get("edit_mode", function (result) {
        const value = result["edit_mode"];
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
