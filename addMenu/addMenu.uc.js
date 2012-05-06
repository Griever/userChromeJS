// ==UserScript==
// @name           addMenu.uc.js
// @description    メニューを拡張する userChromeJS 用のスクリプト
// @namespace      http://d.hatena.ne.jp/Griever/
// @author         Griever
// @include        main
// @license        MIT License
// @compatibility  Firefox 5
// @charset        UTF-8
// @version        0.0.4
// @note           0.0.4 アイコン用の CSS を追加
// @note           0.0.4 設定ファイルから CSS を追加できるようにした
// @note           0.0.4 label の無い menu を splitmenu 風の動作にした
// @note           0.0.4 Vista でアイコンがズレる問題を修正…したかも
// @note           0.0.4 %SEL% の改行が消えてしまうのを修正
// @note           0.0.3 keyword の新しい書式で古い書式が動かない場合があったのを修正
// @note           %URL_HTMLIFIED%, %EOL_ENCODE% が変換できなかったミスを修正
// @note           %LINK_OR_URL% 変数を作成（リンク URL がなければページの URL を返す）
// @note           タブの右クリックメニューでは %URL% や %SEL% はそのタブのものを返すようにした
// @note           keyword で "g %URL%" のような記述を可能にした
// @note           ツールの再読み込みメニューの右クリックで設定ファイルを開くようにした
// ==/UserScript==

/***** 説明 *****

◆ これは何？ ◆
メニューを拡張する userChromeJS 用のスクリプトです。
作成に当たっては Copy URL Lite+ を参考にさせていただきました。
・http://www.code-404.net/articles/browsers/copy-url-lite


◆ 使い方 ◆
設定ファイル（_addmenu.js）を chrome フォルダにおいてください。
.uc.js の方はどこでも構いません。

ブラウザ起動後に設定ファイルが読み込まれ、メニューが追加されます。
設定ファイルの再読み込みはツールメニューから行えます。


◆ 書式 ◆
page, tab, too, app 関数にメニューの素となるオブジェクトを渡す。
オブジェクトのプロパティがそのまま menuitem の属性になります。

○exec
  外部アプリを起動します。
  パラメータは text プロパティを利用します。
  アプリのアイコンが自動で付きます。

○keyword
  ブックマークや検索エンジンのキーワードを指定します。
  text プロパティがあればそれを利用して検索などをします。
  検索エンジンなどのアイコンが自動で付きます。

○text（変数が利用可能）
  クリップボードにコピーしたい文字列を指定します。（Copy URL Lite+ 互換）
  keyword, exec があればそれらの補助に使われます。

○url（変数が利用可能）
  開きたい URL を指定します。
  内容によっては自動的にアイコンが付きます。

○where
  keyword, url でのページの開き方を指定できます（current, tab, tabshifted, window）
  省略するとブックマークのように左クリックと中クリックを使い分けられます。

○condition
  メニューを表示する条件を指定します。（Copy URL Lite+ 互換）
  省略すると url や text プロパティから自動的に表示/非表示が決まります。
  select, link, mailto, image, media, input, noselect, nolink, nomailto, noimage, nomedia, noinput から組み合わせて使います。

○oncommand, command
  これらがある時は condition 以外の特殊なプロパティは無視されます。


◆ サブメニュー ◆
PageMenu, TabMenu, ToolMenu, AppMenu 関数を使って自由に追加できます。


◆ 利用可能な変数 ◆
%EOL%            改行(\r\n)
%TITLE%          ページタイトル
%URL%            URI
%SEL%            選択範囲の文字列
%RLINK%          リンクアンカー先の URL
%IMAGE_URL%      画像の URL
%IMAGE_ALT%      画像の alt 属性
%IMAGE_TITLE%    画像の title 属性
%LINK%           リンクアンカー先の URL
%LINK_TEXT%      リンクのテキスト
%RLINK_TEXT%     リンクのテキスト
%MEDIA_URL%      メディアの URL
%CLIPBOARD%      クリップボードの内容
%FAVICON%        Favicon の URL
%EMAIL%          リンク先の E-mail アドレス
%HOST%           ページのホスト(ドメイン)
%LINK_HOST%      リンクのホスト(ドメイン)
%RLINK_HOST%     リンクのホスト(ドメイン)
%LINK_OR_URL%    リンクの URL が取れなければページの URL
%RLINK_OR_URL%   リンクの URL が取れなければページの URL

%XXX_HTMLIFIED%  HTML エンコードされた上記変数（XXX → TITLE などに読み替える）
%XXX_HTML%       HTML エンコードされた上記変数
%XXX_ENCODE%     URI  エンコードされた上記変数

◇ 簡易的な変数 ◇
%h               ページのホスト(ドメイン)
%i               画像の URL
%l               リンクの URL
%m               メディアの URL
%p               クリップボードの内容
%s               選択文字列
%t               ページのタイトル
%u               ページの URL

基本的に Copy URL Lite+ の変数はそのまま使えます。
大文字・小文字は区別しません。

*/

(function(css){

let { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

if (window.addMenu) {
	window.addMenu.destroy();
	delete window.addMenu;
}

window.addMenu = {
	get prefs() {
		delete this.prefs;
		return this.prefs = Services.prefs.getBranch("addMenu.")
	},
	get FILE() {
		let aFile;
		try {
			// addMenu.FILE_PATH があればそれを使う
			aFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile)
			aFile.initWithPath(this.prefs.getCharPref("FILE_PATH"));
		} catch (e) {
			aFile = Services.dirsvc.get("UChrm", Ci.nsILocalFile);
			aFile.appendRelativePath("_addmenu.js");
		}
		delete this.FILE;
		return this.FILE = aFile;
	},
	get focusedWindow() {
		return gContextMenu && gContextMenu.target ? gContextMenu.target.ownerDocument.defaultView : content;
	},
	init: function() {
		let he = "(?:_HTML(?:IFIED)?|_ENCODE)?";
		let rTITLE     = "%TITLE"+ he +"%|%t\\b";
		let rURL       = "%(?:R?LINK_OR_)?URL"+ he +"%|%u\\b";
		let rHOST      = "%HOST"+ he +"%|%h\\b";
		let rSEL       = "%SEL"+ he +"%|%s\\b";
		let rLINK      = "%R?LINK(?:_TEXT|_HOST)?"+ he +"%|%l\\b";
		let rIMAGE     = "%IMAGE(?:_URL|_ALT|_TITLE)"+ he +"%|%i\\b";
		let rMEDIA     = "%MEDIA_URL"+ he +"%|%m\\b";
		let rCLIPBOARD = "%CLIPBOARD"+ he +"%|%p\\b";
		let rFAVICON   = "%FAVICON"+ he +"%";
		let rEMAIL     = "%EMAIL"+ he +"%";
		let rExt       = "%EOL"+ he +"%";

		this.rTITLE     = new RegExp(rTITLE, "i");
		this.rURL       = new RegExp(rURL, "i");
		this.rHOST      = new RegExp(rHOST, "i");
		this.rSEL       = new RegExp(rSEL, "i");
		this.rLINK      = new RegExp(rLINK, "i");
		this.rIMAGE     = new RegExp(rIMAGE, "i");
		this.rMEDIA     = new RegExp(rMEDIA, "i");
		this.rCLIPBOARD = new RegExp(rCLIPBOARD, "i");
		this.rFAVICON   = new RegExp(rFAVICON, "i");
		this.rEMAIL     = new RegExp(rEMAIL, "i");
		this.rExt       = new RegExp(rExt, "i");
		this.regexp     = new RegExp(
			[rTITLE, rURL, rHOST, rSEL, rLINK, rIMAGE, rMEDIA, rCLIPBOARD, rFAVICON, rEMAIL, rExt].join("|"), "ig");

		var ins;
		ins = $("context-viewinfo");
		ins.parentNode.insertBefore($E(<menuseparator id="addMenu-page-insertpoint" class="addMenu-insert-point" />), ins.nextSibling);
		ins = $("context_closeTab");
		ins.parentNode.insertBefore($E(<menuseparator id="addMenu-tab-insertpoint" class="addMenu-insert-point" />), ins.nextSibling);
		ins = $("prefSep");
		ins.parentNode.insertBefore($E(<menuseparator id="addMenu-tool-insertpoint" class="addMenu-insert-point" />), ins.nextSibling);
		ins = $("appmenu-quit");
		ins.parentNode.insertBefore($E(<menuseparator id="addMenu-app-insertpoint" class="addMenu-insert-point" />), ins);
		ins = $("devToolsSeparator");
		ins.parentNode.insertBefore($E(
			<menuitem id="addMenu-rebuild"
			          label={U("addMenu の再読み込み")}
			          oncommand="setTimeout(function(){ addMenu.rebuild(true); }, 10);"
			          onclick="if (event.button == 2) { event.preventDefault(); addMenu.edit(addMenu.FILE); }" />
		), ins);

		$("contentAreaContextMenu").addEventListener("popupshowing", this, false);
		this.style = addStyle(css);
		this.rebuild();
	},
	uninit: function() {
		$("contentAreaContextMenu").removeEventListener("popupshowing", this, false);
	},
	destroy: function() {
		this.uninit();
		this.removeMenuitem();
		$$('#addMenu-rebuild, .addMenu-insert-point').forEach(function(e) e.parentNode.removeChild(e));
		if (this.style && this.style.parentNode) this.style.parentNode.removeChild(this.style);
		if (this.style2 && this.style2.parentNode) this.style2.parentNode.removeChild(this.style2);
	},
	handleEvent: function(event) {
		switch(event.type){
			case "popupshowing":
				if (event.target != event.currentTarget) return;
				var state = [];
				if (gContextMenu.onTextInput) 
					state.push("input");
				if (gContextMenu.isTextSelected || 
				    gContextMenu.onTextInput && this.getInputSelection(gContextMenu.target))
					state.push("select");
				if (gContextMenu.onLink)
					state.push(gContextMenu.onMailtoLink ? "mailto" : "link");
				if (gContextMenu.onCanvas)
					state.push("canvas image");
				if (gContextMenu.onImage)
					state.push("image");
				if (gContextMenu.onVideo || gContextMenu.onAudio)
					state.push("media");
				event.currentTarget.setAttribute("addMenu", state.join(" "));
				break;
		}
	},
	onCommand: function(event) {
		var menuitem = event.target;
		var text     = menuitem.getAttribute("text") || "";
		var keyword  = menuitem.getAttribute("keyword") || "";
		var url      = menuitem.getAttribute("url") || "";
		var where    = menuitem.getAttribute("where") || "";
		var exec     = menuitem.getAttribute("exec") || "";

		if (keyword) {
			let kw = keyword + (text? " " + (text = this.convertText(text)) : "");
			let newurl = getShortcutOrURI(kw);
			if (newurl == kw && text)
				return this.log(U("キーワードが見つかりません: ") + keyword);
			this.openCommand(event, newurl, where);
		}
		else if (url)
			this.openCommand(event, this.convertText(url), where);
		else if (exec)
			this.exec(exec, this.convertText(text));
		else if (text) 
			this.copy(this.convertText(text));
	},
	openCommand: function(event, url, where) {
		var uri;
		try {
			uri = Services.io.newURI(url, null, null);
		} catch (e) {
			return this.log(U("URL が不正です: ") + url);
		}
		if (uri.scheme === "javascript")
			loadURI(url);
		else if (where)
			openUILinkIn(uri.spec, where);
		else if (event.button == 1)
			openNewTabWith(uri.spec);
		else openUILink(uri.spec, event);
	},
	exec: function(path, arg){
		var file    = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
		var process = Cc['@mozilla.org/process/util;1'].createInstance(Ci.nsIProcess);
		try {
			var a = (typeof arg == 'string' || arg instanceof String) ? arg.split(/\s+/) : [arg];
			file.initWithPath(path);
			process.init(file);
			process.run(false, a, a.length);
		} catch(e) {
			this.log(e);
		}
	},
	rebuild: function(isAlert) {
		var aFile = this.FILE;
		if (!aFile || !aFile.exists() || !aFile.isFile()) {
			this.log(aFile? aFile.path : U("設定ファイル") +  U(" が見つかりません"));
			return;
		}

		var aiueo = [
			{ current: "page", submenu: "PageMenu", insertId: "addMenu-page-insertpoint" },
			{ current: "tab" , submenu: "TabMenu" , insertId: "addMenu-tab-insertpoint"  },
			{ current: "tool", submenu: "ToolMenu", insertId: "addMenu-tool-insertpoint" },
			{ current: "app" , submenu: "AppMenu" , insertId: "addMenu-app-insertpoint"  }
		];

		var data = loadText(aFile);
		var sandbox = new Cu.Sandbox( new XPCNativeWrapper(window) );
		sandbox.Components = Components;
		sandbox.Cc = Cc;
		sandbox.Ci = Ci;
		sandbox.Cr = Cr;
		sandbox.Cu = Cu;
		sandbox.Services = Services;
		sandbox.locale = Services.prefs.getCharPref("general.useragent.locale");
		sandbox.include = function(aLeafName) {
			try {
				let aFile = addMenu.FILE.parent;
				aFile.QueryInterface(Ci.nsILocalFile);
				aFile.appendRelativePath(aLeafName);
				if (!aFile.exists() || !aFile.isFile())
					throw U(aLeafName + " が見つかりません");

				let fileURL = Services.io.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler).getURLSpecFromFile(aFile);
				return Services.scriptloader.loadSubScript(fileURL + "?" + new Date().getTime(), sandbox, "UTF-8");
			} catch (e) {
				Cu.reportError(e);
			}
		};
		sandbox._css = [];

		aiueo.forEach(function({ current, submenu }){
			sandbox["_" + current] = [];
			sandbox[current] = function(itemObj) {
				ps(itemObj, sandbox["_" + current]);
			}
			sandbox[submenu] = function(menuObj) {
				menuObj._items = []
				sandbox["_" + current].push(menuObj);
				return function(itemObj) {
					ps(itemObj, menuObj._items);
				}
			}
		}, this);

		function ps(item, array) {
			("join" in item && "unshift" in item) ?
				[].push.apply(array, item) : 
				array.push(item);
		}

		try {
			Cu.evalInSandbox("function css(code){ this._css.push(code+'') };\n" + data, sandbox, "1.8");
		} catch (e) {
			return this.log(e);
		}
		if (this.style2 && this.style2.parentNode)
			this.style2.parentNode.removeChild(this.style2);
		if (sandbox._css.length) 
			this.style2 = addStyle(sandbox._css.join("\n"));

		this.removeMenuitem();

		aiueo.forEach(function({ current, submenu, insertId }){
			if (!sandbox["_" + current] || sandbox["_" + current].length == 0) return;
			let insertPoint = $(insertId);
			this.createMenuitem(sandbox["_" + current], insertPoint);
		}, this);

		if (isAlert) this.alert(U("設定を再読み込みしました"));
	},
	newMenu: function(menuObj) {
		var menu = document.createElement("menu");
		var popup = menu.appendChild(document.createElement("menupopup"));
		for (let [key, val] in Iterator(menuObj)) {
			if (key === "_items") continue;
			if (typeof val == "function")
				menuObj[key] = val = "(" + val.toSource() + ").call(this, event);"
			menu.setAttribute(key, val);
		}
		let cls = menu.classList;
		cls.add("addMenu");
		cls.add("menu-iconic");

		// 表示 / 非表示の設定
		if (menuObj.condition)
			this.setCondition(menu, menuObj.condition);

		menuObj._items.forEach(function(obj) {
			popup.appendChild(this.newMenuitem(obj));
		}, this);

		// menu に label が無い場合、最初の menuitem の label 等を持ってくる
		// menu 部分をクリックで実行できるようにする(splitmenu みたいな感じ)
		if (!menu.hasAttribute('label')) {
			let firstItem = menu.querySelector('menuitem');
			if (firstItem) {
				let command = firstItem.getAttribute('command');
				if (command)
					firstItem = document.getElementById(command) || firstItem;
				['label','accesskey','image','icon'].forEach(function(n){
					if (!menu.hasAttribute(n) && firstItem.hasAttribute(n))
						menu.setAttribute(n, firstItem.getAttribute(n));
				}, this);
				menu.setAttribute('onclick', <![CDATA[
					if (event.target != event.currentTarget) return;
					var firstItem = event.currentTarget.querySelector('menuitem');
					if (!firstItem) return;
					if (event.button === 1) {
						checkForMiddleClick(firstItem, event);
					} else {
						firstItem.doCommand();
						closeMenus(event.currentTarget);
					}
				]]>.toString());
			}
		}
		return menu;
	},
	newMenuitem: function(obj) {
		var menuitem;
		// label == separator か必要なプロパティが足りない場合は区切りとみなす
		if (obj.label === "separator" || 
		    (!obj.label && !obj.text && !obj.keyword && !obj.url && !obj.oncommand && !obj.command)) {
			menuitem = document.createElement("menuseparator");
		} else if (obj.oncommand || obj.command) {
			let org = obj.command ? document.getElementById(obj.command) : null;
			if (org && org.localName === "menuseparator") {
				menuitem = document.createElement("menuseparator");
			} else {
				menuitem = document.createElement("menuitem");
				if (obj.command)
					menuitem.setAttribute("command", obj.command);
				if (!obj.label) 
					obj.label = obj.command || obj.oncommand;
			}
		} else {
			menuitem = document.createElement("menuitem");
			// property fix
			if (!obj.label)
				obj.label = obj.exec || obj.keyword || obj.url || obj.text;

			if (obj.keyword && !obj.text) {
				let index = obj.keyword.search(/\s+/);
				if (index > 0) {
					obj.text = obj.keyword.substr(index).trim();
					obj.keyword = obj.keyword.substr(0, index);
				}
			}

			if (obj.where && /\b(tab|tabshifted|window|current)\b/i.test(obj.where))
				obj.where = RegExp.$1.toLowerCase();

			if (obj.where && !("acceltext" in obj))
				obj.acceltext = obj.where;

			if (!obj.condition && (obj.url || obj.text)) {
				// 表示 / 非表示の自動設定
				let condition = "";
				if (this.rSEL.test(obj.url || obj.text))   condition += " select";
				if (this.rLINK.test(obj.url || obj.text))  condition += " link";
				if (this.rEMAIL.test(obj.url || obj.text)) condition += " mailto";
				if (this.rIMAGE.test(obj.url || obj.text)) condition += " image";
				if (this.rMEDIA.test(obj.url || obj.text)) condition += " media";
				if (condition)
					obj.condition = condition;
			}
		}

		// obj を属性にする
		for (let [key, val] in Iterator(obj)) {
			if (key === "command") continue;
			if (typeof val == "function")
				obj[key] = val = "(" + val.toSource() + ").call(this, event);";
			menuitem.setAttribute(key, val);
		}
		var cls = menuitem.classList;
		cls.add("addMenu");
		cls.add("menuitem-iconic");

		// 表示 / 非表示の設定
		if (obj.condition)
			this.setCondition(menuitem, obj.condition);

		// separator はここで終了
		if (menuitem.localName == "menuseparator")
			return menuitem;

		if (!obj.onclick)
			menuitem.setAttribute("onclick", "checkForMiddleClick(this, event)");

		// oncommand, command はここで終了
		if (obj.oncommand || obj.command)
			return menuitem;

		menuitem.setAttribute("oncommand", "addMenu.onCommand(event);");

		// 可能ならばアイコンを付ける
		this.setIcon(menuitem, obj);

		return menuitem;
	},
	createMenuitem: function(itemArray, insertPoint) {
		var chldren = $A(insertPoint.parentNode.children);
		for (let [, obj] in Iterator(itemArray)) {
			if (!obj) continue;
			let menuitem = obj._items ? this.newMenu(obj) : this.newMenuitem(obj);
			let ins;
			if (obj.insertAfter && (ins = $(obj.insertAfter))) {
				ins.parentNode.insertBefore(menuitem, ins.nextSibling);
				continue;
			}
			if (obj.insertBefore && (ins = $(obj.insertBefore))) {
				ins.parentNode.insertBefore(menuitem, ins);
				continue;
			}
			if (obj.position && parseInt(obj.position, 10) > 0) {
				(ins = chldren[parseInt(obj.position, 10)-1]) ?
					ins.parentNode.insertBefore(menuitem, ins):
					insertPoint.parentNode.appendChild(menuitem);
				continue;
			}
			insertPoint.parentNode.insertBefore(menuitem, insertPoint);
		}
	},
	removeMenuitem: function() {
		$$('menu.addMenu').forEach(function(e) e.parentNode.removeChild(e) );
		$$('.addMenu').forEach(function(e) e.parentNode.removeChild(e) );
	},
	setIcon: function(menu, obj) {
		if (menu.hasAttribute("src") || menu.hasAttribute("image") || menu.hasAttribute("icon"))
			return;

		if (obj.exec) {
			var aFile = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
			try {
				aFile.initWithPath(obj.exec);
			} catch (e) {
				return;
			}
			if (!aFile.exists() || !aFile.isExecutable()) {
				menu.setAttribute("disabled", "true");
			} else {
				let fileURL = Services.io.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler).getURLSpecFromFile(aFile);
				menu.setAttribute("image", "moz-icon://" + fileURL + "?size=16");
			}
			return;
		}

		if (obj.keyword) {
			let engine = Services.search.getEngineByAlias(obj.keyword);
			if (engine && engine.iconURI) {
				menu.setAttribute("image", engine.iconURI.spec);
				return;
			}
		}

		let url = obj.keyword ? getShortcutOrURI(obj.keyword) : obj.url ? obj.url.replace(this.regexp, "") : "";
		if (!url) return;

		let uri, iconURI;
		try {
			uri = Services.io.newURI(url, null, null);
		} catch (e) { }
		if (!uri) return;

		menu.setAttribute("scheme", uri.scheme);
		try {
			iconURI = PlacesUtils.favicons.getFaviconForPage(uri);
		} catch (e) { }
		try {
			// javascript: URI の host にアクセスするとエラー
			menu.setAttribute("image", iconURI && iconURI.spec?
				"moz-anno:favicon:" + iconURI.spec:
				"moz-anno:favicon:" + uri.scheme + "://" + uri.host + "/favicon.ico");
		} catch (e) { }
	},
	setCondition: function(menu, condition) {
		if (/\bnormal\b/i.test(condition)) {
			menu.setAttribute("condition", "normal");
		} else {
			let match = condition.toLowerCase().match(/\b(?:no)?(?:select|link|mailto|image|canvas|media|input)\b/ig);
			if (!match || !match[0])
				return;
			match = match.filter(function(c,i,a) a.indexOf(c) === i);
			menu.setAttribute("condition", match.join(" "));
		}
	},
	convertText: function(text) {
		var that = this;
		var context = gContextMenu || { // とりあえずエラーにならないようにオブジェクトをでっち上げる
			link: { href: "", host: "" },
			target: { alt: "", title: "" },
			__noSuchMethod__: function(id, args) "",
		};
		var tab = document.popupNode && document.popupNode.localName == "tab" ? document.popupNode : null;
		var win = tab ? tab.linkedBrowser.contentWindow : this.focusedWindow;

		return text.replace(this.regexp, function(str){
			str = str.toUpperCase().replace("%LINK", "%RLINK");
			if (str.indexOf("_HTMLIFIED") >= 0)
				return htmlEscape(convert(str.replace("_HTMLIFIED", "")));
			if (str.indexOf("_HTML") >= 0)
				return htmlEscape(convert(str.replace("_HTML", "")));
			if (str.indexOf("_ENCODE") >= 0)
				return encodeURIComponent(convert(str.replace("_ENCODE", "")));
			return convert(str);
		});

		function convert(str) {
			switch(str) {
				case "%T"            : return win.document.title;
				case "%TITLE%"       : return win.document.title;
				case "%U"            : return win.location.href;
				case "%URL%"         : return win.location.href;
				case "%H"            : return win.location.host;
				case "%HOST%"        : return win.location.host;
				case "%S"            : return that.getSelection(win) || "";
				case "%SEL%"         : return that.getSelection(win) || "";
				case "%L"            : return context.linkURL || "";
				case "%RLINK%"       : return context.linkURL || "";
				case "%RLINK_HOST%"  : return context.link.host || "";
				case "%RLINK_TEXT%"  : return context.linkText() || "";
				case "%RLINK_OR_URL%": return context.linkURL || win.location.href;
				case "%IMAGE_ALT%"   : return context.target.alt || "";
				case "%IMAGE_TITLE%" : return context.target.title || "";
				case "%I"            : return context.imageURL || "";
				case "%IMAGE_URL%"   : return context.imageURL || "";
				case "%M"            : return context.mediaURL || "";
				case "%MEDIA_URL%"   : return context.mediaURL || "";
				case "%P"            : return readFromClipboard() || "";
				case "%CLIPBOARD%"   : return readFromClipboard() || "";
				case "%FAVICON%"     : return gBrowser.getIcon(tab ? tab : null) || "";
				case "%EMAIL%"       : return getEmailAddress() || "";
				case "%EOL%"         : return "\r\n";
			}
			return str;
		}
		function htmlEscape(s) {
			return (s+"").replace(/&/g, "&amp;").replace(/>/g, "&gt;").replace(/</g, "&lt;").replace(/\"/g, "&quot;").replace(/\'/g, "&apos;");
		};

		function getEmailAddress() {
			var url = context.linkURL;
			if (!url || !/^mailto:([^?]+).*/i.test(url)) return "";
			var addresses = RegExp.$1;
			try {
				var characterSet = context.target.ownerDocument.characterSet;
				const textToSubURI = Cc['@mozilla.org/intl/texttosuburi;1'].getService(Ci.nsITextToSubURI);
				addresses = textToSubURI.unEscapeURIForUI(characterSet, addresses);
			} catch (ex) {
			}
			return addresses;
		}
	},
	getSelection: function(win) {
		win || (win = this.focusedWindow);
		return this.getRangeAll(win).join(" ") || this.getInputSelection(win.document.activeElement);
	},
	getRangeAll: function(win) {
		win || (win = this.focusedWindow);
		var sel = win.getSelection();
		var res = [];
		for (var i = 0; i < sel.rangeCount; i++) {
			res.push(sel.getRangeAt(i));
		};
		return res;
	},
	getInputSelection: function(elem) {
		if (elem instanceof HTMLTextAreaElement || elem instanceof HTMLInputElement && elem.mozIsTextField(false))
			return elem.value.substring(elem.selectionStart, elem.selectionEnd);
		return "";
	},
	edit: function(aFile) {
		if (!aFile || !aFile.exists() || !aFile.isFile()) return;
		var editor = Services.prefs.getCharPref("view_source.editor.path");
		if (!editor) return this.log(U("エディタのパスが未設定です。\n view_source.editor.path を設定してください"));
		try {
			var UI = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
			UI.charset = window.navigator.platform.toLowerCase().indexOf("win") >= 0? "Shift_JIS": "UTF-8";
			var path = UI.ConvertFromUnicode(aFile.path);
			this.exec(editor, path);
		} catch (e) {}
	},
	copy: function(aText) {
		Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper).copyString(aText);
		XULBrowserWindow.statusTextField.label = "Copy: " + aText;
	},
	alert: function(aString, aTitle) {
		Cc['@mozilla.org/alerts-service;1'].getService(Ci.nsIAlertsService)
			.showAlertNotification("", aTitle||"addMenu" , aString, false, "", null);
	},
	$$: function(exp, context, aPartly) {
		context || (context = this.focusedWindow.document);
		var doc = context.ownerDocument || context;
		var elements = $$(exp, doc);
		if (arguments.length <= 2)
			return elements;
		var sel = doc.defaultView.getSelection();
		return elements.filter(function(q) sel.containsNode(q, aPartly));
	},
	log: log,
};

window.addMenu.init();

function $(id) { return document.getElementById(id); }
function $$(exp, doc) { return Array.prototype.slice.call((doc || document).querySelectorAll(exp)); }
function $A(args) { return Array.prototype.slice.call(args); }
function log() { Application.console.log(Array.slice(arguments)); }
function U(text) 1 < 'あ'.length ? decodeURIComponent(escape(text)) : text;
function $E(xml, doc) {
	doc = doc || document;
	xml = <root xmlns={doc.documentElement.namespaceURI}/>.appendChild(xml);
	var settings = XML.settings();
	XML.prettyPrinting = false;
	var root = new DOMParser().parseFromString(xml.toXMLString(), 'application/xml').documentElement;
	XML.setSettings(settings);
	doc.adoptNode(root);
	var range = doc.createRange();
	range.selectNodeContents(root);
	var frag = range.extractContents();
	range.detach();
	return frag.childNodes.length < 2 ? frag.firstChild : frag;
}
function addStyle(css) {
	var pi = document.createProcessingInstruction(
		'xml-stylesheet',
		'type="text/css" href="data:text/css;utf-8,' + encodeURIComponent(css) + '"'
	);
	return document.insertBefore(pi, document.documentElement);
}

function loadText(aFile) {
	var fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
	var sstream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
	fstream.init(aFile, -1, 0, 0);
	sstream.init(fstream);

	var data = sstream.read(sstream.available());
	try { data = decodeURIComponent(escape(data)); } catch(e) {}
	sstream.close();
	fstream.close();
	return data;
}


})(<![CDATA[
#contentAreaContextMenu:not([addMenu~="select"]) .addMenu[condition~="select"],
#contentAreaContextMenu:not([addMenu~="link"])   .addMenu[condition~="link"],
#contentAreaContextMenu:not([addMenu~="mailto"]) .addMenu[condition~="mailto"],
#contentAreaContextMenu:not([addMenu~="image"])  .addMenu[condition~="image"],
#contentAreaContextMenu:not([addMenu~="canvas"])  .addMenu[condition~="canvas"],
#contentAreaContextMenu:not([addMenu~="media"])  .addMenu[condition~="media"],
#contentAreaContextMenu:not([addMenu~="input"])  .addMenu[condition~="input"],
#contentAreaContextMenu[addMenu~="select"] .addMenu[condition~="noselect"],
#contentAreaContextMenu[addMenu~="link"]   .addMenu[condition~="nolink"],
#contentAreaContextMenu[addMenu~="mailto"] .addMenu[condition~="nomailto"],
#contentAreaContextMenu[addMenu~="image"]  .addMenu[condition~="noimage"],
#contentAreaContextMenu[addMenu~="canvas"]  .addMenu[condition~="nocanvas"],
#contentAreaContextMenu[addMenu~="media"]  .addMenu[condition~="nomedia"],
#contentAreaContextMenu[addMenu~="input"]  .addMenu[condition~="noinput"],
#contentAreaContextMenu:not([addMenu=""])  .addMenu[condition~="normal"]
  { display: none; }

.addMenu-insert-point
  { display: none !important; }


.addMenu[url] {
  list-style-image: url("chrome://mozapps/skin/places/defaultFavicon.png");
}

.addMenu.exec,
.addMenu[exec] {
  list-style-image: url("chrome://browser/skin/aboutSessionRestore-window-icon.png");
}

.addMenu.copy,
menuitem.addMenu[text]:not([url]):not([keyword]):not([exec])
{
  list-style-image: url("chrome://browser/skin/appmenu-icons.png");
  -moz-image-region: rect(0pt, 32px, 16px, 16px);
}

.addMenu.checkbox .menu-iconic-icon {
  -moz-appearance: checkbox;
}

.addMenu > .menu-iconic-left {
  -moz-appearance: menuimage;
}


.addMenu:-moz-any([icon="back"], [command="context-back"], [command^="Browser:Back"]) {
	list-style-image: url("chrome://browser/skin/Toolbar.png");
	-moz-image-region: rect(0, 18px, 18px, 0);
}
.addMenu:-moz-any([icon="forward"], [command="context-forward"], [command^="Browser:Forward"]) {
	list-style-image: url("chrome://browser/skin/Toolbar.png");
	-moz-image-region: rect(0, 36px, 18px, 18px);
}
.addMenu:-moz-any([icon="stop"], [command="context-stop"], [command="Browser:Stop"]) {
	list-style-image: url("chrome://browser/skin/Toolbar.png");
	-moz-image-region: rect(0, 54px, 18px, 36px);
}
.addMenu:-moz-any([icon="reload"], [command="context-reload"], [command^="Browser:Reload"]) {
	list-style-image: url("chrome://browser/skin/Toolbar.png");
	-moz-image-region: rect(0, 72px, 18px, 54px);
}
.addMenu:-moz-any([icon="home"], [command="Browser:Home"]) {
	list-style-image: url("chrome://browser/skin/Toolbar.png");
	-moz-image-region: rect(0, 90px, 18px, 72px);
}
.addMenu:-moz-any([icon="download"]) {
	list-style-image: url("chrome://browser/skin/Toolbar.png");
	-moz-image-region: rect(0, 108px, 18px, 90px);
}
.addMenu:-moz-any([icon="history"]) {
	list-style-image: url("chrome://browser/skin/Toolbar.png");
	-moz-image-region: rect(0, 126px, 18px, 108px);
}
.addMenu:-moz-any([icon="bookmark"]) {
	list-style-image: url("chrome://browser/skin/Toolbar.png");
	-moz-image-region: rect(0, 144px, 18px, 126px);
}
.addMenu:-moz-any([icon="print"]) {
	list-style-image: url("chrome://browser/skin/Toolbar.png");
	-moz-image-region: rect(0, 162px, 18px, 144px);
}
.addMenu:-moz-any([icon="newtab"], [command="context-openlinkintab"]) {
	list-style-image: url("chrome://browser/skin/Toolbar.png");
	-moz-image-region: rect(0, 180px, 18px, 162px);
}
.addMenu:-moz-any([icon="newwindow"], [command="context-openlink"]) {
	list-style-image: url("chrome://browser/skin/Toolbar.png");
	-moz-image-region: rect(0, 198px, 18px, 180px);
}
.addMenu:-moz-any([icon="copy"]) {
	list-style-image: url("chrome://browser/skin/Toolbar.png");
	-moz-image-region: rect(0, 234px, 18px, 216px);
}
.addMenu:-moz-any([icon="paste"]) {
	list-style-image: url("chrome://browser/skin/Toolbar.png");
	-moz-image-region: rect(0, 252px, 18px, 234px);
}
.addMenu:-moz-any([icon="fullscreen"]) {
	list-style-image: url("chrome://browser/skin/Toolbar.png");
	-moz-image-region: rect(0, 270px, 18px, 252px);
}
.addMenu:-moz-any([icon="zoomout"], [icon="plus"]) {
	list-style-image: url("chrome://browser/skin/Toolbar.png");
	-moz-image-region: rect(0, 288px, 18px, 270px);
}
.addMenu:-moz-any([icon="zoomin"], [icon="minus"]) {
	list-style-image: url("chrome://browser/skin/Toolbar.png");
	-moz-image-region: rect(0, 306px, 18px, 288px);
}
.addMenu:-moz-any([icon="sync"]) {
	list-style-image: url("chrome://browser/skin/Toolbar.png");
	-moz-image-region: rect(0, 324px, 18px, 306px);
}
.addMenu:-moz-any([icon="feed"]) {
	list-style-image: url("chrome://browser/skin/Toolbar.png");
	-moz-image-region: rect(0, 342px, 18px, 324px);
}


.addMenu:-moz-any([icon="star"], [command^="context-bookmark"]) {
	list-style-image: url("chrome://browser/skin/places/editBookmark.png");
	-moz-image-region: rect(0px, 16px, 16px, 0px);
}
.addMenu:-moz-any([icon="feed2"]) {
	list-style-image: url("chrome://browser/skin/feeds/feedIcon16.png");
}
.addMenu:-moz-any([icon="search"], [command="context-searchselect"]) {
	list-style-image: url("chrome://global/skin/icons/Search-glass.png");
	-moz-image-region: rect(0px, 16px, 16px, 0px);
}
.addMenu:-moz-any([icon="starbutton"]) {
	list-style-image: none;
}
.addMenu:-moz-any([icon="starbutton"]) > hbox > .menu-iconic-icon {
	background: transparent no-repeat center center -moz-element(#star-button);
}
.addMenu:-moz-any([icon="close"]) {
	list-style-image: url("chrome://global/skin/icons/close.png");
	-moz-image-region: rect(0, 16px, 16px, 0);
}
.addMenu:-moz-any([icon="close"]):hover {
	-moz-image-region: rect(0, 32px, 16px, 16px);
}
.addMenu:-moz-any([icon="close"]):hover:active {
	-moz-image-region: rect(0, 48px, 16px, 32px);
}
.addMenu:-moz-any([icon="newtab2"]) {
	list-style-image: url("chrome://browser/skin/tabbrowser/newtab.png");
}
.addMenu:-moz-any([icon="firefox"]) {
	list-style-image: url("chrome://branding/content/icon16.png");
}
.addMenu:-moz-any([icon="url"], [command="context-openlinkincurrent"]) {
	list-style-image: url("chrome://mozapps/skin/places/defaultFavicon.png");
}
.addMenu:-moz-any([icon="exec"]) {
	list-style-image: url("chrome://browser/skin/aboutSessionRestore-window-icon.png");
}
.addMenu:-moz-any([icon="checkbox"]) .menu-iconic-icon {
	-moz-appearance: checkbox;
	display: -moz-box;
}
.addMenu:-moz-any([icon="cut"], [command="context-cut"]) {
	list-style-image: url("chrome://browser/skin/appmenu-icons.png");
	-moz-image-region: rect(0 16px 16px 0);
}
.addMenu:-moz-any([icon="copy2"], [command^="context-copy"]) {
	list-style-image: url("chrome://browser/skin/appmenu-icons.png");
	-moz-image-region: rect(0, 32px, 16px, 16px);
}
.addMenu:-moz-any([icon="paste2"], [command="context-paste"]) {
	list-style-image: url("chrome://browser/skin/appmenu-icons.png");
	-moz-image-region: rect(0 48px 16px 32px);
}
.addMenu:-moz-any([icon="print2"]) {
	list-style-image: url("chrome://browser/skin/appmenu-icons.png");
	-moz-image-region: rect(0 64px 16px 48px);
}
.addMenu:-moz-any([icon="quit"]) {
	list-style-image: url("chrome://browser/skin/appmenu-icons.png");
	-moz-image-region: rect(0 80px 16px 64px);
}
.addMenu:-moz-any([icon="privacy"], [command="Tools:PrivateBrowsing"]) {
	list-style-image: url("chrome://browser/skin/Privacy-16.png");
}
.addMenu:-moz-any([icon="addons"], [icon="addon"]) {
	list-style-image: url("chrome://mozapps/skin/extensions/extensionGeneric-16.png");
}
.addMenu:-moz-any([icon="folder"]) {
	list-style-image: url("chrome://global/skin/icons/folder-item.png");
	-moz-image-region: rect(0px, 32px, 16px, 16px);
}
.addMenu:-moz-any([icon="livemark"]) {
	list-style-image: url("chrome://browser/skin/livemark-folder.png");
}
.addMenu:-moz-any([icon="query"]) {
	list-style-image: url("chrome://browser/skin/places/query.png");
}
.addMenu:-moz-any([icon="calendar"]) {
	list-style-image: url("chrome://browser/skin/places/calendar.png");
}
.addMenu:-moz-any([icon="menuback"]) {
	list-style-image: url("chrome://browser/skin/menu-back.png");
}
.addMenu:-moz-any([icon="menuforward"]) {
	list-style-image: url("chrome://browser/skin/menu-forward.png");
}
.addMenu:-moz-any([icon="tabview"]) {
	list-style-image: url("chrome://browser/skin/tabview/tabview.png");
	-moz-image-region: rect(0, 90px, 18px, 72px);
}

.addMenu:-moz-any([icon="minimize"]) {
	list-style-image: url("chrome://global/skin/icons/windowControls.png");
	-moz-image-region: rect(0, 16px, 16px, 0);
}
.addMenu:-moz-any([icon="minimize"]):hover {
	-moz-image-region: rect(16px, 16px, 32px, 0);
}
.addMenu:-moz-any([icon="minimize"]):hover:active {
	-moz-image-region: rect(32px, 16px, 48px, 0);
}
.addMenu:-moz-any([icon="restore"]) {
	list-style-image: url("chrome://global/skin/icons/windowControls.png");
	-moz-image-region: rect(0, 32px, 16px, 16px);
}
.addMenu:-moz-any([icon="restore"]):hover {
	-moz-image-region: rect(16px, 32px, 32px, 16px);
}
.addMenu:-moz-any([icon="restore"]):hover:active {
	-moz-image-region: rect(32px, 32px, 48px, 16px);
}
.addMenu:-moz-any([icon="quit2"]) {
	list-style-image: url("chrome://global/skin/icons/windowControls.png");
	-moz-image-region: rect(0, 48px, 16px, 32px);
}
.addMenu:-moz-any([icon="quit2"]):hover {
	-moz-image-region: rect(16px, 48px, 32px, 32px);
}
.addMenu:-moz-any([icon="quit2"]):hover:active {
	-moz-image-region: rect(32px, 48px, 48px, 32px);
}


.addMenu:-moz-any([icon="jpg"], [icon="jpeg"]) {
	list-style-image: url("moz-icon://.jpg?size=16");
}
.addMenu:-moz-any([icon="png"]) {
	list-style-image: url("moz-icon://.png?size=16");
}
.addMenu:-moz-any([icon="gif"]) {
	list-style-image: url("moz-icon://.gif?size=16");
}
.addMenu:-moz-any([icon="js"], [icon="javascript"]) {
	list-style-image: url("moz-icon://.js?size=16");
}


/* famfamfam */
.addMenu:-moz-any([icon="save"], [command^="context-save"]) {
	list-style-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAC50lEQVQ4jY2Q21MbBRhH9z+iIRurjv4XvsqlCYQFtNJYIGk7OuNDx4EO1tFpy7VJNCkVrUKhZkN1cHCaALZQB4dL7pEmoblCuptssnt8gOn41OHhPJ7z++YTxJ7AgLlH/soiyRsWSS6KUlATJdmw9MpYpBPe7gvy7kfLvNMv81avXHrvorwu2hc+EARBECySPLGVUNhKqNQaBmrDQKnrlF81OSxrFI4aKHUdVdN5WWkQz9WM5Wf5xofXw3nRPm8VRCm4sxVX+Gw2h6IZKJqOdSRE8bjBYaXBkdKk1jCoKE1S+Tr7mRqBzSLLm3ne/zhQE0QpWN6MK1zzZ6koTSpKE+tIiFxFo1htoGo6Sl0nW9aIZmvsv1BxepL8sV3CbF8yBFEKahvRV1zzZ8iWNbJlja7RMLmyxnFNp6YZlKpN4rk6+xmV3QOVIXeCeysZRPsigijJRjhS5aovQzJfJ5mvky7UKVabqJrOsapzUNBeyzsHCoMzMbyP/8XcvYBg6ZV5slvl6vcvsI6EsI2G6b4Rpu/mOv031+kZW8M2EsL6PxwTe0wHkpi75hEskszqzhEubxqnJ43Tm8blTeHypHB5kgy7kwzOxLk8HcMxFWVgYh/HZIQ7D6OYbT+fBFa2j05kT/pUTOHyphh2Jxm6m2BwJsanUzEckxEuje9xaXyXbx7s0Wr96STw+HkZpyd1SvL1+tDdBIPTMS5PR3FMRhgY3+WT2ztcvP0PN+5v03phDsEiBZA3SzjdKWoN40z0f/s3X/qeY+q8j3C+V+bR0xLD7iSqZnD99843otR1pK+f8YXnKaaOWYTzfTKLG0Wcp4GVyG9vRKnr2Mf+4vOpDUwdfgSLFDDm1wo43YkzX2AbXePKeJiWNp8hiFIgNvfnS+ZWD8/8gyt3QgzfekJLu68giPZfx8z2R4vmnqWiaF9CtD/E3L2AuesXWm0PaLX+iOnCD5g6ZzF13ONcu5+WNp9xru27Sku7f/U/n64QFJ0JfmcAAAAASUVORK5CYII=");
}
.addMenu:-moz-any([icon="copy3"]) {
	list-style-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABHUlEQVQ4jZWSUYrCQBBES++xi3cQ43k80grexT8RlXznGpEgJDqZ7h6o/UnCaMasO1A/w/C6qqYB4BvACkCW0ALAHH+clapKCIGxvPfcbrc/n0CyEALbtmXTNLzdbizLkiEEOue42+16yDTAe0/nHOu65vV6HZyYGQGsOxezTmOAmdF7z8fjwbquWRQF9/s98zwngE0HSXaTxdN6J4fDgarKT7rJ4gc95Hg88tNustcpIsLT6cSpbkII7OKMAarK8/nMVDdVVQ1ORgAzo5lRVXm5XEaxnHNDnEkHZsY8z0d3IkLnHO/3+xNggfEKrwFsUtFEhG3bPgEQLUivOYB1ypmqDt8bA17PLNVNrH8BUhKRBsDyHeBdN7GWAL5+AXSfOyX5jHKEAAAAAElFTkSuQmCC");
}
.addMenu:-moz-any([icon="send"], [command^="context-send"]) {
	list-style-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACV0lEQVQ4jcWT3UtTcRzGz7/jlXddFFQSYm84CCIQISS6LCHQ6I3SpvhyhC5aBRVRQuUgNMuIfDnOJm46ceS7m9N5pm5nZ7p5dnbO7/zO9/d0MS/sPvCBz+XzgefikaRjz4NXU8rT3sV8o2+O3+iJUIMcoevyDNV3TVNdZ5iudYToavsUXfFOkqc1SJdbJtxLLYpVc3dArfDIivSsbyluOyQKpgvm4h+cI3AX4AS4BBglDm3fpqpmf0y692ZeHJQ4fN9UxNMMe6bAWoYQ1wgJnZDMEVL7ArsFgZIDbGoM3r4trKYKqO0OCanRFwXjhIHZAnzfVSQyDAVL/FPUDAHLAVSdofPLFp4P56EXbXi6Q5Bu9kTAOGF+m/A1UpZsagwmAzRDIFcUYBzYzjHI/SrejufxY9lFzjgU1LWFwThhOU1Y2CH4J3Po6ItD1RkYL+/f2WNo/xTH67EclJgLJXZE4HkYBOOElQwhmmQYnM7iY1DHyyEV67sWEmkLL4ZU9E7o+BzUEFizMblxKJBDkKqbArA54Y/K8HNORzRpY2mXMLJYxLuxDN6PZTAyX8TCDiGcsNA/ncXvmA39wIanOwzp5K1RYTIXw1EdSymGDV1gIyuQyArEsgLxrMC6JhDTCCtpwuymjcEZDWrWQG3XlJAq6z8k9gybUrop8iZHweIwLI6izWEyFyZzUWIuLObCcsroBYtmVjNWVZN/XarwyEplQ//+idu/nFPNo/zMfYWffTTOzz0e59VPArzGG+DnvQF+oa3MxfYJp6Z1uHj6jj9Z4ZGV437Sf8hf1IBPDl2Qkw0AAAAASUVORK5CYII=");
}
.addMenu:-moz-any([icon="edit"], [command="context-viewsource"], [command="context-viewpartialsource-selection"]) {
	list-style-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACAklEQVQ4jY2Tz2sTURSFr/4TIijoQkTBVUrWUlCDbgoK0lCLFBH8gTtrIy5cZNEWRI2LWigFpVCktFhEoWAUrRBiQdomaSI2JqaJ6USaTGYy897Le+Nx4TgYSVoPfMvzweVyiH5nHxH5iMi/AweIaDe1iY9zrkspHaUU2sE5RyQSedhJ4pdSOo1GA5ZledTrddRqNWiaBqUUiqkZZKbO48vzMJYnTmAlcqSfiGgXEfmVUmCMQQgBxhgYYzBNE7quo1KpwCzOoRwdhL76AjBLqK3OIDZ6crNFIITwYIzBtm0YhoHNz9Oort2F2JhH+e0o7MQsVH4RiclLrEUgpfRullKCcw59YwHV5B049iLs7DVsfbyO9NMBfHoc1N+MBA63CP7FKL1GNTEEh8VgrfeDFYIw1kIoPOnBlcDBPrfbXlBKzqG8NOiWL4B960U9eRvZ8dOwSkm4b20vKKXmkV64Ccd+B5YbAC/0QU8MYX0sAEP7CqVUZ0H6/RRSL0NYeXUfxfg5WLkgtpZvITvRA+tHDpzz7QXPhrsBI4/M+FlEQ3vxYSyA2L1TML9nwDnfWRC+fAwi9ggi/gDx8HHMXj2EaiGJZrPpsa2gt3sPhi8eRXTkDJamb6Cu5SGlbKGT4GenHbTBcQVeuoQQllKq45j+LgshTHe9XvYTUdd/zPkPPrdDvwBzfHXHWIsRUwAAAABJRU5ErkJggg==");
}
.addMenu:-moz-any([icon="info"], [command="context-viewinfo"], [command="context-viewimageinfo"]) {
	list-style-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACtElEQVQ4ja2T20/ScRjG+Vv02gv4dlNb86K5VgwwybYO5DBNPFzgStIUK8WAMCSIQxMxDA9QpGKJSlDgz7SQCYim/nJgBm1tdQMeluXTRRuszXnRerb38vls7/M+L4Pxv1WsXcxn66NStiZKn1CF0oXKYLpQOUcfV76VHmv35h9q5uhi/JNd4VR1bxi9vgSc1Cac1CYsnjiEhjmQZk+K2TzBP9B8WhfjF6kWMqrRVbhDKZgnE5A5PuDO0DI0rlU4/BvocMZAakYyzLrhvyHsrmheUWcoqRpdhet9Ci1Dy2i0RTA4/QmDgQ00WMOQPInA+modsqdhkAp7sqC8Py8LKNLMt1Z1hzAW/IImWwyS3jCu9Sxga3cPW7t7EPcEITYHIXkcgu11HBeUEyDn+1qzgML7QdriSUDronG9dwH1PSGIu4Po863D6ltHjYn6M8ZpyBwRGCZXQErNdBZwVEZtD7/7jKa+MMTmedQ+mkWNkQIA7AMQ6QOo0r1Blc6POmMADioOUqLbzgKOtPi2n89uosEaRo2JQrVhGiL9NGKJ78js7KGyy4cKtRdX1F6IHnhhn4mD8DQ5AJFO0d0eGopnS6g1zkL0MICr2jdYjH9DZucHyu9NoVw5AaHSjRtmClp3FISnzq1AGsZbBRofBv0J1OopiDR+uIMb+PlrH/sAwh+/QiAbg0DmgulFDKU3nSA8dS7EgmpnHhHZk7ftC7B61lCp8UKomsRlxTgE7S5cahvBxbZhdNpDaLTNgMVVJAvY8twZGQwGg1k2wGeetWRaBoKwTK1A0h2AUPkSZR1jqNd7YXBFIOmjQDjtGSZHfnAbmfwePuGbUudujUI7voT+AI3+wBq6xqI40+QA4cpSTI7sYHM2j2JtPinRSVnFGprFU6RZ3LtpwpXThCuXklMthz/Tv+g3HdPOfoYYAaMAAAAASUVORK5CYII=");
}
.addMenu:-moz-any([icon="blank"]) {
	list-style-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABEUlEQVQ4jZWTW27CQAxFTdfRSt0DiH0WIbFDEAGUMJN47LHp7UfDKDxSmiudv7lHskcm+s07Ec2JaPmCTyJ6oyeZi0hjZhd3xzNEBKvV6mtMsjSzS9u26LqucD6fUdc19vs93B273Q7r9fpBMiOipbsjpQRVRUoJKSXEGNE0DaqqgruDmdG2LTabzVVyK1DVQkoJzIwQAg6Hw8NI/U5mNwIzKw/MDCJSRjkej6iqCtvtdlxwz1ASQkBd1zidTv8XDCXMjBgjQgjTBO6OnDNUFcwMZp4uMLOyXBH5n8DMCjln5JwhItMF1/KQSb/wjDHB9197uOPSC0oWqtq5++gxDcuqGvvrLfkgogW9Pucr875DP1s1i/OTwNbrAAAAAElFTkSuQmCC");
}
.addMenu:-moz-any([icon="application"]) {
	list-style-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABuklEQVQ4ja3T3UvTURzH8fMfOpQSkR4opIvRmmODbSJESYFRIFIkJWKS26xIKcKiMLzqiaJQsJpdBcq0tN9+z99zfu8uzjZ22+wDn9sX33PO9yh11PRlKulry9tuebFO6X6d0sI3ivNbFOY2yc9ukLv7hdGZT1y4/ZHMzfekp99SnFl3+zKVtFJKqctL22ZqdZd/bebGa6OUUqq8WKeXjkyuoZRSqrTwnV5y5spLCxTvfQUgEk0omiAS3EBwgphDL+JXM6Bx4LOz5/Gz0eTHjgPAqYnnLWB+C4DYGGKtiUTjx4IXWuiPL/x2Q/acgMZhwO6+D8CJi88sUJjbBEAbgxhDbAyR1gSi8SLBDYVmIDiecNCM2XdCAIbHn1ogP7thgSRBjOlAkTGE2h6pDTktCGBobMUCuTufO0C70jVNaAyRCEEs+LGFAAZLjy2QufXBAoDpgiRJ7L10NdAaXywwkH9ggfPT7zpPk7QQ0zVNu3GrkdYA9OdqFkhPvelpD1KjVQukspXauevrjEyucfbqK05PvODkpVWGx58wNLbCYHmZ48VHHCs8ZCC/RH+uSipbJZWt1I78Ef9L/gKBoad/Cqbu8QAAAABJRU5ErkJggg==");
}
.addMenu:-moz-any([icon="image"], [command="context-viewimage"]) {
	list-style-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAB40lEQVQ4ja3Tz2vTcBjH8f1XDm8rQdxBYaAW8TRqDyVKXf1Fdbq2HgqCPy5FRcUfbZYmra2y7VC1IEzQu4dhaTKnS41tmnzz/Wb5BrH9eFCqpbUT9IHX9c1zeJ6pqf8xR5PFa+FziimIMpmOjhEZForJ5GBi+cYgcOS8+qWp633KGJjHQT0O1+NwPA7HC2CzAF0aoEMDdCiHabuYjSvOICCIMnEpw7FUDmfvS1h8mEfygYrkoxouPq7hUr6GJek5MvILHF+6jrbLIYgqGQT2RmXCPI5Ufg3lJkVV30FFo6joPiqbHE8/BHi29RUrn74hq9ZhOmMCrseRVetYNfpY3e79UVat47PjQxCV4YDjcWQKa6hqO6jqPiqah3LThdpgKDUY1PcUTxoOrhRW0LK90YDNOE7m7uLemxZuvf6I3Pomsi/fIl3bRuan26/e4cKdAlrdMRt0KcfhyxISiv5DUUNC1rCw3BxyaDE/GpiOysRyOcLpEs6UjYnC6RKMcYEO+YfAnohELMIxM59COF2aaGY+BcPyEYr9vkFEIhbxsWH2sGH2d9GDYfHhwL4T8lbbskEoB2EBHBbAYRwO5bBHBGjbLmbj6q9TnjtdvHrglLouiAoJxXa3P66QuYXizb/81cnzHYKHUEC02ZXaAAAAAElFTkSuQmCC");
}
.addMenu:-moz-any([icon="images"], [command="context-copyimage-contents"]) {
	list-style-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACUElEQVQ4jYWS30tTcQDF909Fc2+OO0tjDmE1K4pELzrmnG7DMExnLyNDV/RjD1mhY/vu3g0jsojCJ9+CHqLIl3FJ6+pt3m3f+73rfkfkTg9O3arhgc/r4cPh2C5OZRd8k5ImBAi1iw0Gj3H6Ce0NZxK2drlwXf5RUJQ6M02YVQ5W5SixGvZYDXuMQysb6A5JlbYFQoBQg5nw3uxB5PHIEcO3F+CbXIEnmkfHEKm3NXOIhJpVjkjSj6X3C3jyIYFnH+/hSiyLgqLgRDOHSKhR5Zh6GsLy5/tY+XRATzgDg5nYCEbxNZ445s4DvLkxi6LBIQRkanOIhJYYR8+8gKvJOPqnUzgznkKHSCAE83CKGbhGsnCNSHCHJCw9eo3tRBJapVFgFwnVDY5ziS70z6RO1PZGc9hOJLFbsSAEJGo7PZimOuXoCJyCa2wZBjNxOfYQs+m3R9wi7zA0u4iiweEJEnwRr2Gn1CiwD6apTi1savsQgnmYVY5Y6hXyBYbnyk+82PqFl99+Iy6vQ6tweMayUIYHoB4WdI2SraJeBmUcXcE8jCpHXF7HmlrH2vf9I+LyOnYrFtyjaaxd8kHVLTj9ErX1RbLz7nF5QwhI1DFE6iXGcX4mjbCkICwpmMgUMJEpwDudwk7Jgjuyik1tH6rODwqaczioby6HaF5twTeXg1qy0BtdRZnVUCwb6A7JrQ89HLRzIAbfXK6FzoEYVN1Cp1+qO/0SPRuSaN9E9m6rQdOgm1r9L9poN6d5UGrWUDFrKDPeoI12c5oHdfr/5X/afwDntYTcCZeBqgAAAABJRU5ErkJggg==");
}

]]>.toString());
