/*global chrome*/
import React from "react";
import {
  Button,
  TableHead,
  Table,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  TextField,
  Checkbox,
  Select,
  FormControlLabel,
} from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

import MainIcon from "./image/find_and_replace.png";
import FolderIcon from "./image/folder.png";
import DocumentIcon from "./image/document.png";
import { RunCommand, CMD, KEY } from "./command";

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

class Rule extends React.Component {
  constructor() {
    super();
    this.state = {
      menuAnchor: null,
    };
  }

  isGroup = () => {
    return this.props.rule.find === null;
  };

  isDisbaled = () => {
    return this.props.rule.disabled === true;
  };

  onClickRun = () => {
    this.props.runRule(this.props.rule);
  };

  onClickOpenOrEdit = () => {
    if (this.isGroup()) {
      this.props.openGroup(this.props.rule);
    } else {
      this.props.editRule(this.props.rule);
    }
  };

  onClickDisable = () => {
    if (this.isDisbaled()) {
      this.props.enableRule(this.props.rule);
    } else {
      this.props.disableRule(this.props.rule);
    }
  };

  onClickDelete = () => {
    if (this.isGroup()) {
      this.props.deleteGroup(this.props.rule);
    } else {
      this.props.deleteRule(this.props.rule);
    }
    this.onCloseMenu();
  };

  onClickMenu = (event) => {
    this.setState({ menuAnchor: event.currentTarget });
  };

  onCloseMenu = () => {
    this.setState({ menuAnchor: null });
  };

  renderMenu() {
    return (
      <>
        {this.state.menuAnchor && (
          <Menu anchorEl={this.state.menuAnchor} open={true} onClose={this.onCloseMenu}>
            {!this.isGroup() && (
              <MenuItem onClick={this.onClickDisable}>{this.isDisbaled() ? "Enable" : "Disable"}</MenuItem>
            )}
            <MenuItem onClick={this.onClickDelete}>Delete</MenuItem>
          </Menu>
        )}
      </>
    );
  }

  render() {
    return (
      <TableRow>
        <TableCell>
          <img src={this.isGroup() ? FolderIcon : DocumentIcon} alt={""} />
        </TableCell>
        <TableCell align="left" style={{ fontSize: "medium" }}>
          {this.isGroup() ? cutString(this.props.rule.group, 16) : cutString(this.props.rule.find, 16)}
        </TableCell>
        <TableCell align="left">
          <Button
            variant="contained"
            disabled={this.isDisbaled()}
            color="success"
            style={{ textTransform: "none" }}
            onClick={this.onClickRun}
          >
            Run
          </Button>
        </TableCell>
        <TableCell align="left">
          <Button
            variant="contained"
            disabled={this.isDisbaled()}
            color="success"
            style={{ textTransform: "none" }}
            onClick={this.onClickOpenOrEdit}
          >
            {this.isGroup() ? "Open" : "Edit"}
          </Button>
        </TableCell>
        <TableCell align="left">
          <IconButton onClick={this.onClickMenu}>
            <MoreHorizIcon />
          </IconButton>
          {this.renderMenu()}
        </TableCell>
      </TableRow>
    );
  }
}

export class Rules extends React.Component {
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
      allUsage: "",
      groupUsage: "",
    };

    this.keyIndex = 0;
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
    this.replaceInputRef = React.createRef();
    this.groupInputRef = React.createRef();
    this.runSelectRef = React.createRef();
    this.disableCheckRef = React.createRef();
  }

  componentDidMount() {
    document.getElementById("header_placeholder").style.height = getComputedStyle(
      document.getElementById("header")
    ).height;
    this.updateCurrentRules("");
    chrome.storage.local.get([KEY.TMP], (result) => {
      if (result[KEY.TMP] != null) {
        this.showAddRuleBox(result[KEY.TMP].group, result[KEY.TMP].find, result[KEY.TMP].value);
        this.updateFindCount();
        chrome.storage.local.get([KEY.EDIT_MODE], (result) => {
          const value = result[KEY.EDIT_MODE];
          if (value != null) {
            this.editMode = value;
          }
        });
        chrome.storage.local.get([KEY.EDIT_GROUP], (result) => {
          this.editingGroup = result[KEY.EDIT_GROUP];
        });
        chrome.storage.local.get([KEY.EDIT_FIND], (result) => {
          this.editingFind = result[KEY.EDIT_FIND];
        });
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
  }

  updateFindCount = () => {
    clearTimeout(this.findTimer);
    this.findTimer = setTimeout(() => {
      RunCommand(CMD.RUN_CHECK, null, null, this.clearRecivedData, null);
    }, 1000);
  };

  updateCurrentRules = (group) => {
    let key = group;
    if (key === "") {
      key = null;
    }
    let data = [];
    chrome.storage.sync.get(key, (result) => {
      if (key === null) {
        for (let group in result) {
          if (group.length > 0) {
            data.push({ group: group, find: null, disabled: false });
          }
        }
      }

      if (result[group] != null) {
        for (let [find, value] of Object.entries(result[group])) {
          data.push({ group: group, find: find, disabled: value.disabled });
        }
      }

      this.setState({ currentRules: data, currentGroup: group });
    });

    //  update usage
    chrome.storage.sync.getBytesInUse(null, (result) => {
      let percent = ((result * 100) / 102400).toFixed(2);
      if (percent > 100) {
        percent = 100;
      }
      this.setState({ allUsage: `All usage : ${percent}%` });
    });
    chrome.storage.sync.getBytesInUse(group, (result) => {
      let percent = ((result * 100) / 8192).toFixed(2);
      if (percent > 100) {
        percent = 100;
      }
      const displayGroup = cutString(group, 16);
      this.setState({ groupUsage: `Group ${displayGroup} usage : ${percent}%` });
    });
  };

  showAddRuleBox(group, find, value) {
    this.setState({ showAddRule: true, presetRule: { group: group, find: find, value: value } });
    this.addingRule = true;
    // update existing groups
    chrome.storage.sync.get(null, (result) => {
      let groups = [];
      for (let group in result) {
        if (group.length > 0) {
          groups.push(group);
        }
      }
      this.setState({ groups: groups });
    });
  }

  clearRecivedData = () => {
    this.receivedFrames.clear();
    this.findCount = 0;
    this.replaceCount = 0;
  };

  onClickAddRule = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
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

  onClickBack = () => {
    this.updateCurrentRules("");
  };

  onClickHighlight = () => {
    let rule = this.currentAddingRule();
    if (rule.valid === false) {
      alert("Find is empty");
      return;
    }
    this.saveTmpRule(true);
    RunCommand(CMD.RUN_HIGHLIGHT, null, null, null, null);
  };

  onClickTest = () => {
    let rule = this.currentAddingRule();
    if (rule.valid === false) {
      alert("Find is empty");
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
      alert("Find is empty");
      return;
    }
    const group = rule.group;
    const find = rule.find;

    const AddOneRule = () => {
      chrome.storage.sync.get(group, (result) => {
        if (result[group] === null || result[group] === undefined) {
          let newGroup = {};
          newGroup[find] = rule.value;
          chrome.storage.sync.set({ [group]: newGroup });
          this.updateCurrentRules(this.state.currentGroup);
          this.onClickCancel();
        } else {
          let currentGroup = result[group];
          if (this.editMode || !currentGroup.hasOwnProperty(find)) {
            currentGroup[find] = rule.value;
            chrome.storage.sync.set({ [group]: currentGroup });
            this.updateCurrentRules(this.state.currentGroup);
            this.onClickCancel();
          } else {
            alert("Duplicate rule, save failed!");
          }
        }
      });
    };
    if (this.editMode && ((group !== this.editingGroup) || (find !== this.editingFind))) {
      // Delete old rule
      chrome.storage.sync.get([this.editingGroup], (result) => {
        let groupObj = result[this.editingGroup];
        delete groupObj[this.editingFind];
        if (Object.keys(groupObj).length === 0) {
          chrome.storage.sync.remove([this.editingGroup]);
        } else {
          chrome.storage.sync.set({ [this.editingGroup]: groupObj });
        }
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
  runRule = (rule) => {
    RunCommand(CMD.RUN_RULE, rule.group, rule.find, this.clearRecivedData, null);
  };

  openGroup = (rule) => {
    this.updateCurrentRules(rule.group);
  };

  editRule = (rule) => {
    chrome.storage.sync.get([rule.group], (result) => {
      const groupMap = result[rule.group];
      const value = groupMap[rule.find];
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

  deleteGroup = (rule) => {
    if (window.confirm(`Are you sure you want to delete group ${rule.group}?`)) {
      chrome.storage.sync.remove([rule.group]);
      this.updateCurrentRules("");
    }
  };

  deleteRule = (rule) => {
    if (window.confirm(`Are you sure you want to delete rule ${rule.find} at group ${rule.group}?`)) {
      chrome.storage.sync.get([rule.group], (result) => {
        let groupObj = result[rule.group];
        delete groupObj[rule.find];
        if (Object.keys(groupObj).length === 0) {
          chrome.storage.sync.remove([rule.group]);
          this.updateCurrentRules("");
        } else {
          chrome.storage.sync.set({ [rule.group]: groupObj });
          this.updateCurrentRules(rule.group);
        }
      });
    }
  };

  enableRule = (rule) => {
    chrome.storage.sync.get([rule.group], (result) => {
      let groupObj = result[rule.group];
      groupObj[rule.find].disabled = false;
      chrome.storage.sync.set({ [rule.group]: groupObj });
      this.updateCurrentRules(rule.group);
    });
  };

  disableRule = (rule) => {
    chrome.storage.sync.get([rule.group], (result) => {
      let groupObj = result[rule.group];
      groupObj[rule.find].disabled = true;
      chrome.storage.sync.set({ [rule.group]: groupObj });
      this.updateCurrentRules(rule.group);
    });
  };

  renderAddRule() {
    const vertical = { display: "flex", alignItems: "center" };
    const label = { width: "96px", textAlign: "right" };
    const space = { height: "4px" };
    return (
      <Dialog open={this.state.showAddRule}>
        <div style={{ padding: "16px", fontSize: "medium" }} onMouseLeave={this.onMouseLeave}>
          <h3 style={{ textAlign: "center" }}>Add rule</h3>
          <div style={vertical}>
            <label style={label}>Domains&nbsp;&nbsp;</label>
            <TextField
              inputRef={this.domainInputRef}
              size="small"
              defaultValue={this.state.presetRule ? this.state.presetRule.value.domain : ""}
            />
            <FormControlLabel
              style={{ marginLeft: "8px" }}
              control={
                <Checkbox
                  inputRef={this.domainCheckRef}
                  size="small"
                  defaultChecked={this.state.presetRule ? this.state.presetRule.value.domain == null : false}
                />
              }
              label="All domains"
            />
          </div>
          <div style={space}></div>
          <div style={vertical}>
            <label style={label}>Find&nbsp;&nbsp;</label>
            <TextField
              inputRef={this.findInputRef}
              size="small"
              defaultValue={this.state.presetRule ? this.state.presetRule.find : ""}
              onChange={this.onFindChange}
              style={{ width: "280px" }}
            />
          </div>
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
              label="Regex"
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
              label="Ignore case"
            />
          </div>
          <div style={vertical}>
            <label style={label}>Replace&nbsp;&nbsp;</label>
            <TextField
              inputRef={this.replaceInputRef}
              size="small"
              defaultValue={this.state.presetRule ? this.state.presetRule.value.replace : ""}
              placeholder={"use $0,$1,$2.. as search result"}
              style={{ width: "280px" }}
            />
          </div>
          <div style={space}></div>
          <div style={vertical}>
            <label style={label}>Group&nbsp;&nbsp;</label>
            <TextField
              inputRef={this.groupInputRef}
              size="small"
              inputProps={{ list: "groups" }}
              defaultValue={this.state.presetRule ? this.state.presetRule.group : ""}
              style={{ width: "280px" }}
            />
            <datalist id={"groups"}>
              {this.state.groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </datalist>
          </div>
          <div style={space}></div>
          <div style={vertical}>
            <label style={label}>Run&nbsp;&nbsp;</label>
            <Select
              inputRef={this.runSelectRef}
              size="small"
              defaultValue={this.state.presetRule ? this.state.presetRule.value.runtype : "Auto"}
            >
              <MenuItem value={"Auto"}>Auto</MenuItem>
              <MenuItem value={"Manual"}>Manual</MenuItem>
            </Select>
          </div>
          <div style={{ height: "16px" }}></div>
          <div style={{ textAlign: "right" }}>
            <span>{this.state.findCount}</span>
            <span>&nbsp;&nbsp;</span>
            <Button
              variant="contained"
              color="success"
              style={{ textTransform: "none" }}
              onClick={this.onClickHighlight}
            >
              Highlight
            </Button>
            <span>&nbsp;&nbsp;</span>
            <Button variant="contained" color="success" style={{ textTransform: "none" }} onClick={this.onClickTest}>
              Test
            </Button>
            <span>&nbsp;&nbsp;</span>
            <Button variant="contained" style={{ textTransform: "none" }} onClick={this.onClickSave}>
              Save
            </Button>
            <span>&nbsp;&nbsp;</span>
            <Button variant="contained" style={{ textTransform: "none" }} onClick={this.onClickCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </Dialog>
    );
  }

  renderMain() {
    return (
      <div style={{ marginLeft: "16px", marginRight: "16px" }}>
        <div id={"header"} style={{ position: "fixed", backgroundColor: "white", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", marginTop: "8px" }}>
            <img src={MainIcon} style={{ width: "32px", height: "32px" }} alt={""} />
            <h3 style={{ marginLeft: "8px", fontSize: "medium" }}>Find and replace</h3>
          </div>
          <div style={{ marginTop: "8px" }}>
            <Button variant="contained" style={{ textTransform: "none" }} onClick={this.onClickAddRule}>
              Add rule
            </Button>
            <Button
              variant="contained"
              style={{ textTransform: "none", marginLeft: "16px" }}
              onClick={this.onClickRunAll}
            >
              Run all
            </Button>
            {this.state.currentGroup !== "" && (
              <Button
                variant="contained"
                style={{ textTransform: "none", marginLeft: "16px" }}
                onClick={this.onClickBack}
              >
                Back
              </Button>
            )}
          </div>
          <div style={{ height: "16px" }}></div>
        </div>
        <div id={"header_placeholder"} style={{ width: "100%" }}></div>
        <div style={{ marginTop: "16px" }}>
          <Table size="small" style={{ border: "1px solid lightgrey" }}>
            <TableHead>
              <TableRow style={{ backgroundColor: "lightgrey" }}>
                <TableCell>Rules</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {this.state.currentRules.map((rule) =>
                React.createElement(Rule, {
                  key: this.keyIndex++,
                  rule: rule,
                  runRule: this.runRule,
                  deleteRule: this.deleteRule,
                  deleteGroup: this.deleteGroup,
                  openGroup: this.openGroup,
                  editRule: this.editRule,
                  enableRule: this.enableRule,
                  disableRule: this.disableRule,
                })
              )}
            </TableBody>
          </Table>
        </div>
        <div
          style={{
            width: "100%",
            height: "32px",
          }}
        ></div>
        <div
          style={{
            width: "100%",
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
          <span style={{ marginRight: "32px" }}>{this.state.groupUsage}</span>
          <span style={{ marginRight: "32px" }}>{this.state.allUsage}</span>
        </div>
      </div>
    );
  }

  render() {
    return (
      <div style={{ minWidth: "640px", minHeight: "480px" }}>
        {this.renderMain()}
        {this.renderAddRule()}
      </div>
    );
  }
}
