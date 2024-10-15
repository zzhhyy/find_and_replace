import { KEY } from "./constant";

export function ReadRule(group, find) {
  return new Promise(async (resolve, _) => {
    const syncRules = await chrome.storage.sync.get([group]);
    const localResult = await chrome.storage.local.get([KEY.LOCAL]);
    const localRules = localResult[KEY.LOCAL] ?? {};

    if (syncRules.hasOwnProperty(group) && syncRules[group].hasOwnProperty(find)) {
      resolve(syncRules[group][find]);
    } else if (localRules.hasOwnProperty(group) && localRules[group].hasOwnProperty(find)) {
      resolve(localRules[group][find]);
    } else {
      resolve(null);
    }
  });
}

export function WriteRule(group, find, value) {
  return new Promise(async (resolve, _) => {
    const syncRules = await chrome.storage.sync.get([group]);
    const localResult = await chrome.storage.local.get([KEY.LOCAL]);
    const localRules = localResult[KEY.LOCAL] ?? {};

    if (syncRules.hasOwnProperty(group) && syncRules[group].hasOwnProperty(find)) {
      let rules = syncRules[group];
      rules[find] = value;
      try {
        await chrome.storage.sync.set({ [group]: rules });
        resolve("");
      } catch (_) {
        // Delete the rule in sync
        delete rules[find];
        Object.keys(rules).length === 0
          ? await chrome.storage.sync.remove(group)
          : chrome.storage.sync.set({ [group]: rules });

        rules = localRules[group] ?? {};
        rules[find] = value;
        localRules[group] = rules;
        await chrome.storage.local.set({ [KEY.LOCAL]: localRules });
        resolve("local");
      }
    } else if (localRules.hasOwnProperty(group) && localRules[group].hasOwnProperty(find)) {
      localRules[group][find] = value;
      await chrome.storage.local.set({ [KEY.LOCAL]: localRules });
      resolve("");
    } else {
      let rules = syncRules[group] ?? {};
      rules[find] = value;
      try {
        await chrome.storage.sync.set({ [group]: rules });
        resolve("");
      } catch (_) {
        rules = localRules[group] ?? {};
        rules[find] = value;
        localRules[group] = rules;
        await chrome.storage.local.set({ [KEY.LOCAL]: localRules });
        resolve("local");
      }
    }
  });
}

export function DeleteRule(group, find) {
  return new Promise(async (resolve, _) => {
    let syncEmpty = false;
    let localEmpty = false;

    const syncRules = await chrome.storage.sync.get([group]);
    const localResult = await chrome.storage.local.get([KEY.LOCAL]);
    const localRules = localResult[KEY.LOCAL] ?? {};

    if (syncRules.hasOwnProperty(group)) {
      let rules = syncRules[group];
      if (rules.hasOwnProperty(find)) {
        delete rules[find];
        if (Object.keys(rules).length === 0) {
          await chrome.storage.sync.remove(group);
          syncEmpty = true;
        } else {
          chrome.storage.sync.set({ [group]: rules });
        }
      }
    }

    if (localRules.hasOwnProperty(group)) {
      let rules = localRules[group];
      if (rules.hasOwnProperty(find)) {
        delete rules[find];
        if (Object.keys(rules).length === 0) {
          delete localRules[group];
          localEmpty = true;
        } else {
          localRules[group] = rules;
        }
        await chrome.storage.local.set({ [KEY.LOCAL]: localRules });
      }
    }

    resolve(syncEmpty && localEmpty);
  });
}

export function ReadGroup() {
  return new Promise(async (resolve, _) => {
    const syncRules = await chrome.storage.sync.get(null);
    const localResult = await chrome.storage.local.get([KEY.LOCAL]);
    const localRules = localResult[KEY.LOCAL] ?? {};

    let groups = new Set();

    for (let group in syncRules) {
      if (group.length > 0) {
        groups.add(group);
      }
    }
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
    await chrome.storage.sync.remove([group]);

    const localResult = await chrome.storage.local.get([KEY.LOCAL]);
    const localRules = localResult[KEY.LOCAL] ?? {};
    delete localRules[group];
    await chrome.storage.local.set({ [KEY.LOCAL]: localRules });

    resolve();
  });
}
