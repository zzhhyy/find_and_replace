import React from "react";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { Button, IconButton, Menu, MenuItem } from "@mui/material";

import FolderIcon from "./image/folder.png";
import DocumentIcon from "./image/document.png";
import DocumentNoSyncIcon from "./image/document_nosync.png";
import { CreateContextMenu, CutString } from "./utils";
import i18n from "./i18n/i18n";
import R from "./i18n/R";

export class Rule extends React.Component {
  constructor() {
    super();
    this.state = {
      menuAnchor: null,
      nameWidth: 0,
      paddingSize: 0,
    };
  }

  componentDidMount() {
    this.updateLayout();
  }

  componentDidUpdate(prevProps) {
    if (this.props.width !== prevProps.width) {
      this.updateLayout();
    }
  }

  updateLayout = () => {
    let paddingSize = (this.props.width - 32 - 88 - 68 - 68 - 32) / 10;
    if (paddingSize > 16) {
      paddingSize = 16;
    }
    const nameWidth = this.props.width - paddingSize * 10 - 32 - 68 - 68 - 32;
    this.setState({ nameWidth: nameWidth, paddingSize: paddingSize });
  };

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
    this.onCloseMenu();
  };

  onClickDelete = () => {
    if (this.isGroup()) {
      this.props.deleteGroup(this.props.rule);
    } else {
      this.props.deleteRule(this.props.rule);
    }
    this.onCloseMenu();
    CreateContextMenu(false, false, false);
  };

  onClickMenu = event => {
    this.setState({ menuAnchor: event.currentTarget });
  };

  onCloseMenu = () => {
    this.setState({ menuAnchor: null });
  };

  renderMenu() {
    return (
      <>
        {this.state.menuAnchor && (
          <Menu anchorEl={this.state.menuAnchor} open={true} onClose={this.onCloseMenu} disableScrollLock={true}>
            {!this.isGroup() && (
              <MenuItem onClick={this.onClickDisable}>
                {this.isDisbaled() ? i18n.T(R.Enable) : i18n.T(R.Disable)}
              </MenuItem>
            )}
            <MenuItem onClick={this.onClickDelete}>{i18n.T(R.Delete)}</MenuItem>
          </Menu>
        )}
      </>
    );
  }

  render() {
    return (
      <div
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          borderTop: "1px solid lightgrey",
          paddingTop: "4px",
          paddingBottom: "4px",
        }}
      >
        <div style={{ width: "32px", paddingLeft: this.state.paddingSize, paddingRight: this.state.paddingSize }}>
          <img src={this.isGroup() ? FolderIcon : this.props.rule.local ? DocumentNoSyncIcon : DocumentIcon} alt={""} />
        </div>
        <div style={{ width: this.state.nameWidth, fontSize: "medium", paddingRight: this.state.paddingSize * 2 }}>
          {this.isGroup() ? CutString(this.props.rule.group, 16) : CutString(this.props.rule.find, 16)}
        </div>
        <div style={{ width: "68px", paddingLeft: this.state.paddingSize, paddingRight: this.state.paddingSize }}>
          <Button
            variant="contained"
            disabled={this.isDisbaled()}
            color="success"
            style={{ textTransform: "none" }}
            onClick={this.onClickRun}
          >
            {i18n.T(R.Run)}
          </Button>
        </div>
        <div style={{ width: "68px", paddingLeft: this.state.paddingSize, paddingRight: this.state.paddingSize }}>
          <Button
            variant="contained"
            disabled={this.isDisbaled()}
            color="success"
            style={{ textTransform: "none" }}
            onClick={this.onClickOpenOrEdit}
          >
            {this.isGroup() ? i18n.T(R.Open) : i18n.T(R.Edit)}
          </Button>
        </div>
        <div style={{ width: "32px", paddingLeft: this.state.paddingSize, paddingRight: this.state.paddingSize }}>
          <IconButton onClick={this.onClickMenu}>
            <MoreHorizIcon />
          </IconButton>
          {this.renderMenu()}
        </div>
      </div>
    );
  }
}

export class RuleTable extends React.Component {
  render() {
    return (
      <div style={{ border: "1px solid lightgrey", width: this.props.width, height: "auto", position: "relative" }}>
        <div
          style={{
            width: "auto",
            background: "lightgrey",
            display: "flex",
            alignItems: "center",
            padding: "12px 12px 12px 16px",
          }}
        >
          Rules
        </div>
        {this.props.children}
      </div>
    );
  }
}
