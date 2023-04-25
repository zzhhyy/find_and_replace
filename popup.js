// global vars
var g_rule_index = 0;
var g_edit_mode = false;

function Rule(domain, find, regex, replace, runtype, display) {
  this.domain = domain;
  this.find = find;
  this.regex = regex;
  this.replace = replace;
  this.runtype = runtype;
  this.display = display;
}

function cutString(str, len) {
  let str_length = 0;
  let str_cut = '';
  for (let i = 0; i < str.length; i++) {
    let a = str.charAt(i);
    str_length++;
    if (a.length > 1) {
      str_length++;
    }
    str_cut = str_cut.concat(a);
    if (str_length >= len) {
      str_cut = str_cut.concat('...');
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
function runRule(key) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.storage.local.set({ cmd: { type: "once", find: key } }, function () {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id, allFrames: true },
        files: ["content.js"]
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
      if (value.domain == null) {
        document.getElementById("domains_checkbox").checked = true;
        document.getElementById("domains_text").value = "";
      } else {
        document.getElementById("domains_checkbox").checked = false;
        document.getElementById("domains_text").value = value.domain;
      }
      document.getElementById("find_text").value = value.find;
      if (value.regex == true) {
        document.getElementById("regex_checkbox").checked = true;
      } else {
        document.getElementById("regex_checkbox").checked = false;
      }
      document.getElementById("replace_text").value = value.replace;
      document.getElementById("runtype_select").value = value.runtype;
      document.getElementById("add_rule_box").style.visibility = "visible";
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
      const runButton = 'run_button_' + g_rule_index;
      const editButton = 'edit_button_' + g_rule_index;
      const deleteButton = 'delete_button_' + g_rule_index;
      map.set(key, { 'run': runButton, 'edit': editButton, 'delete': deleteButton });
      innerHtml = innerHtml + `<tr><td>${result[key].display}</td><td><button id=\"${runButton}\" class=\"pure-button button-success\">Run</button></td><td><button id=\"${editButton}\" class=\"pure-button button-secondary\">Edit</button></td><td><button id=\"${deleteButton}\" class=\"pure-button button-error\">Delete</button></td></tr>`;
    }
    document.getElementById("rule_table").innerHTML = innerHtml;
    // add event lisenter after added to dom
    for (let [key, value] of map) {
      document.getElementById(value['run']).addEventListener('click', function () {
        runRule(key);
      });
      document.getElementById(value['edit']).addEventListener('click', function () {
        editRule(key);
      });
      document.getElementById(value['delete']).addEventListener('click', function () {
        deleteRule(key);
      });
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  updateRulesTable();

  // add rule button
  document.getElementById("add_rule_button").addEventListener('click', function () {
    chrome.tabs.query({ 'active': true, 'lastFocusedWindow': true }, function (tabs) {
      let url = tabs[0].url;
      let domain = new URL(url).hostname;
      document.getElementById("domains_text").value = domain;
    });
    document.getElementById("add_rule_box").style.visibility = "visible";
  });

  // run all button
  document.getElementById("run_all_button").addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.storage.local.set({ cmd: { type: "once", find: null } }, function () {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id, allFrames: true },
          files: ["content.js"]
        });
      });
    });
  });

  // save rule button
  document.getElementById('save_button').addEventListener('click', function () {
    let checked = document.getElementById("domains_checkbox").checked;
    let domain = null;
    if (!checked) {
      domain = document.getElementById("domains_text").value;
    }
    let find = document.getElementById("find_text").value;
    if (!find || (find.trim().length == 0)) {
      return;
    }
    let regex = document.getElementById("regex_checkbox").checked;
    let display = cutString(find, 32);
    let replace = document.getElementById("replace_text").value;
    let runtype = document.getElementById("runtype_select").value;

    chrome.storage.sync.get([find], function (result) {
      if (g_edit_mode || (result[find] == null)) {
        chrome.storage.sync.set({ [find]: new Rule(domain, find, regex, replace, runtype, display) });
        updateRulesTable();
        g_edit_mode = false;
        document.getElementById("add_rule_box").style.visibility = "hidden";
      } else {
        alert("Duplicate find, save failed!");
      }
    });
  });

  // cancel button
  document.getElementById("cancel_button").addEventListener('click', function () {
    document.getElementById("domains_checkbox").checked = false;
    document.getElementById("domains_text").value = "";
    document.getElementById("find_text").value = "";
    document.getElementById("regex_checkbox").checked = false;
    document.getElementById("replace_text").value = "";
    document.getElementById("runtype_select").value = "Auto";
    g_edit_mode = false;
    document.getElementById("add_rule_box").style.visibility = "hidden";
  });
});