if (typeof far_init === "undefined") {
  far_init = true;
  far_isDragging = false;
  far_offsetX = 0;
  far_offsetY = 0;
  far_newTop = 0;
  far_newRight = 0;
}

function far_onMouseDown(e) {
  if (e.target == document.getElementById("find_and_replace_select")) {
    return;
  }
  const baseDiv = document.getElementById("find_and_replace_in_page");
  const rect = baseDiv.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (x >= 0 && x <= rect.width && y >= 0 && y <= 32) {
    far_isDragging = true;
    far_offsetX = e.clientX - rect.right;
    far_offsetY = e.clientY - rect.top;
  }
}

function far_onMouseMove(e) {
  if (far_isDragging) {
    const baseDiv = document.getElementById("find_and_replace_in_page");
    const rect = baseDiv.getBoundingClientRect();
    far_newRight = window.innerWidth - (e.clientX - far_offsetX);
    far_newTop = e.clientY - far_offsetY;
    if (far_newRight < 0) far_newRight = 0;
    if (far_newTop < 0) far_newTop = 0;
    if (far_newRight + rect.width > window.innerWidth) far_newRight = window.innerWidth - rect.width;
    if (far_newTop + rect.height > window.innerHeight) far_newTop = window.innerHeight - rect.height;
    baseDiv.style.right = `${far_newRight}px`;
    baseDiv.style.top = `${far_newTop}px`;
  }
}

function far_onMouseUp() {
  far_isDragging = false;
  localStorage.setItem("far_newTop", `${far_newTop}px`);
  localStorage.setItem("far_newRight", `${far_newRight}px`);
}

function far_onMouseLeave() {
  far_isDragging = false;
  localStorage.setItem("far_newTop", `${far_newTop}px`);
  localStorage.setItem("far_newRight", `${far_newRight}px`);
}

async function far_language() {
  const languageKey = "settings.general.language";
  const result = await chrome.storage.local.get(languageKey);
  if (result[languageKey]) {
    return result[languageKey];
  }
  let language = navigator.language || navigator.userLanguage;
  let la = language ? language.substring(0, 2) : "en";
  const supportLanguage = new Set(["ar", "de", "en", "es", "fr", "hi", "id", "it", "ja", "ko", "pt", "ru", "vi", "zh"]);
  if (!supportLanguage.has(la)) {
    la = "en";
  }
  return la;
}

function saveNormalRule() {
  const rule = {
    valid: true,
    group: "",
    find: document.getElementById("find_and_replace_find").value.trim(),
    value: {
      domain: null,
      regex: document.getElementById("find_and_replace_regex").checked,
      ignoreCase: document.getElementById("find_and_replace_case_check").checked,
      wholeWord: document.getElementById("find_and_replace_whole_word").checked,
      replace: document.getElementById("find_and_replace_replace").value,
      runtype: "Manual",
      disabled: false,
    },
  };
  chrome.storage.local.get(["normal"], result => {
    let normalRules = result["normal"] ?? {};
    normalRules[location.href] = rule;
    chrome.storage.local.set({ normal: normalRules });
  });
}

async function appendBox() {
  const mainIcon = chrome.runtime.getURL("images/find_and_replace.png");
  const closeIcon = chrome.runtime.getURL("images/close.png");
  const language = await far_language();
  if (document.getElementById("find_and_replace_in_page") != null) {
    return;
  }
  const stringData = {
    ar: {
      AppName: "البحث والاستبدال",
      Popup: "يظهر فجأة",
      SidePanel: "الشريط الجانبي",
      InPage: "داخل الصفحة",
      Find: "يجد",
      Replace: "يستبدل",
      Regex: "التعبير العادي",
      IgnoreCase: "تجاهل الحالة",
      WholeWord: "تطابق الكلمة بأكملها",
      Recover: "استعادة",
      UseParam: "استخدم $0،$1،$2.. كنتائج بحث",
    },
    de: {
      AppName: "Suchen und Ersetzen",
      Popup: "Pop-up",
      SidePanel: "Seitenwand",
      InPage: "Innerhalb der Seite",
      Find: "Finden",
      Replace: "Ersetzen",
      Regex: "Regulärer Ausdruck",
      IgnoreCase: "Groß-/Kleinschreibung ignorieren",
      WholeWord: "Ganzes Wort abgleichen",
      Recover: "Genesen",
      UseParam: "Verwenden Sie $0,$1,$2.. als Suchergebnis",
    },
    en: {
      AppName: "Find and replace",
      Popup: "Pop up",
      SidePanel: "Side panel",
      InPage: "Inside the page",
      Find: "Find",
      Replace: "Replace",
      Regex: "Regex",
      IgnoreCase: "Ignore case",
      WholeWord: "Match whole word",
      Recover: "Recover",
      UseParam: "use $0,$1,$2.. as search result",
    },
    es: {
      AppName: "Buscar y reemplazar",
      Popup: "ventana emergente",
      SidePanel: "barra lateral",
      InPage: "Dentro de la página",
      Find: "Encontrar",
      Replace: "Reemplazar",
      Regex: "Expresión regular",
      IgnoreCase: "ignorar caso",
      WholeWord: "Coincidir con la palabra completa",
      Recover: "Recuperar",
      UseParam: "Utilice $0,$1,$2.. como resultados de búsqueda",
    },
    fr: {
      AppName: "Rechercher et remplacer",
      Popup: "Surgir",
      SidePanel: "Panneau latéral",
      InPage: "À l&#39;intérieur de la page",
      Find: "Trouver",
      Replace: "Remplacer",
      Regex: "expression régulière",
      IgnoreCase: "Ignorer la casse",
      WholeWord: "Associer le mot entier",
      Recover: "Récupérer",
      UseParam: "utilisez $0,$1,$2.. comme résultat de recherche",
    },
    hi: {
      AppName: "ढूँढें और बदलें",
      Popup: "पॉप अप",
      SidePanel: "साइड पैनल",
      InPage: "पेज के अंदर",
      Find: "खोजो",
      Replace: "प्रतिस्थापित करें",
      Regex: "नियमित अभिव्यक्ति",
      IgnoreCase: "मामले को नजरअंदाज करें",
      WholeWord: "पूरे शब्द का मिलान करें",
      Recover: "वापस पाना",
      UseParam: "खोज परिणामों के रूप में $0,$1,$2.. का उपयोग करें",
    },
    id: {
      AppName: "Temukan dan ganti",
      Popup: "Muncul",
      SidePanel: "Panel samping",
      InPage: "Di dalam halaman",
      Find: "Menemukan",
      Replace: "Mengganti",
      Regex: "Ekspresi reguler",
      IgnoreCase: "Abaikan kasus",
      WholeWord: "Cocokkan seluruh kata",
      Recover: "Pulih",
      UseParam: "gunakan $0,$1,$2.. sebagai hasil pencarian",
    },
    it: {
      AppName: "Trova e sostituisci",
      Popup: "Apparire",
      SidePanel: "Pannello laterale",
      InPage: "All&#39;interno della pagina",
      Find: "Trovare",
      Replace: "Sostituire",
      Regex: "Espressione regolare",
      IgnoreCase: "Ignora maiuscole/minuscole",
      WholeWord: "Abbina la parola intera",
      Recover: "Recuperare",
      UseParam: "usa $0,$1,$2.. come risultato della ricerca",
    },
    ja: {
      AppName: "検索と置換",
      Popup: "ポップアップ",
      SidePanel: "サイドパネル",
      InPage: "ページ内",
      Find: "探す",
      Replace: "交換する",
      Regex: "正規表現",
      IgnoreCase: "大文字と小文字を区別しない",
      WholeWord: "単語全体を一致",
      Recover: "回復する",
      UseParam: "検索結果として$0、$1、$2などを使用する",
    },
    ko: {
      AppName: "찾아서 바꾸기",
      Popup: "팝업",
      SidePanel: "사이드 패널",
      InPage: "페이지 내부",
      Find: "찾다",
      Replace: "바꾸다",
      Regex: "정규식",
      IgnoreCase: "대소문자 구분 안 함",
      WholeWord: "전체 단어 일치",
      Recover: "다시 덮다",
      UseParam: "검색 결과로 $0,$1,$2..를 사용하세요",
    },
    pt: {
      AppName: "Localizar e substituir",
      Popup: "Aparecer",
      SidePanel: "Painel lateral",
      InPage: "Dentro da página",
      Find: "Encontrar",
      Replace: "Substituir",
      Regex: "Expressão regular",
      IgnoreCase: "Ignorar maiúsculas e minúsculas",
      WholeWord: "Corresponder a palavra inteira",
      Recover: "Recuperar",
      UseParam: "use $0,$1,$2.. como resultado da pesquisa",
    },
    ru: {
      AppName: "Найти и заменить",
      Popup: "Неожиданно возникнуть",
      SidePanel: "Боковая панель",
      InPage: "Внутри страницы",
      Find: "Находить",
      Replace: "Заменять",
      Regex: "Регулярное выражение",
      IgnoreCase: "Игнорировать регистр",
      WholeWord: "Совпадение целого слова",
      Recover: "Восстанавливаться",
      UseParam: "использовать $0,$1,$2.. как результат поиска",
    },
    vi: {
      AppName: "Tìm và thay thế",
      Popup: "Bật lên",
      SidePanel: "Bảng điều khiển bên",
      InPage: "Bên trong trang",
      Find: "Tìm thấy",
      Replace: "Thay thế",
      Regex: "Biểu thức chính quy",
      IgnoreCase: "Bỏ qua trường hợp",
      WholeWord: "Ghép toàn bộ từ",
      Recover: "Hồi phục",
      UseParam: "sử dụng $0,$1,$2.. làm kết quả tìm kiếm",
    },
    zh: {
      AppName: "查找和替换",
      Popup: "弹出窗口",
      SidePanel: "侧面板",
      InPage: "页面内部",
      Find: "查找",
      Replace: "替换",
      Regex: "正则表达式",
      IgnoreCase: "忽略大小写",
      WholeWord: "匹配整个单词",
      Recover: "复原",
      UseParam: "使用$0,$1,$2..作为搜索结果",
    },
  };
  const baseDiv = document.createElement("div");
  baseDiv.id = "find_and_replace_in_page";
  baseDiv.style.position = "fixed";
  baseDiv.style.minWidth = "360px";
  baseDiv.style.padding = "4px";
  baseDiv.style.top = localStorage.getItem("far_newTop") ?? "16px";
  baseDiv.style.right = localStorage.getItem("far_newRight") ?? "16px";
  baseDiv.style.zIndex = "99999";
  baseDiv.style.color = "black";
  baseDiv.style.backgroundColor = "white";
  baseDiv.style.borderRadius = "4px";
  baseDiv.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.4)";
  baseDiv.onmousedown = far_onMouseDown;
  baseDiv.onmousemove = far_onMouseMove;
  baseDiv.onmouseup = far_onMouseUp;
  baseDiv.onmouseleave = far_onMouseLeave;
  baseDiv.innerHTML = `
    <div style="display: flex; align-items: center;">
      <img src=${mainIcon} style="width: 32px; height:32px;" draggable="false"/>
      <div style="margin-left: 8px; font-size: 14px; font-weight: bold;">${stringData[language].AppName}</div>
      <div style="display: flex; align-items: center; margin-left: auto;">
        <select id="find_and_replace_select" style="margin-right: 16px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; color: black;">
          <option value="in_page">${stringData[language].InPage}</option>
          <option value="pop_up">${stringData[language].Popup}</option>
          <option value="side_panel">${stringData[language].SidePanel}</option>
        </select>
        <img id="find_and_replace_close" src=${closeIcon} style="width: 24px; height:24px;"/>
      </div>
    </div>
    <div style="display: flex; align-items: center; margin-top: 8px;">
      <span style="width: 80px; text-align: right; font-size: 12px;">${stringData[language].Find}</span>
      <input id="find_and_replace_find" style="width: 100%; padding: 4px; margin: 4px 8px; box-sizing: border-box; border: 2px solid #ccc; border-radius: 4px; font-size: 12px; transition: border-color 0.3s;" type="text"/>
    </div>
    <div style="display: flex; align-items: center; justify-content: end; padding-left: 16px; margin-top: 4px;font-size: 12px;">
      <label style="display: flex; align-items: center; color: black;">
        <input id="find_and_replace_regex" type="checkbox"/>${stringData[language].Regex}&nbsp;&nbsp;
      </label>
      <label style="display: flex; align-items: center; color: black;">
        <input id="find_and_replace_case_check" type="checkbox"/>${stringData[language].IgnoreCase}&nbsp;&nbsp;
      </label>
      <label style="display: flex; align-items: center; color: black;">
        <input id="find_and_replace_whole_word" type="checkbox"/>${stringData[language].WholeWord}&nbsp;&nbsp;
      </label>
    </div>
    <div style="display: flex; align-items: center; margin-top: 4px;">
      <span style="width: 80px; text-align: right; font-size: 12px;">${stringData[language].Replace}</span>
      <input id="find_and_replace_replace" style="width: 100%; padding: 4px; margin: 4px 8px; box-sizing: border-box; border: 2px solid #ccc; border-radius: 4px; font-size: 12px; transition: border-color 0.3s;" type="text" placeholder=\"${stringData[language].UseParam}\" />
    </div>
    <div style="display: flex; justify-content: end; margin-top: 8px;font-size: 14px">
      <div id="find_and_replace_do_replace" style="padding: 8px; margin-right: 16px; background-color: rgb(22, 95, 199); color: white; border-radius: 4px; cursor: pointer">${stringData[language].Replace}</div>
      <div id="find_and_replace_do_recover" style="padding: 8px; margin-right: 16px; background-color: rgb(22, 95, 199); color: white; border-radius: 4px; cursor: pointer">${stringData[language].Recover}</div>
    </div>
  `;

  const observer = new MutationObserver(function (mutationsList, observer) {
    for (var mutation of mutationsList) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach(function (node) {
          if (node.id === "find_and_replace_in_page") {
            observer.disconnect();
            document.getElementById("find_and_replace_select").onchange = event => {
              chrome.runtime.sendMessage({ cmd: "open_mode", value: event.target.value });
              if (event.target.value != "in_page") {
                saveNormalRule();
                document.getElementById("find_and_replace_in_page").remove();
              }
            };
            document.getElementById("find_and_replace_do_replace").onclick = () => {
              const find = document.getElementById("find_and_replace_find").value.trim();
              if (find.length === 0) {
                return;
              }
              const rule = {
                valid: true,
                group: "",
                find: find,
                value: {
                  domain: null,
                  regex: document.getElementById("find_and_replace_regex").checked,
                  ignoreCase: document.getElementById("find_and_replace_case_check").checked,
                  wholeWord: document.getElementById("find_and_replace_whole_word").checked,
                  replace: document.getElementById("find_and_replace_replace").value,
                  runtype: "Manual",
                  disabled: false,
                },
                mode: "normal",
              };
              chrome.runtime.sendMessage({ cmd: "replace", rule: rule });
            };
            document.getElementById("find_and_replace_do_recover").onclick = () => {
              chrome.runtime.sendMessage({ cmd: "revocer" });
            };
            document.getElementById("find_and_replace_close").onclick = () => {
              saveNormalRule();
              document.getElementById("find_and_replace_in_page").remove();
            };
          }
        });
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  document.body.append(baseDiv);
  chrome.storage.local.get(["normal"], result => {
    let normalRules = result["normal"] ?? {};
    const rule = normalRules[location.href];
    if (rule != null) {
      document.getElementById("find_and_replace_find").value = rule.find || "";
      document.getElementById("find_and_replace_replace").value = rule.value.replace || "";
      document.getElementById("find_and_replace_regex").checked = rule.value.regex || false;
      document.getElementById("find_and_replace_case_check").checked = rule.value.ignoreCase || false;
      document.getElementById("find_and_replace_whole_word").checked = rule.value.wholeWord || false;
    }
  });
}

async function far_in_page_main() {
  const result = await chrome.storage.local.get(["in_page", "url"]);
  const in_page = result["in_page"] ?? false;
  const url = result["url"] ?? "";
  chrome.storage.local.remove(["in_page", "url"]);
  if (in_page != true || url != location.href) {
    return;
  }
  appendBox();
}

far_in_page_main();
