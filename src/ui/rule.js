import { KEY } from "./constant";

export function ReadRule(group, find) {
  return new Promise(async (resolve, _) => {
    const localResult = await chrome.storage.local.get([KEY.LOCAL]);
    const localRules = localResult[KEY.LOCAL] ?? {};

    if (localRules.hasOwnProperty(group) && localRules[group].hasOwnProperty(find)) {
      resolve(localRules[group][find]);
    } else {
      resolve(null);
    }
  });
}

export function WriteRule(group, find, value) {
  return new Promise(async (resolve, _) => {
    const localResult = await chrome.storage.local.get([KEY.LOCAL]);
    let localRules = localResult[KEY.LOCAL] ?? {};
    let rules = localRules[group] ?? {};
    rules[find] = value;
    localRules[group] = rules;
    await chrome.storage.local.set({ [KEY.LOCAL]: localRules });
    resolve();
  });
}

export function DeleteRule(group, find) {
  return new Promise(async (resolve, _) => {
    let empty = false;
    const localResult = await chrome.storage.local.get([KEY.LOCAL]);
    let localRules = localResult[KEY.LOCAL] ?? {};

    if (localRules.hasOwnProperty(group)) {
      let rules = localRules[group];
      if (rules.hasOwnProperty(find)) {
        delete rules[find];
        if (Object.keys(rules).length === 0) {
          delete localRules[group];
          empty = true;
        } else {
          localRules[group] = rules;
        }
        await chrome.storage.local.set({ [KEY.LOCAL]: localRules });
      }
    }
    resolve(empty);
  });
}

export function ReadGroup() {
  return new Promise(async (resolve, _) => {
    const localResult = await chrome.storage.local.get([KEY.LOCAL]);
    const localRules = localResult[KEY.LOCAL] ?? {};

    let groups = new Set();
    for (let group in localRules) {
      if (group.length > 0) {
        groups.add(group);
      }
    }
    resolve(Array.from(groups));
  });
}

export function DeleteGroup(group) {
  return new Promise(async (resolve, _) => {
    const localResult = await chrome.storage.local.get([KEY.LOCAL]);
    let localRules = localResult[KEY.LOCAL] ?? {};
    delete localRules[group];
    await chrome.storage.local.set({ [KEY.LOCAL]: localRules });
    resolve();
  });
}
