/*global chrome*/
import React from "react";
import {
  Box,
  Dialog,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  RadioGroup,
  Radio,
  Tab,
  Tabs,
  Select,
  MenuItem,
  Button,
  Switch,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

import { CONTEXT_MENU_ID, OPEN_MODE, SETTINGS } from "./constant";
import { CreateContextMenu, IsChrome } from "./utils";

class TabPanel extends React.Component {
  render() {
    return (
      <div role="tabpanel" hidden={this.props.index !== this.props.value} style={{ width: "240px", height: "280px" }}>
        {this.props.index === this.props.value && <Box paddingLeft={1}>{this.props.children}</Box>}
      </div>
    );
  }
}

class Shortcut extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      value: null,
      key: null,
    };
    this.initState();
  }

  async initState() {
    const result = await chrome.storage.local.get(this.props.cmd);
    const value = result[this.props.cmd] ?? "";

    const commands = await chrome.commands.getAll();
    let key = "";
    for (const cmd of commands) {
      if (cmd.name === this.props.cmd) {
        key = cmd.shortcut;
        break;
      }
    }
    if (key === "") key = "Not set";
    this.setState({ value: value, key: key });
  }

  onChange = event => {
    chrome.storage.local.set({ [this.props.cmd]: event.target.value });
  };

  render() {
    return (
      this.state.value !== null && (
        <>
          <div style={{ display: "flex", alignItems: "center", paddingTop: "4px", paddingBottom: "4px" }}>
            <div style={{ width: "16px" }}>{this.props.desc}</div>
            <div style={{ marginLeft: "8px", width: "48px", fontSize: "14px" }}>{this.state.key}</div>
            <Select
              size="small"
              style={{ fontSize: "14px", marginLeft: "16px" }}
              defaultValue={this.state.value}
              onChange={this.onChange}
            >
              <MenuItem dense value={"cmd:run_all"} style={{ fontSize: "14px" }}>
                Run all
              </MenuItem>
              {this.props.groups.length > 0 && (
                <MenuItem dense disabled style={{ fontSize: "14px" }}>
                  ------
                </MenuItem>
              )}
              {this.props.groups.map(group => (
                <MenuItem dense key={group} style={{ fontSize: "14px" }} value={`group:${group}`}>
                  {group}
                </MenuItem>
              ))}
            </Select>
          </div>
        </>
      )
    );
  }
}

export class Settings extends React.Component {
  constructor() {
    super();
    this.state = {
      tabIndex: 0,
      isSidePanel: false,
      isRunAllMenuOn: false,
      isRunGroupMenuOn: false,
      isRunRuleMenuOn: false,
      groups: [],
    };
    this.initState();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.showSettings !== this.props.showSettings) {
      this.initState();
    }
  }

  initState = async () => {
    const localSettings = await chrome.storage.local.get(null);
    const rules = await chrome.storage.sync.get(null);

    let groups = [];
    for (const group in rules) {
      if (group.length > 0) {
        groups.push(group);
      }
    }

    const isSidePanel = localSettings[SETTINGS.GENERAL.OPEN_MODE] !== OPEN_MODE.POP_UP;
    const run_all = localSettings[SETTINGS.CONTEXT_MENU.RUN_ALL] ?? false;
    const run_group = localSettings[SETTINGS.CONTEXT_MENU.RUN_GROUP] ?? false;
    const run_rule = localSettings[SETTINGS.CONTEXT_MENU.RUN_RULE] ?? false;

    this.setState({
      tabIndex: 0,
      isSidePanel: isSidePanel,
      isRunAllMenuOn: run_all,
      isRunGroupMenuOn: run_group,
      isRunRuleMenuOn: run_rule,
      groups: groups,
    });
  };

  onTabChange = (event, newValue) => {
    this.setState({ tabIndex: newValue });
  };

  onOpenModeChange = event => {
    if (event.target.value === OPEN_MODE.SIDE_PANEL) {
      chrome.storage.local.set({ [SETTINGS.GENERAL.OPEN_MODE]: OPEN_MODE.SIDE_PANEL });
      chrome.action.setPopup({ popup: "" });
    } else {
      chrome.storage.local.set({ [SETTINGS.GENERAL.OPEN_MODE]: OPEN_MODE.POP_UP });
      chrome.action.setPopup({ popup: "index.html" });
    }
    localStorage.setItem(SETTINGS.GENERAL.OPEN_MODE, event.target.value);
  };

  onRunAllContextMenuChange = event => {
    chrome.storage.local.set({ [SETTINGS.CONTEXT_MENU.RUN_ALL]: event.target.checked }, () => {
      if (event.target.checked) {
        CreateContextMenu(true, false, false);
      } else {
        chrome.contextMenus.remove(CONTEXT_MENU_ID.RUN_ALL);
      }
    });
  };

  onRunGroupContextMenuChange = event => {
    chrome.storage.local.set({ [SETTINGS.CONTEXT_MENU.RUN_GROUP]: event.target.checked }, () => {
      if (event.target.checked) {
        CreateContextMenu(false, true, false);
      } else {
        chrome.contextMenus.remove(CONTEXT_MENU_ID.RUN_GROUP);
      }
    });
  };

  onRunRuleContextMenuChange = event => {
    chrome.storage.local.set({ [SETTINGS.CONTEXT_MENU.RUN_RULE]: event.target.checked }, () => {
      if (event.target.checked) {
        CreateContextMenu(false, false, true);
      } else {
        chrome.contextMenus.remove(CONTEXT_MENU_ID.RUN_RULE);
      }
    });
  };

  onClickEditKeys = () => {
    if (IsChrome()) {
      chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
    } else {
      chrome.tabs.create({ url: "edge://extensions/shortcuts" });
    }
    this.props.onCloseSettings();
  };

  renderGeneral() {
    return (
      <div>
        <FormControl>
          <FormLabel>Open in</FormLabel>
          <RadioGroup
            row
            defaultValue={this.state.isSidePanel ? OPEN_MODE.SIDE_PANEL : OPEN_MODE.POP_UP}
            onChange={this.onOpenModeChange}
          >
            <FormControlLabel
              style={{ fontSize: "1rem" }}
              value={OPEN_MODE.POP_UP}
              control={<Radio size="md" />}
              label={<div style={{ fontSize: "14px" }}>Pop up</div>}
            />
            <FormControlLabel
              style={{ fontSize: "1rem" }}
              value={OPEN_MODE.SIDE_PANEL}
              control={<Radio size="md" />}
              label={<div style={{ fontSize: "14px" }}>Side panel</div>}
            />
          </RadioGroup>
        </FormControl>
      </div>
    );
  }

  renderContextMenu() {
    return (
      <div>
        <div style={{ width: "100%", display: "flex", alignItems: "center", fontSize: "1rem" }}>
          <div style={{ flex: "auto" }}>Run all</div>
          <Switch onChange={this.onRunAllContextMenuChange} defaultChecked={this.state.isRunAllMenuOn} />
        </div>
        <div style={{ width: "100%", display: "flex", alignItems: "center", fontSize: "1rem" }}>
          <div style={{ flex: "auto" }}>Run group</div>
          <Switch onChange={this.onRunGroupContextMenuChange} defaultChecked={this.state.isRunGroupMenuOn} />
        </div>
        <div style={{ width: "100%", display: "flex", alignItems: "center", fontSize: "1rem" }}>
          <div style={{ flex: "auto" }}>Run rule</div>
          <Switch onChange={this.onRunRuleContextMenuChange} defaultChecked={this.state.isRunRuleMenuOn} />
        </div>
      </div>
    );
  }

  renderKeyboardShortcuts() {
    return (
      <div style={{ fontSize: "1rem" }}>
        <Shortcut desc={"1"} cmd={SETTINGS.KEYBOARD_SHORTCUT.CMD1} groups={this.state.groups} />
        <Shortcut desc={"2"} cmd={SETTINGS.KEYBOARD_SHORTCUT.CMD2} groups={this.state.groups} />
        <Shortcut desc={"3"} cmd={SETTINGS.KEYBOARD_SHORTCUT.CMD3} groups={this.state.groups} />
        <Shortcut desc={"4"} cmd={SETTINGS.KEYBOARD_SHORTCUT.CMD4} groups={this.state.groups} />
        <div style={{ width: "100%", textAlign: "center" }}>
          <Button
            variant="contained"
            color="primary"
            style={{ fontSize: "1rem", textTransform: "none", marginTop: "32px" }}
            onClick={this.onClickEditKeys}
          >
            Edit keys
          </Button>
        </div>
      </div>
    );
  }

  render() {
    return (
      <Dialog open={this.props.showSettings} onClose={this.props.onCloseSettings}>
        <div style={{ width: "100%", display: "flex", justifyContent: "end" }}>
          <IconButton
            style={{ width: "40px", height: "40px", marginTop: "8px", marginRight: "8px" }}
            onClick={this.props.onCloseSettings}
          >
            <CloseIcon />
          </IconButton>
        </div>
        <Box sx={{ flexGrow: 1, bgcolor: "background.paper", display: "flex", padding: 1 }}>
          <Tabs
            orientation="vertical"
            value={this.state.tabIndex}
            onChange={this.onTabChange}
            sx={{ borderRight: 1, borderColor: "divider" }}
          >
            <Tab label="General" style={{ textTransform: "none" }} />
            <Tab label="Context menu" style={{ textTransform: "none" }} />
            <Tab label="Keyboard shortcuts" style={{ textTransform: "none" }} />
          </Tabs>
          <TabPanel index={0} value={this.state.tabIndex}>
            {this.renderGeneral()}
          </TabPanel>
          <TabPanel index={1} value={this.state.tabIndex}>
            {this.renderContextMenu()}
          </TabPanel>
          <TabPanel index={2} value={this.state.tabIndex}>
            {this.renderKeyboardShortcuts()}
          </TabPanel>
        </Box>
      </Dialog>
    );
  }
}
