// ==UserScript==
// @name           UserCSSLoader
// @description    Stylish みたいなもの
// @namespace      http://d.hatena.ne.jp/Griever/
// @author         Griever
// @include        main
// @compatibility  Firefox 4
// @version        0.0.2
// @note           メニューを色々追加
// @note           Rebuild の処理を最適化した
// ==/UserScript==

/****** 使い方 ******

chrome フォルダに CSS フォルダが作成されるのでそこに .css をぶち込むだけ。
ファイル名が "xul-" で始まる物、".as.css" で終わる物は AGENT_SHEET で、それ以外は USER_SHEET で読み込む。
ファイルの内容はチェックしないので @namespace 忘れに注意。

メニューバーに CSS メニューが追加される
メニューを左クリックすると ON/OFF
          中クリックするとメニューを閉じずに ON/OFF
          右クリックするとエディタで開く

エディタは "view_source.editor.path" に指定されているものを使う
フォルダは "UserCSSLoader.FOLDER" にパスを入れれば変更可能

 **** 説明終わり ****/

(function(){

let { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;
if (!window.Services)
	Cu.import("resource://gre/modules/Services.jsm");

// 起動時に他の窓がある（２窓目の）場合は抜ける
let list = Services.wm.getEnumerator("navigator:browser");
while(list.hasMoreElements()){ if(list.getNext() != window) return; }

if (window.UCL) {
	window.UCL.destroy();
	delete window.UCL;
}

window.UCL = {
	AGENT_SHEET: Ci.nsIStyleSheetService.AGENT_SHEET,
	USER_SHEET : Ci.nsIStyleSheetService.USER_SHEET,
	get prefs() {
		delete this.prefs;
		return this.prefs = Services.prefs.getBranch("UserCSSLoader.")
	},
	get readCSS() {
		let obj = {};
		try {
			let s = this.prefs.getComplexValue("disabled_list", Ci.nsISupportsString).data.split("|");
			if (s.length) {
				s.forEach(function(aLeafName) {
					obj[aLeafName] = {
						enabled: false,
						lastModifiedTime: 0
					}
				});
			}
		} catch(e) {}
		delete this.readCSS;
		return this.readCSS = obj;
	},
	get styleSheetServices(){
		delete this.styleSheetServices;
		return this.styleSheetServices = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
	},
	get FOLDER() {
		let aFolder;
		try {
			// UserCSSLoader.FOLDER があればそれを使う
			let folderPath = this.prefs.getCharPref("FOLDER");
			aFolder = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile)
			aFolder.initWithPath(folderPath);
		} catch (e) {
			aFolder = Services.dirsvc.get("UChrm", Ci.nsILocalFile);
			aFolder.appendRelativePath("CSS");
		}
		if (!aFolder.exists() || !aFolder.isDirectory()) {
			aFolder.create(Ci.nsIFile.DIRECTORY_TYPE, 0664);
		}
		delete this.FOLDER;
		return this.FOLDER = aFolder;
	},
	getFocusedWindow: function() {
		let win = document.commandDispatcher.focusedWindow;
		if (!win || win == window) win = content;
		return win;
	},
	init: function() {
		var menu = $E(
			<menu id="usercssloader-menu"
				    label="CSS"
				    accesskey="C">
				<menupopup id="usercssloader-menupopup">
					<menu label={U("ﾒﾆｭ━━━(ﾟ∀ﾟ)━━━!!")}
					      accesskey="C">
						<menupopup id="usercssloader-submenupopup">
							<menuitem label="Rebuild"
							          accesskey="R"
							          oncommand="UCL.importAll();" />
							<menuseparator />
							<menuitem label={U("新規作成")}
							          accesskey="N"
							          oncommand="UCL.create();" />
							<menuitem label={U("CSS フォルダを開く")}
							          accesskey="O"
							          oncommand="UCL.openFolder();" />
<!-- 
							<menuitem label={U("userChrome.css を編集")}
							          oncommand="UCL.editUserCSS('userChrome.css')" />
							<menuitem label={U("userContent.css を編集")}
							          oncommand="UCL.editUserCSS('userContent.css')" />
-->
							<menuseparator />
							<menuitem label={U("スタイルのテスト (Chrome)")}
							          id="usercssloader-test-chrome"
							          accesskey="C"
							          oncommand="UCL.styleTest(window);" />
							<menuitem label={U("スタイルのテスト (Webページ)")}
							          id="usercssloader-test-content"
							          accesskey="W"
							          oncommand="UCL.styleTest();" />
							<menuitem label={U("userstyles.org でスタイルを検索")}
							          accesskey="S"
							          oncommand="UCL.searchStyle();" />
						</menupopup>
					</menu>
					<menuseparator />
				</menupopup>
			</menu>
		);

		var mainMenubar = document.getElementById("main-menubar");
		mainMenubar.appendChild(menu);

		var key = $E(<key id="usercssloader-rebuild-key" oncommand="UCL.importAll();" key="R" modifiers="alt" />);
		document.getElementById("mainKeyset").appendChild(key)

		if (!window.inspectObject) {
			document.getElementById("usercssloader-test-chrome").hidden = true;
			document.getElementById("usercssloader-test-content").hidden = true;
		}
		this.importAll();
		this.initialized = true;
		window.addEventListener("unload", this, false);
	},
	uninit: function() {
		var dis = [];
		for (let [name, obj] in Iterator(this.readCSS)) {
			if (!obj.enabled) dis.push(name);
		}
		let str = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
		str.data = dis.join("|");
		this.prefs.setComplexValue("disabled_list", Ci.nsISupportsString, str);
		window.removeEventListener("unload", this, false);
	},
	destroy: function() {
		var i = document.getElementById("usercssloader-menu");
		if (i) i.parentNode.removeChild(i);
		var i = document.getElementById("usercssloader-rebuild-key");
		if (i) i.parentNode.removeChild(i);
		this.uninit();
	},
	handleEvent: function(event) {
		switch(event.type){
			case "unload": this.uninit(); break;
		}
	},
	importAll: function() {
		let ext = /\.css$/i;
		let files = this.FOLDER.directoryEntries.QueryInterface(Ci.nsISimpleEnumerator);

		while (files.hasMoreElements()) {
			let file = files.getNext().QueryInterface(Ci.nsIFile);
			if (!ext.test(file.leafName)) continue;
			this.setCSS(file);
		}
		if (this.initialized) XULBrowserWindow.statusTextField.label = U("Rebuild しました");
	},
	setCSS: function(aFile, isEnable) {
		// CSS の読み込み、メニューの作成・チェックの変更を全てこの関数で行う
		var aLeafName = "";
		if (typeof aFile == "string") {
			// aFile がファイル名だった場合
			aLeafName = aFile;
			aFile = this.getFileFromLeafName(aFile);
		} else {
			aLeafName = aFile.leafName;
		}

		var isExists = aFile.exists(); // ファイルが存在したら true
		var lastModifiedTime = isExists ? aFile.lastModifiedTime : 0;

		if (!this.readCSS[aLeafName]) {
			if (!isExists) return; // これは呼ばれないハズ…
			this.readCSS[aLeafName] = {
				enabled: true,
				lastModifiedTime: 1
			};
		}
		if (arguments.length == 1) {
			isEnable = this.readCSS[aLeafName].enabled;
		}

		var isForced = this.readCSS[aLeafName].lastModifiedTime != lastModifiedTime; // ファイルに変更があれば true
		this.readCSS[aLeafName].lastModifiedTime = lastModifiedTime;

		var fileURL = Services.io.getProtocolHandler("file").QueryInterface(Ci.nsIFileProtocolHandler).getURLSpecFromFile(aFile);
		var SHEET = /^xul-|\.as\.css$/i.test(aLeafName) ? this.AGENT_SHEET : this.USER_SHEET;
		var uri = makeURI(fileURL);

		if (this.styleSheetServices.sheetRegistered(uri, SHEET)) {
			// すでにこのファイルが読み込まれている場合
			if (!isEnable || !isExists){
				this.styleSheetServices.unregisterSheet(uri, SHEET);
			}
			else if (isForced) {
				// 解除後に登録し直す
				this.styleSheetServices.unregisterSheet(uri, SHEET);
				this.styleSheetServices.loadAndRegisterSheet(uri, SHEET);
			}
		} else {
			// このファイルは読み込まれていない
			if (isEnable && isExists) {
				this.styleSheetServices.loadAndRegisterSheet(uri, SHEET);
			}
		}

		if (this.initialized && isEnable && isForced) log(U(aLeafName + " の更新を確認しました。"));

		var menuitem = document.getElementById("usercssloader-" + aLeafName);
		if (!menuitem) {
			menuitem = document.createElement("menuitem");
			menuitem.setAttribute("label", aLeafName);
			menuitem.setAttribute("id", "usercssloader-" + aLeafName);
			menuitem.setAttribute("class", "usercssloader-item " + (SHEET == this.AGENT_SHEET? "AGENT_SHEET" : "USER_SHEET"));
			menuitem.setAttribute("type", "checkbox");
			menuitem.setAttribute("autocheck", "false");
			menuitem.setAttribute("oncommand", "UCL.toggle('"+ aLeafName +"');");
			menuitem.setAttribute("onclick", "UCL.itemClick(event);");
			document.getElementById("usercssloader-menupopup").appendChild(menuitem);
		}
		if (isExists) {
			this.readCSS[aLeafName].enabled = isEnable;
			menuitem.setAttribute("checked", isEnable);
			menuitem.setAttribute("hidden", "false");
		} else {
			menuitem.parentNode.removeChild(menuitem);
			delete this.readCSS[aLeafName];
		}
	},
	toggle: function(aLeafName) {
		this.setCSS(aLeafName, !this.readCSS[aLeafName].enabled);
	},
	itemClick: function(event) {
		if (event.button == 0) return;

		event.preventDefault();
		event.stopPropagation();
		let label = event.currentTarget.getAttribute("label");

		if (event.button == 1) {
			this.toggle(label);
		}
		else if (event.button == 2) {
			closeMenus(event.target);
			this.edit(this.getFileFromLeafName(label));
		}
	},
	getFileFromLeafName: function(aLeafName) {
		let f = this.FOLDER.clone();
		f.QueryInterface(Ci.nsILocalFile); // use appendRelativePath
		f.appendRelativePath(aLeafName);
		return f;
	},
	styleTest: function(aWindow) {
		aWindow || (aWindow = this.getFocusedWindow());
		var doc = aWindow.document;
		var { host, href } = aWindow.location;
		var code = "@namespace url(" + doc.documentElement.namespaceURI + ");\n";
		code += !host || host.indexOf(".") === -1?
			"@-moz-document url(" + href + ") {\n\n\n\n}":
			"@-moz-document domain(" + host + ") {\n\n\n\n}";

		var style = doc.createElementNS("http://www.w3.org/1999/xhtml", "style");
		style.type = "text/css";
		var node = style.appendChild(doc.createTextNode(code));
		doc.documentElement.appendChild(style);
		
		var domi = window.openDialog('chrome://inspector/content/object.xul', '_blank', 'chrome,all,dialog=no', node);
		domi.addEventListener("load", function(event) {
			event.currentTarget.removeEventListener(event.type, arguments.callee, false);
			domi.document.title = U(href + " へのスタイルをテストできます。ウインドウを閉じるとスタイルも削除されます。");
			domi.addEventListener("unload", function(event) {
				style.parentNode.removeChild(style);
			}, false);
		}, false);
	},
	searchStyle: function() {
		let win = this.getFocusedWindow();
		let word = win.location.host || win.location.href;
		openLinkIn("http://userstyles.org/styles/browse/site/" + word, "tab", {});
	},
	openFolder: function() {
		this.FOLDER.launch();
	},
	editUserCSS: function(aLeafName) {
		let file = Services.dirsvc.get("UChrm", Ci.nsILocalFile);
		file.appendRelativePath(aLeafName);
		this.edit(file);
	},
	edit: function(aFile) {
		//if (!aFile.exists()) return alert(aFile.leafName + U(" がありません"));
		var editor = Services.prefs.getCharPref("view_source.editor.path");
		if (!editor) return alert(U("エディタのパスが未設定です。\n view_source.editor.path を設定してください"));
		try {
			var UI = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
			UI.charset = window.navigator.platform.toLowerCase().indexOf("win") >= 0? "Shift_JIS": "UTF-8";
			var path = UI.ConvertFromUnicode(aFile.path);
			var app = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
			app.initWithPath(editor);
			var process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
			process.init(app);
			process.run(false, [path], 1);
		} catch (e) {}
	},
	create: function(aLeafName) {
		if (!aLeafName) aLeafName = prompt(U("ファイル名を入力してください"), new Date().toLocaleFormat("%Y_%m%d_%H%M%S"));
		if (aLeafName) aLeafName = aLeafName.replace(/\s+/g, " ").replace(/[\\/:*?\"<>|]/g, "");
		if (!aLeafName || !/\S/.test(aLeafName)) return;
		if (!/\.css$/.test(aLeafName)) aLeafName += ".css";
		let file = this.getFileFromLeafName(aLeafName);
		this.edit(file);
	}
};

UCL.init();

function $(id) { return document.getElementById(id); }
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
function log() { Application.console.log(Array.slice(arguments)); }

})();

