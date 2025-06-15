/*global chrome*/
import React from "react";
import {
  Box,
  CircularProgress,
  Dialog,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  RadioGroup,
  Radio,
  Tab,
  Tabs,
  TextField,
  Select,
  MenuItem,
  Button,
  Switch,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

import { CONTEXT_MENU_ID, KEY, MODE, OPEN_MODE, Profile, SERVER_URL, SETTINGS } from "./constant";
import { CreateContextMenu, GetRule, IsChrome, IsSafari, UpdateRule } from "./utils";
import { ReadGroup } from "./rule";
import i18n from "./i18n/i18n";
import R from "./i18n/R";

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
    if (key === "") key = i18n.T(R.NotSet);
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
            <div style={{ marginLeft: "8px", width: "60px", fontSize: "14px" }}>{this.state.key}</div>
            <Select size="small" style={{ fontSize: "14px", marginLeft: "16px" }} defaultValue={this.state.value} onChange={this.onChange}>
              <MenuItem dense value={"cmd:run_all"} style={{ fontSize: "14px" }}>
                {i18n.T(R.RunAll)}
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
      openMode: "",
      isRunAllMenuOn: false,
      isRunGroupMenuOn: false,
      isRunRuleMenuOn: false,
      groups: [],
      signInState: 0,
      email: "",
    };
    this.initState();
    this.fileRef = React.createRef();
    this.emailRef = React.createRef();
    this.codeRef = React.createRef();
    chrome.storage.local.get([Profile.ID]).then(result => {
      const id = result[Profile.ID];
      if (id) {
        this.setState({ signInState: 3, email: id });
      }
    });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.showSettings !== this.props.showSettings) {
      this.initState();
    }
  }

  initState = async () => {
    const localSettings = await chrome.storage.local.get(null);
    const groups = await ReadGroup();

    const mode = localStorage.getItem(SETTINGS.GENERAL.MODE) ?? MODE.NORMAL;
    const openMode = localSettings[SETTINGS.GENERAL.OPEN_MODE] ?? OPEN_MODE.POP_UP;
    const run_all = localSettings[SETTINGS.CONTEXT_MENU.RUN_ALL] ?? false;
    const run_group = localSettings[SETTINGS.CONTEXT_MENU.RUN_GROUP] ?? false;
    const run_rule = localSettings[SETTINGS.CONTEXT_MENU.RUN_RULE] ?? false;

    this.setState({
      tabIndex: 0,
      mode: mode,
      openMode: openMode,
      isRunAllMenuOn: run_all,
      isRunGroupMenuOn: run_group,
      isRunRuleMenuOn: run_rule,
      groups: groups,
    });
  };

  onTabChange = (event, newValue) => {
    this.setState({ tabIndex: newValue });
  };

  onModeChange = event => {
    localStorage.setItem(SETTINGS.GENERAL.MODE, event.target.value);
    this.setState({ mode: event.target.value });
  };

  onOpenModeChange = event => {
    chrome.action.setPopup({ popup: event.target.value === OPEN_MODE.POP_UP ? "index.html" : "" });
    chrome.storage.local.set({ [SETTINGS.GENERAL.OPEN_MODE]: event.target.value });
    localStorage.setItem(SETTINGS.GENERAL.OPEN_MODE, event.target.value);
    this.setState({ openMode: event.target.value });
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

  onWriteRules = async rules => {
    try {
      if (rules.hasOwnProperty("sync") && rules.hasOwnProperty("local")) {
        const importSyncRules = rules["sync"];
        const importLocalRules = rules["local"];
        for (let [group, rules] of Object.entries(importSyncRules)) {
          if (importLocalRules.hasOwnProperty(group)) {
            importLocalRules[group] = { ...importLocalRules[group], ...rules };
          } else {
            importLocalRules[group] = rules;
          }
        }
        await UpdateRule(importLocalRules, {});
        await chrome.storage.local.set({ [KEY.LOCAL]: importLocalRules });
      } else {
        await UpdateRule(rules, {});
        await chrome.storage.local.set({ [KEY.LOCAL]: rules });
      }

      this.props.onRuleUpdated();
    } catch (_) {
      alert(i18n.T(R.SyncStorageFull));
    }
  };

  onSelectFile = event => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const rules = JSON.parse(event.target.result);
        const localResult = await chrome.storage.local.get([KEY.LOCAL]);
        const localRules = localResult[KEY.LOCAL] ?? {};
        if (Object.keys(localRules).length > 0) {
          if (window.confirm(i18n.T(R.ClearOldRule))) {
            await UpdateRule({}, localRules);
            await chrome.storage.local.remove([KEY.LOCAL]);
            this.onWriteRules(rules);
          }
        } else {
          this.onWriteRules(rules);
        }
      } catch (e) {
        alert(e.toString());
      }
    };
    reader.readAsText(file);
  };

  onImportRules = () => {
    this.fileRef.current.click();
  };

  onExportRules = async () => {
    const localRules = await chrome.storage.local.get([KEY.LOCAL]);
    const rules = localRules[KEY.LOCAL] ?? {};

    let data = JSON.stringify(rules, null, 2);
    let blob = new Blob([data], { type: "application/json" });
    let url = URL.createObjectURL(blob);

    let a = document.createElement("a");
    a.href = url;
    a.download = "rules.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  onSendCode = () => {
    const email = this.emailRef.current.value;
    fetch(SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cmd: "sendcode", email: email }),
    });
    this.setState({ signInState: 1 });
  };

  onSignIn = () => {
    this.setState({ signInState: 2 });
    const email = this.emailRef.current.value;
    const code = this.codeRef.current.value;
    fetch(SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cmd: "signin", email: email, code: code }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.token) {
          chrome.storage.local.set({ [Profile.ID]: email, [Profile.TOKEN]: data.token, [Profile.TIME]: 0 });
          this.setState({ signInState: 3, email: email });
          chrome.storage.local.get([KEY.LOCAL]).then(localResult => {
            const localRules = localResult[KEY.LOCAL] ?? {};
            UpdateRule(localRules, {}).then(() => {
              GetRule().then(() => {
                this.props.onRuleUpdated();
              });
            });
          });
        }
      });
  };

  onSignOut = async () => {
    const id = (await chrome.storage.local.get([Profile.ID]))[Profile.ID];
    const token = (await chrome.storage.local.get([Profile.TOKEN]))[Profile.TOKEN];
    fetch(SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cmd: "signout", email: id, token: token }),
    });
    chrome.storage.local.remove([Profile.ID, Profile.TOKEN, Profile.TIME]);
    this.setState({ signInState: 0 });
  };

  onSyncNow = () => {
    GetRule().then(() => {
      this.props.onRuleUpdated();
      alert("Sync completed");
    });
  };

  renderGeneral() {
    return (
      <div>
        <FormControl>
          <FormLabel>{i18n.T(R.Mode)}</FormLabel>
          <RadioGroup style={{ marginLeft: "16px" }} defaultValue={this.state.mode} onChange={this.onModeChange}>
            <FormControlLabel
              style={{ fontSize: "1rem" }}
              value={MODE.NORMAL}
              control={<Radio size="md" />}
              label={<div style={{ fontSize: "14px" }}>{i18n.T(R.Normal)}</div>}
            />
            <FormControlLabel
              style={{ fontSize: "1rem" }}
              value={MODE.ADVANCED}
              control={<Radio size="md" />}
              label={<div style={{ fontSize: "14px" }}>{i18n.T(R.Advanced)}</div>}
            />
          </RadioGroup>
          <div style={{ width: "100%", height: "16px" }} />
          <FormLabel>{i18n.T(R.OpenIn)}</FormLabel>
          <RadioGroup style={{ marginLeft: "16px" }} defaultValue={this.state.openMode} onChange={this.onOpenModeChange}>
            <FormControlLabel
              style={{ fontSize: "1rem" }}
              value={OPEN_MODE.POP_UP}
              control={<Radio size="md" />}
              label={<div style={{ fontSize: "14px" }}>{i18n.T(R.Popup)}</div>}
            />
            {!IsSafari() && (
              <FormControlLabel
                style={{ fontSize: "1rem" }}
                value={OPEN_MODE.SIDE_PANEL}
                control={<Radio size="md" />}
                label={<div style={{ fontSize: "14px" }}>{i18n.T(R.SidePanel)}</div>}
              />
            )}
            <FormControlLabel
              style={{ fontSize: "1rem" }}
              value={OPEN_MODE.IN_PAGE}
              control={<Radio size="md" />}
              label={<div style={{ fontSize: "14px" }}>{i18n.T(R.InPage)}</div>}
            />
          </RadioGroup>
        </FormControl>
      </div>
    );
  }

  renderSync() {
    return (
      <>
        {this.state.signInState < 2 && (
          <div>
            <TextField inputRef={this.emailRef} size="small" label={i18n.T(R.Email)} variant="outlined" />
            <div style={{ height: "16px" }}></div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <TextField inputRef={this.codeRef} style={{ width: "48%" }} size="small" label={i18n.T(R.Code)} variant="outlined" />
              <Button
                variant="text"
                color="primary"
                style={{ width: "48%", textTransform: "none" }}
                disabled={this.state.signInState > 0}
                onClick={this.onSendCode}
              >
                {i18n.T(R.SendCode)}
              </Button>
            </div>
            <div style={{ height: "16px" }}></div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
              <Button variant="contained" style={{ textTransform: "none" }} onClick={this.onSignIn}>
                {i18n.T(R.SignIn)}
              </Button>
            </div>
          </div>
        )}
        {this.state.signInState === 2 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <CircularProgress />
          </div>
        )}
        {this.state.signInState === 3 && (
          <>
            <div style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <div style={{ width: "80%", fontSize: "16px", fontWeight: "bold", wordWrap: "break-word", wordBreak: "break-word", textAlign: "center" }}>
                {this.state.email}
              </div>
            </div>
            <div style={{ width: "100%", height: "24px" }}></div>
            <div style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <Button variant="contained" color="primary" style={{ fontSize: "1rem", textTransform: "none" }} onClick={this.onSignOut}>
                {i18n.T(R.SignOut)}
              </Button>
            </div>
            <div style={{ width: "100%", height: "24px" }}></div>
            <div style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>
              <Button variant="text" color="primary" style={{ fontSize: "1rem", textTransform: "none" }} onClick={this.onSyncNow}>
                {i18n.T(R.SyncNow)}
              </Button>
            </div>
          </>
        )}
      </>
    );
  }

  renderContextMenu() {
    return (
      <div>
        <div style={{ width: "100%", display: "flex", alignItems: "center", fontSize: "1rem" }}>
          <div style={{ flex: "auto" }}>{i18n.T(R.RunAll)}</div>
          <Switch onChange={this.onRunAllContextMenuChange} defaultChecked={this.state.isRunAllMenuOn} />
        </div>
        <div style={{ width: "100%", display: "flex", alignItems: "center", fontSize: "1rem" }}>
          <div style={{ flex: "auto" }}>{i18n.T(R.RunGroup)}</div>
          <Switch onChange={this.onRunGroupContextMenuChange} defaultChecked={this.state.isRunGroupMenuOn} />
        </div>
        <div style={{ width: "100%", display: "flex", alignItems: "center", fontSize: "1rem" }}>
          <div style={{ flex: "auto" }}>{i18n.T(R.RunRule)}</div>
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
          <Button variant="contained" color="primary" style={{ fontSize: "1rem", textTransform: "none", marginTop: "32px" }} onClick={this.onClickEditKeys}>
            {i18n.T(R.EditKeys)}
          </Button>
        </div>
      </div>
    );
  }

  renderImportExport() {
    return (
      <>
        <div style={{ width: "100%", textAlign: "center" }}>
          <input type="file" ref={this.fileRef} style={{ width: "0", height: "0" }} onChange={this.onSelectFile} />
          <Button inert variant="contained" color="primary" style={{ fontSize: "1rem", textTransform: "none", marginTop: "32px" }} onClick={this.onImportRules}>
            {i18n.T(R.Import)}
          </Button>
          <div style={{ width: "100%", height: "24px" }} />
          <Button variant="contained" color="primary" style={{ fontSize: "1rem", textTransform: "none", marginTop: "32px" }} onClick={this.onExportRules}>
            {i18n.T(R.Export)}
          </Button>
        </div>
      </>
    );
  }

  renderFeedback() {
    return (
      <div style={{ width: "100%", textAlign: "center" }}>
        <a
          style={{ fontSize: "16px" }}
          href="javascript:void(0)"
          onClick={() => {
            chrome.tabs.create({ url: "https://forms.gle/wKEPdkBK4rGB6bma6" });
          }}
        >
          {i18n.T(R.ReportBug)}
        </a>
        <br />
        <div style={{ width: "100%", height: "16px" }} />
        <br />
        <a
          style={{ fontSize: "16px" }}
          href="javascript:void(0)"
          onClick={() => {
            chrome.tabs.create({ url: "https://forms.gle/p9XmzJZmn9nQbuoBA" });
          }}
        >
          {i18n.T(R.ReportTranslationBug)}
        </a>
      </div>
    );
  }

  render() {
    return (
      <Dialog open={this.props.showSettings} onClose={this.props.onCloseSettings} disableScrollLock={true}>
        <div style={{ width: "100%", display: "flex", justifyContent: "end" }}>
          <IconButton style={{ width: "40px", height: "40px", marginTop: "8px", marginRight: "8px" }} onClick={this.props.onCloseSettings}>
            <CloseIcon />
          </IconButton>
        </div>
        <Box sx={{ flexGrow: 1, bgcolor: "background.paper", display: "flex", padding: 1 }}>
          {this.state.mode == MODE.ADVANCED && (
            <>
              <Tabs orientation="vertical" value={this.state.tabIndex} onChange={this.onTabChange} sx={{ borderRight: 1, borderColor: "divider" }}>
                <Tab label={i18n.T(R.General)} style={{ textTransform: "none" }} />
                <Tab label={i18n.T(R.Sync)} style={{ textTransform: "none" }} />
                <Tab label={i18n.T(R.ContextMenu)} style={{ textTransform: "none" }} />
                <Tab label={i18n.T(R.KeyboardShortcuts)} style={{ textTransform: "none" }} />
                <Tab label={i18n.T(R.ImportExport)} style={{ textTransform: "none" }} />
                <Tab label={i18n.T(R.Feedback)} style={{ textTransform: "none" }} />
              </Tabs>
              <TabPanel index={0} value={this.state.tabIndex}>
                {this.renderGeneral()}
              </TabPanel>
              <TabPanel index={1} value={this.state.tabIndex}>
                {this.renderSync()}
              </TabPanel>
              <TabPanel index={2} value={this.state.tabIndex}>
                {this.renderContextMenu()}
              </TabPanel>
              <TabPanel index={3} value={this.state.tabIndex}>
                {this.renderKeyboardShortcuts()}
              </TabPanel>
              <TabPanel index={4} value={this.state.tabIndex}>
                {this.renderImportExport()}
              </TabPanel>
              <TabPanel index={5} value={this.state.tabIndex}>
                {this.renderFeedback()}
              </TabPanel>
            </>
          )}
          {this.state.mode == MODE.NORMAL && (
            <>
              <Tabs orientation="vertical" value={this.state.tabIndex} onChange={this.onTabChange} sx={{ borderRight: 1, borderColor: "divider" }}>
                <Tab label={i18n.T(R.General)} style={{ textTransform: "none" }} />
                <Tab label={i18n.T(R.Feedback)} style={{ textTransform: "none" }} />
              </Tabs>
              <TabPanel index={0} value={this.state.tabIndex}>
                {this.renderGeneral()}
              </TabPanel>
              <TabPanel index={1} value={this.state.tabIndex}>
                {this.renderFeedback()}
              </TabPanel>
            </>
          )}
        </Box>
      </Dialog>
    );
  }
}
