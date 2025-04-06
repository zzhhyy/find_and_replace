/*global chrome*/
import React from "react";
import {
  Button,
  IconButton,
  MenuItem,
  Dialog,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Checkbox,
  Select,
  FormControlLabel,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import LanguageIcon from "@mui/icons-material/Language";

import MainIcon from "./image/find_and_replace.png";
import { Settings } from "./settings.js";
import { Rule, RuleTable } from "./rule_table.js";
import { RunCommand, CreateContextMenu, IsFirstRun } from "./utils.js";
import { KEY, CMD, SETTINGS, MODE, OPEN_MODE } from "./constant.js";
import { DeleteGroup, DeleteRule, DisableGroup, EnableGroup, ReadGroup, ReadRule, WriteRule } from "./rule.js";
import i18n from "./i18n/i18n.js";
import R from "./i18n/R.js";

export class Main extends React.Component {
  constructor() {
    super();
    this.state = {
      currentGroup: "",
      currentRules: [],
      findCount: "",
      replaceCount: "",
      showAddRule: false,
      groups: [],
      presetRule: null,
      showSettings: false,
      actionsHeight: 0,
      tableWidth: 328,
      domainFieldWidth: 120,
      advancedFieldWidth: 200,
      normalFieldWidth: 0,
      showLanguageList: false,
      normalRegChecked: false,
      normalCaseChecked: false,
      normalWordChecked: false,
      mode: localStorage.getItem(SETTINGS.GENERAL.MODE) ?? MODE.NORMAL,
      openMode: localStorage.getItem(SETTINGS.GENERAL.OPEN_MODE) ?? OPEN_MODE.POP_UP,
    };

    this.editMode = false;
    this.editingGroup = "";
    this.editingFind = "";
    this.addingRule = false;
    this.lastSaveTime = 0;
    this.findTimer = null;
    this.findCount = 0;
    this.replaceCount = 0;
    this.receivedFrames = new Set();

    this.domainInputRef = React.createRef();
    this.domainCheckRef = React.createRef();
    this.findInputRef = React.createRef();
    this.regCheckRef = React.createRef();
    this.caseCheckRef = React.createRef();
    this.wordCheckRef = React.createRef();
    this.ignoreInputRef = React.createRef();
    this.replaceInputRef = React.createRef();
    this.groupInputRef = React.createRef();
    this.runSelectRef = React.createRef();
    this.disableCheckRef = React.createRef();
    this.bodyRef = React.createRef();
    this.actionsRef = React.createRef();

    this.normalFindRef = React.createRef();
    this.normalRegCheckRef = React.createRef();
    this.normalCaseCheckRef = React.createRef();
    this.normalWordCheckRef = React.createRef();
    this.normalReplaceRef = React.createRef();

    this.resizeObserver = new ResizeObserver(this.handleSizeChange);

    i18n.init();
    this.syncSettings();
    IsFirstRun();
  }

  componentDidMount() {
    this.resizeObserver.observe(this.bodyRef.current);
    this.resizeObserver.observe(this.actionsRef.current);
    chrome.storage.local.get([KEY.TMP], result => {
      if (result[KEY.TMP] != null) {
        if (result[KEY.TMP].mode == "normal") {
          this.normalFindRef.current.value = result[KEY.TMP].find;
          this.normalReplaceRef.current.value = result[KEY.TMP].value.replace;
          this.setState({
            normalRegChecked: result[KEY.TMP].value.regex,
            normalCaseChecked: result[KEY.TMP].value.ignoreCase,
            normalWordChecked: result[KEY.TMP].value.wholeWord,
          });
        } else {
          this.showAddRuleBox(result[KEY.TMP].group, result[KEY.TMP].find, result[KEY.TMP].value);
          this.updateFindCount();
          chrome.storage.local.get([KEY.EDIT_MODE], result => {
            const value = result[KEY.EDIT_MODE];
            if (value != null) {
              this.editMode = value;
            }
          });
          chrome.storage.local.get([KEY.EDIT_GROUP], result => {
            this.editingGroup = result[KEY.EDIT_GROUP];
          });
          chrome.storage.local.get([KEY.EDIT_FIND], result => {
            this.editingFind = result[KEY.EDIT_FIND];
          });
        }
      }
    });
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (this.receivedFrames.has(sender.frameId) === false) {
        this.receivedFrames.add(sender.frameId);

        // check find count
        let findCount = request.findCount;
        if (findCount != null) {
          this.findCount = this.findCount + findCount;
          this.setState({ findCount: "Find " + this.findCount });
        }

        // check replace count
        let replaceCount = request.replaceCount;
        if (replaceCount != null) {
          this.replaceCount = this.replaceCount + replaceCount;
          this.setState({ replaceCount: this.replaceCount + " places were replaced" });
        }
      }
    });
    const migrate = "migrated_sync";
    if (localStorage.getItem(migrate)) {
      this.updateCurrentRules("");
    } else {
      localStorage.setItem(migrate, "migrated_sync");
      try {
        chrome.storage.local.get([KEY.LOCAL], localResult => {
          let localRules = localResult[KEY.LOCAL] ?? {};
          chrome.storage.sync.get(null, syncResult => {
            for (let [group, rules] of Object.entries(syncResult)) {
              let tmpRules = localRules[group] ?? {};
              localRules[group] = { ...tmpRules, ...rules };
            }
            chrome.storage.local.set({ [KEY.LOCAL]: localRules });
            chrome.storage.sync.clear(() => {
              this.updateCurrentRules("");
            });
          });
        });
      } catch (e) {
        this.updateCurrentRules("");
      }
    }
  }

  componentWillUnmount() {
    this.resizeObserver.unobserve(this.bodyRef.current);
    this.resizeObserver.unobserve(this.actionsRef.current);
  }

  syncSettings = () => {
    chrome.storage.local.get([SETTINGS.GENERAL.OPEN_MODE], result => {
      const openMode = result[SETTINGS.GENERAL.OPEN_MODE];
      if (openMode != null && openMode.length > 0) {
        localStorage.setItem(SETTINGS.GENERAL.OPEN_MODE, openMode);
        this.setState({ openMode: openMode });
      }
    });
  };

  handleSizeChange = entries => {
    for (const entry of entries) {
      if (entry.target === this.bodyRef.current) {
        const bodyWidth = entry.contentRect.width;
        const domainWidth = bodyWidth > 440 ? 200 : bodyWidth - 240;
        const generalWidth = bodyWidth > 410 ? 250 : bodyWidth - 160;
        this.setState({
          tableWidth: entry.contentRect.width - 32,
          domainFieldWidth: domainWidth,
          advancedFieldWidth: generalWidth,
          normalFieldWidth: bodyWidth - 80,
        });
      } else if (entry.target === this.actionsRef.current) {
        this.setState({ actionsHeight: entry.contentRect.height });
      }
    }
  };

  updateFindCount = () => {
    clearTimeout(this.findTimer);
    this.findTimer = setTimeout(() => {
      RunCommand(CMD.RUN_CHECK, null, null, this.clearRecivedData, null);
    }, 1000);
  };

  updateCurrentRules = async group => {
    let data = [];

    const localResult = await chrome.storage.local.get([KEY.LOCAL]);
    const localRules = localResult[KEY.LOCAL] ?? {};
    if (group === "") {
      for (const tmpGroup of Object.keys(localRules)) {
        if (tmpGroup.length > 0) {
          let disabled = true;
          for (const rule of Object.values(localRules[tmpGroup])) {
            disabled = disabled && rule.disabled;
          }
          data.push({ group: tmpGroup, find: null, disabled: disabled });
        }
      }
    }

    if (localRules.hasOwnProperty(group)) {
      for (const [find, value] of Object.entries(localRules[group])) {
        data.push({ group: group, find: find, disabled: value.disabled });
      }
    }

    this.setState({ currentRules: data, currentGroup: group });
  };

  showAddRuleBox(group, find, value) {
    this.setState({ showAddRule: true, presetRule: { group: group, find: find, value: value } });
    this.addingRule = true;
    // update existing groups
    ReadGroup().then(groups => {
      this.setState({ groups: groups });
    });
  }

  clearRecivedData = () => {
    this.receivedFrames.clear();
    this.findCount = 0;
    this.replaceCount = 0;
  };

  onClickAddRule = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      let url = tabs[0].url;
      let domain = new URL(url).hostname;
      this.showAddRuleBox(this.state.currentGroup, "", {
        domain: domain,
        regex: false,
        ignoreCase: false,
        replace: "",
        runtype: "Auto",
        disabled: false,
      });
    });
  };

  onClickRunAll = () => {
    RunCommand(CMD.RUN_RULE, null, null, this.clearRecivedData, null);
  };

  onClickRecover = () => {
    RunCommand(CMD.RUN_RECOVER, null, null, null, null);
  };

  onClickBack = () => {
    this.updateCurrentRules("");
  };

  onClickHighlight = () => {
    let rule = this.currentAddingRule();
    if (rule.valid === false) {
      alert(i18n.T(R.FindEmpty));
      return;
    }
    this.saveTmpRule(true);
    RunCommand(CMD.RUN_HIGHLIGHT, null, null, null, null);
  };

  onClickTest = () => {
    let rule = this.currentAddingRule();
    if (rule.valid === false) {
      alert(i18n.T(R.FindEmpty));
      return;
    }
    this.saveTmpRule(true);
    const after = () => {
      this.updateFindCount();
    };
    RunCommand(CMD.RUN_TEST, null, null, null, after);
  };

  onClickSave = () => {
    let rule = this.currentAddingRule();
    if (rule.valid === false) {
      alert(i18n.T(R.FindEmpty));
      return;
    }
    const group = rule.group;
    const find = rule.find;

    const AddOneRule = () => {
      ReadRule(group, find).then(result => {
        if (result !== null && !this.editMode) {
          alert(i18n.T(R.DuplicateRule));
          return;
        }
        WriteRule(group, find, rule[KEY.VALUE]).then(result => {
          this.updateCurrentRules(this.state.currentGroup);
          this.onClickCancel();
          CreateContextMenu(false, false, false);
        });
      });
    };

    if (this.editMode && (group !== this.editingGroup || find !== this.editingFind)) {
      // Delete old rule
      DeleteRule(this.editingGroup, this.editingFind).then(_ => {
        AddOneRule();
      });
    } else {
      AddOneRule();
    }
  };

  onClickCancel = () => {
    this.editMode = false;
    this.editingGroup = "";
    this.editingFind = "";
    this.addingRule = false;
    chrome.storage.local.remove([KEY.TMP]);
    chrome.storage.local.remove([KEY.EDIT_MODE]);
    RunCommand(CMD.CLEAR_HIGHLIGHT, null, null, null, null);
    this.setState({ showAddRule: false });
  };

  onFindChange = () => {
    this.saveTmpRule(true);
    this.updateFindCount();
  };

  onMouseLeave = () => {
    if (this.addingRule) {
      this.saveTmpRule(false);
    }
  };

  onClickNormalReplace = () => {
    let find = this.normalFindRef.current.value.trim();
    if (find.length === 0) {
      return;
    }
    let regex = this.normalRegCheckRef.current.checked;
    let ignoreCase = this.normalCaseCheckRef.current.checked;
    let wholeWord = this.normalWordCheckRef.current.checked;
    let replace = this.normalReplaceRef.current.value;
    const rule = {
      valid: true,
      group: "",
      find: find,
      value: {
        domain: null,
        regex: regex,
        ignoreCase: ignoreCase,
        wholeWord: wholeWord,
        replace: replace,
        runtype: "Manual",
        disabled: false,
      },
      mode: MODE.NORMAL,
    };
    chrome.storage.local.set({ [KEY.TMP]: rule });
    RunCommand(CMD.RUN_TEST, null, null, null, null);
  };

  onClickNormalRecover = () => {
    RunCommand(CMD.RUN_RECOVER, null, null, null, null);
  };

  /* Rules function */
  currentAddingRule() {
    let valid = true;
    let checked = this.domainCheckRef.current.checked;
    let domain = null;
    if (!checked) {
      domain = this.domainInputRef.current.value;
    }
    let find = this.findInputRef.current.value.trim();
    if (find.length === 0) {
      valid = false;
    }
    let regex = this.regCheckRef.current.checked;
    let ignoreCase = this.caseCheckRef.current.checked;
    let wholeWord = this.wordCheckRef.current.checked;
    let ignoreInput = this.ignoreInputRef.current.checked;
    let replace = this.replaceInputRef.current.value;
    let group = this.groupInputRef.current.value.trim();
    let runtype = this.runSelectRef.current.value;
    return {
      valid: valid,
      group: group,
      find: find,
      value: {
        domain: domain,
        regex: regex,
        ignoreCase: ignoreCase,
        wholeWord: wholeWord,
        ignoreInput: ignoreInput,
        replace: replace,
        runtype: runtype,
        disabled: false,
      },
    };
  }

  saveTmpRule(force) {
    let current_time = Date.now();
    if (current_time - this.lastSaveTime < 3000 && force === false) {
      return;
    }
    this.lastSaveTime = current_time;
    let rule = this.currentAddingRule();
    chrome.storage.local.set({ [KEY.TMP]: rule });
    chrome.storage.local.set({ [KEY.EDIT_MODE]: this.editMode });
    chrome.storage.local.set({ [KEY.EDIT_GROUP]: this.editingGroup });
    chrome.storage.local.set({ [KEY.EDIT_FIND]: this.editingFind });
  }

  /* Actions */
  runRule = rule => {
    RunCommand(CMD.RUN_RULE, rule.group, rule.find, this.clearRecivedData, null);
  };

  openGroup = rule => {
    this.updateCurrentRules(rule.group);
  };

  enableGroup = rule => {
    EnableGroup(rule.group).then(_ => {
      this.updateCurrentRules("");
    });
  };

  disableGroup = rule => {
    DisableGroup(rule.group).then(_ => {
      this.updateCurrentRules("");
    });
  };

  deleteGroup = rule => {
    if (window.confirm(i18n.F(R.DeleteGroup, rule.group))) {
      DeleteGroup(rule.group).then(_ => {
        this.updateCurrentRules("");
      });
    }
  };

  editRule = rule => {
    ReadRule(rule.group, rule.find).then(value => {
      this.editMode = true;
      this.editingGroup = rule.group;
      this.editingFind = rule.find;
      this.showAddRuleBox(rule.group, rule.find, value);
      setTimeout(() => {
        this.saveTmpRule(true);
        this.updateFindCount();
      }, 1000);
    });
  };

  deleteRule = rule => {
    if (window.confirm(i18n.F(R.DeleteRule, rule.find, rule.group))) {
      DeleteRule(rule.group, rule.find).then(empty => {
        this.updateCurrentRules(empty ? "" : rule.group);
      });
    }
  };

  enableRule = rule => {
    ReadRule(rule.group, rule.find).then(value => {
      value.disabled = false;
      WriteRule(rule.group, rule.find, value).then(_ => {
        this.updateCurrentRules(rule.group);
      });
    });
  };

  disableRule = rule => {
    ReadRule(rule.group, rule.find).then(value => {
      value.disabled = true;
      WriteRule(rule.group, rule.find, value).then(_ => {
        this.updateCurrentRules(rule.group);
      });
    });
  };

  /* Settings */

  onShowSettings = () => {
    this.setState({ showSettings: true });
  };

  onCloseSettings = () => {
    this.setState({ showSettings: false, mode: localStorage.getItem(SETTINGS.GENERAL.MODE) ?? MODE.NORMAL });
  };

  onRuleUpdated = () => {
    this.updateCurrentRules("");
  };

  renderSetting() {
    return <Settings showSettings={this.state.showSettings} onCloseSettings={this.onCloseSettings} onRuleUpdated={this.onRuleUpdated} />;
  }

  renderSelectLanguage() {
    const languages = [
      { language: "عربي", code: "ar" },
      { language: "Deutsch", code: "de" },
      { language: "English", code: "en" },
      { language: "español", code: "es" },
      { language: "Français", code: "fr" },
      { language: "हिंदी", code: "hi" },
      { language: "Indonesia", code: "id" },
      { language: "Italiano", code: "it" },
      { language: "日本語", code: "ja" },
      { language: "한국어", code: "ko" },
      { language: "Português", code: "pt" },
      { language: "Русский", code: "ru" },
      { language: "Tiếng Việt", code: "vi" },
      { language: "中文", code: "zh" },
    ];
    return (
      <Dialog
        open={this.state.showLanguageList}
        onClose={() => {
          this.setState({ showLanguageList: false });
        }}
      >
        <List style={{ minWidth: "240px" }}>
          {languages.map(item => {
            return (
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => {
                    i18n.SetLanguage(item.code);
                    chrome.storage.local.set({ [SETTINGS.GENERAL.LANGUAGE]: item.code });
                    this.setState({ showLanguageList: false });
                  }}
                >
                  <ListItemText primary={item.language} style={{ textAlign: "center" }} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Dialog>
    );
  }

  renderAddRule() {
    const vertical = { display: "flex", alignItems: "center" };
    const label = { width: "88px", textAlign: "right" };
    const space = { height: "4px" };
    return (
      <Dialog open={this.state.showAddRule}>
        <div style={{ padding: "4px", fontSize: "medium" }} onMouseLeave={this.onMouseLeave}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40px", fontSize: "18px", fontWeight: "bold" }}>
            {i18n.T(R.AddRule)}
          </div>
          <div style={vertical}>
            <div style={label}>{i18n.T(R.Domains)}&nbsp;&nbsp;</div>
            <TextField
              inputRef={this.domainInputRef}
              size="small"
              style={{ paddingRight: "8px", width: this.state.domainFieldWidth }}
              defaultValue={this.state.presetRule ? this.state.presetRule.value.domain : ""}
            />
            <FormControlLabel
              control={
                <Checkbox
                  inputRef={this.domainCheckRef}
                  size="small"
                  defaultChecked={this.state.presetRule ? this.state.presetRule.value.domain == null : false}
                />
              }
              label={<div style={{ fontSize: "0.8rem" }}>{i18n.T(R.AllDomains)}</div>}
            />
          </div>
          <div style={space}></div>
          <div style={vertical}>
            <div style={label}>{i18n.T(R.Find)}&nbsp;&nbsp;</div>
            <TextField
              inputRef={this.findInputRef}
              size="small"
              defaultValue={this.state.presetRule ? this.state.presetRule.find : ""}
              onChange={this.onFindChange}
              style={{ width: this.state.advancedFieldWidth }}
            />
          </div>
          {this.state.openMode === OPEN_MODE.POP_UP ? (
            <>
              <div style={vertical}>
                <label style={label}></label>
                <FormControlLabel
                  control={
                    <Checkbox
                      inputRef={this.regCheckRef}
                      size="small"
                      defaultChecked={this.state.presetRule ? this.state.presetRule.value.regex : false}
                      onChange={this.onFindChange}
                    />
                  }
                  label={<div style={{ fontSize: "0.8rem" }}>{i18n.T(R.Regex)}</div>}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      inputRef={this.caseCheckRef}
                      size="small"
                      defaultChecked={this.state.presetRule ? this.state.presetRule.value.ignoreCase : false}
                      onChange={this.onFindChange}
                    />
                  }
                  label={<div style={{ fontSize: "0.8rem" }}>{i18n.T(R.IgnoreCase)}</div>}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      inputRef={this.wordCheckRef}
                      size="small"
                      defaultChecked={this.state.presetRule ? this.state.presetRule.value.wholeWord : false}
                      onChange={this.onFindChange}
                    />
                  }
                  label={<div style={{ fontSize: "0.8rem" }}>{i18n.T(R.WholeWord)}</div>}
                />
              </div>
            </>
          ) : (
            <>
              <div style={vertical}>
                <label style={label}></label>
                <FormControlLabel
                  control={
                    <Checkbox
                      inputRef={this.regCheckRef}
                      size="small"
                      defaultChecked={this.state.presetRule ? this.state.presetRule.value.regex : false}
                      onChange={this.onFindChange}
                    />
                  }
                  label={<div style={{ fontSize: "0.8rem" }}>{i18n.T(R.Regex)}</div>}
                />
              </div>
              <div style={vertical}>
                <label style={label}></label>
                <FormControlLabel
                  control={
                    <Checkbox
                      inputRef={this.caseCheckRef}
                      size="small"
                      defaultChecked={this.state.presetRule ? this.state.presetRule.value.ignoreCase : false}
                      onChange={this.onFindChange}
                    />
                  }
                  label={<div style={{ fontSize: "0.8rem" }}>{i18n.T(R.IgnoreCase)}</div>}
                />
              </div>
              <div style={vertical}>
                <label style={label}></label>
                <FormControlLabel
                  control={
                    <Checkbox
                      inputRef={this.wordCheckRef}
                      size="small"
                      defaultChecked={this.state.presetRule ? this.state.presetRule.value.wholeWord : false}
                      onChange={this.onFindChange}
                    />
                  }
                  label={<div style={{ fontSize: "0.8rem" }}>{i18n.T(R.WholeWord)}</div>}
                />
              </div>
            </>
          )}
          <div style={vertical}>
            <label style={label}></label>
            <FormControlLabel
              control={
                <Checkbox
                  inputRef={this.ignoreInputRef}
                  size="small"
                  defaultChecked={this.state.presetRule ? this.state.presetRule.value.ignoreInput : false}
                />
              }
              label={<div style={{ fontSize: "0.8rem" }}>{i18n.T(R.IgnoreInput)}</div>}
            />
          </div>
          <div style={space}></div>
          <div style={vertical}>
            <label style={label}>{i18n.T(R.Replace)}&nbsp;&nbsp;</label>
            <TextField
              inputRef={this.replaceInputRef}
              size="small"
              defaultValue={this.state.presetRule ? this.state.presetRule.value.replace : ""}
              placeholder={i18n.T(R.UseParam)}
              style={{ width: this.state.advancedFieldWidth }}
            />
          </div>
          <div style={space}></div>
          <div style={vertical}>
            <label style={label}>{i18n.T(R.Group)}&nbsp;&nbsp;</label>
            <TextField
              inputRef={this.groupInputRef}
              size="small"
              inputProps={{ list: "groups" }}
              defaultValue={this.state.presetRule ? this.state.presetRule.group : ""}
              style={{ width: this.state.advancedFieldWidth }}
            />
            <datalist id={"groups"}>
              {this.state.groups.map(group => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </datalist>
          </div>
          <div style={space}></div>
          <div style={vertical}>
            <label style={label}>{i18n.T(R.Run)}&nbsp;&nbsp;</label>
            <Select inputRef={this.runSelectRef} size="small" defaultValue={this.state.presetRule ? this.state.presetRule.value.runtype : "Auto"}>
              <MenuItem value={"Auto"}>{i18n.T(R.Auto)}</MenuItem>
              <MenuItem value={"Manual"}>{i18n.T(R.Manual)}</MenuItem>
              <MenuItem value={"Realtime"}>{i18n.T(R.Realtime)}</MenuItem>
            </Select>
          </div>
          <div style={{ width: "100%", height: "4px" }}></div>
          <div style={{ textAlign: "right" }}>
            <span>{this.state.findCount}</span>
            <span>&nbsp;&nbsp;</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <Button variant="contained" color="success" style={{ textTransform: "none", marginTop: "8px" }} onClick={this.onClickRecover}>
              {i18n.T(R.Recover)}
            </Button>
            <span>&nbsp;&nbsp;</span>
            <Button variant="contained" color="success" style={{ textTransform: "none", marginTop: "8px" }} onClick={this.onClickHighlight}>
              {i18n.T(R.Highlight)}
            </Button>
            <span>&nbsp;&nbsp;</span>
            <Button variant="contained" color="success" style={{ textTransform: "none", marginTop: "8px" }} onClick={this.onClickTest}>
              {i18n.T(R.Test)}
            </Button>
            <span>&nbsp;&nbsp;</span>
            <Button variant="contained" style={{ textTransform: "none", marginTop: "8px" }} onClick={this.onClickSave}>
              {i18n.T(R.Save)}
            </Button>
            <span>&nbsp;&nbsp;</span>
            <Button variant="contained" style={{ textTransform: "none", marginTop: "8px" }} onClick={this.onClickCancel}>
              {i18n.T(R.Cancel)}
            </Button>
          </div>
        </div>
      </Dialog>
    );
  }

  renderNormal() {
    const vertical = { display: "flex", alignItems: "center", justifyContent: "end" };
    const label = { width: "68px", textAlign: "right" };
    return (
      <div style={{ display: this.state.mode === MODE.NORMAL ? "block" : "none" }}>
        <div>
          <div style={vertical}>
            <div style={label}>{i18n.T(R.Find)}&nbsp;&nbsp;</div>
            <TextField inputRef={this.normalFindRef} size="small" style={{ width: this.state.normalFieldWidth }} InputProps={{ style: { height: "32px" } }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "end" }}>
            <FormControlLabel
              control={
                <Checkbox
                  inputRef={this.normalRegCheckRef}
                  checked={this.state.normalRegChecked}
                  size="small"
                  style={{ padding: "6px" }}
                  onChange={event => {
                    this.setState({ normalRegChecked: event.target.checked });
                  }}
                />
              }
              label={<div style={{ fontSize: "0.7rem" }}>{i18n.T(R.Regex)}</div>}
            />
            <FormControlLabel
              control={
                <Checkbox
                  inputRef={this.normalCaseCheckRef}
                  checked={this.state.normalCaseChecked}
                  size="small"
                  style={{ padding: "6px" }}
                  onChange={event => {
                    this.setState({ normalCaseChecked: event.target.checked });
                  }}
                />
              }
              label={<div style={{ fontSize: "0.7rem" }}>{i18n.T(R.IgnoreCase)}</div>}
            />
            <FormControlLabel
              style={{ marginRight: "0px", paddingRight: "0px" }}
              control={
                <Checkbox
                  inputRef={this.normalWordCheckRef}
                  checked={this.state.normalWordChecked}
                  size="small"
                  style={{ padding: "6px" }}
                  onChange={event => {
                    this.setState({ normalWordChecked: event.target.checked });
                  }}
                />
              }
              label={<div style={{ fontSize: "0.7rem" }}>{i18n.T(R.WholeWord)}</div>}
            />
          </div>
          <div style={vertical}>
            <label style={label}>{i18n.T(R.Replace)}&nbsp;&nbsp;</label>
            <TextField
              inputRef={this.normalReplaceRef}
              size="small"
              placeholder={i18n.T(R.UseParam)}
              title={i18n.T(R.UseParam)}
              style={{ width: this.state.normalFieldWidth }}
              InputProps={{ style: { height: "32px" } }}
            />
          </div>
        </div>
        <div style={{ height: "8px" }} />
        <div style={{ textAlign: "right", marginRight: "0px" }}>
          <Button variant="contained" style={{ textTransform: "none", fontSize: "0.8rem", padding: "4px 8px 4px 8px" }} onClick={this.onClickNormalReplace}>
            {i18n.T(R.Replace)}
          </Button>
          <span>&nbsp;&nbsp;&nbsp;&nbsp;</span>
          <Button variant="contained" style={{ textTransform: "none", fontSize: "0.8rem", padding: "4px 8px 4px 8px" }} onClick={this.onClickNormalRecover}>
            {i18n.T(R.Recover)}
          </Button>
        </div>
        <div style={{ height: "8px" }} />
      </div>
    );
  }

  renderAdvanced() {
    return (
      <div style={{ display: this.state.mode === MODE.ADVANCED ? "block" : "none" }}>
        <div ref={this.actionsRef} style={{ position: "fixed", top: "44px", backgroundColor: "white", width: "calc(100% - 32px)", zIndex: "999" }}>
          <div>
            <Button variant="contained" style={{ textTransform: "none", marginTop: "8px" }} onClick={this.onClickAddRule}>
              {i18n.T(R.AddRule)}
            </Button>
            <Button variant="contained" style={{ textTransform: "none", marginLeft: "16px", marginTop: "8px" }} onClick={this.onClickRunAll}>
              {i18n.T(R.RunAll)}
            </Button>
            <Button variant="contained" style={{ textTransform: "none", marginLeft: "16px", marginTop: "8px" }} onClick={this.onClickRecover}>
              {i18n.T(R.Recover)}
            </Button>
            {this.state.currentGroup !== "" && (
              <Button variant="contained" style={{ textTransform: "none", marginLeft: "16px", marginTop: "8px" }} onClick={this.onClickBack}>
                {i18n.T(R.Back)}
              </Button>
            )}
          </div>
          <div style={{ height: "16px" }}></div>
        </div>
        <div style={{ width: "100%", height: this.state.actionsHeight }}></div>
        <div style={{ marginTop: "8px" }}>
          {
            <RuleTable width={this.state.tableWidth}>
              {this.state.currentRules.map(rule =>
                React.createElement(Rule, {
                  key: rule.group + rule.find,
                  width: this.state.tableWidth,
                  rule: rule,
                  runRule: this.runRule,
                  deleteRule: this.deleteRule,
                  deleteGroup: this.deleteGroup,
                  openGroup: this.openGroup,
                  enableGroup: this.enableGroup,
                  disableGroup: this.disableGroup,
                  editRule: this.editRule,
                  enableRule: this.enableRule,
                  disableRule: this.disableRule,
                })
              )}
            </RuleTable>
          }
        </div>
      </div>
    );
  }

  renderMain() {
    return (
      <div style={{ marginLeft: "16px", marginRight: "16px" }}>
        {/* Header start */}
        <div style={{ position: "fixed", top: "0", width: "calc(100% - 32px)", height: "52px", backgroundColor: "white", zIndex: "99" }} />
        <div
          style={{
            position: "fixed",
            display: "flex",
            alignItems: "center",
            justifyContent: "start",
            width: "calc(100% - 32px)",
            height: "40px",
            top: "6px",
            zIndex: "999",
          }}
        >
          <img src={MainIcon} style={{ width: "32px", height: "32px" }} alt={""} />
          <div style={{ marginLeft: "8px", fontSize: "1rem", fontWeight: "bold" }}>{i18n.T(R.AppName)}</div>
        </div>
        <div
          style={{
            position: "fixed",
            display: "flex",
            alignItems: "center",
            justifyContent: "end",
            width: "calc(100% - 32px)",
            height: "40px",
            top: "6px",
            zIndex: "999",
          }}
        >
          <IconButton
            onClick={() => {
              this.setState({ showLanguageList: true });
            }}
          >
            <LanguageIcon />
          </IconButton>
          <IconButton onClick={this.onShowSettings}>
            <SettingsIcon />
          </IconButton>
        </div>
        <div style={{ width: "100%", height: "52px" }}></div>
        {/* Header end */}
        {this.renderNormal()}
        {this.renderAdvanced()}
        {/* Footer start */}
        {this.state.mode === MODE.ADVANCED && (
          <>
            <div style={{ width: "100%", height: "32px" }} />
            <div
              style={{
                width: "calc(100% - 32px)",
                height: "32px",
                position: "fixed",
                bottom: "0",
                alignItems: "center",
                backgroundColor: "white",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <span style={{ marginRight: "32px" }}>{this.state.replaceCount}</span>
            </div>
          </>
        )}
        {/* Footer end */}
      </div>
    );
  }

  render() {
    return (
      <div ref={this.bodyRef} style={{ width: "100%", backgroundColor: "white" }}>
        <div
          style={{
            width: this.state.openMode === OPEN_MODE.SIDE_PANEL ? "auto" : this.state.mode === MODE.NORMAL ? "360px" : "640px",
            height: this.state.openMode === OPEN_MODE.SIDE_PANEL ? "auto" : this.state.mode === MODE.NORMAL ? "auto" : "480px",
          }}
        >
          {this.renderMain()}
          {this.renderAddRule()}
          {this.renderSetting()}
          {this.renderSelectLanguage()}
        </div>
      </div>
    );
  }
}
