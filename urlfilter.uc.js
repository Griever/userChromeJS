// ==UserScript==
// @name           urlfilter.uc.js
// @description    指定した URL をブロックする
// @namespace      http://d.hatena.ne.jp/Griever/
// @author         Griever
// @include        main
// @version        0.0.4
// @compatibility  Firefox 4
// ==/UserScript==
/*

Opera の urlfilter.ini をインポートできる Adblock みたいな物
urlfilter.ini は URL を羅列にした .txt でも可

*/

(function(css){

const ICON_POSITION = "urlbar-container"; // この要素の手前にアイコンを作る

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;
if (!window.Services) Cu.import("resource://gre/modules/Services.jsm");

if (window.urlfilter) {
	window.urlfilter.destroy();
	delete window.urlfilter;
}

window.urlfilter = {
	popupFlag: { kanzen: false, zenpou: false, kouhou: false, bubun: false, seiki: false },
	observer: getObserver(),
	getFocusedWindow: function(){
		var win = document.commandDispatcher.focusedWindow;
		return !win || win == window? window.content : win;
	},
	init: function() {
		this.style = addStyle(css);

		var menutooltiptext = U([
			"左クリックで有効/無効の切り替え",
			"中クリックで有効/無効の切り替え（メニューを閉じない）",
			"右クリックでフィルタの編集",
			"Delete キーでフィルタの削除"
		].join("\n"));

		var icon = $E(
			<toolbarbutton id="urlfilter-icon"
			               label="urlfilter"
			               type="menu"
			               removable="true"
			               accesskey="U"
			               oncommand="if (event.target === this) urlfilter.observer.toggle();">
				<menupopup id="urlfilter-menupopup"
				           onpopupshowing="urlfilter.onPopupshowing(event);"
				           onpopuphidden="urlfilter.onPopuphidden(event);">
					<menuitem label="ON/OFF"
					          accesskey="O"
					          oncommand="urlfilter.observer.toggle()"/>
					<menuitem label={U("フィルタを追加")}
					          accesskey="A"
					          oncommand="urlfilter.observer.addFilter();"/>
					<menuitem label={U("フィルタを削除")}
					          accesskey="D"
					          hidden="true"
					          oncommand="urlfilter.observer.removeFilter();"/>
					<menuitem label={U("urlfilter.ini からインポート")}
					          accesskey="I"
					          oncommand="urlfilter.observer.importFilter();"/>
					<menuseparator />
					<menu label={U("完全一致")}>
						<menupopup popupType="kanzen"
						           oncommand="urlfilter.onFilterItemCommand(event);"
						           onclick="urlfilter.onFilterItemClick(event);"
						           tooltiptext={menutooltiptext} />
					</menu>
					<menu label={U("前方一致")}>
						<menupopup popupType="zenpou"
						           oncommand="urlfilter.onFilterItemCommand(event);"
						           onclick="urlfilter.onFilterItemClick(event);"
						           tooltiptext={menutooltiptext} />
					</menu>
					<menu label={U("後方一致")}>
						<menupopup popupType="kouhou"
						           oncommand="urlfilter.onFilterItemCommand(event);"
						           onclick="urlfilter.onFilterItemClick(event);"
						           tooltiptext={menutooltiptext} />
					</menu>
					<menu label={U("部分一致")}>
						<menupopup popupType="bubun"
						           oncommand="urlfilter.onFilterItemCommand(event);"
						           onclick="urlfilter.onFilterItemClick(event);"
						           tooltiptext={menutooltiptext} />
					</menu>
					<menu label={U("正規表現")}>
						<menupopup popupType="seiki"
						           oncommand="urlfilter.onFilterItemCommand(event);"
						           onclick="urlfilter.onFilterItemClick(event);"
						           tooltiptext={menutooltiptext} />
					</menu>
					<menuseparator id="urlfilter-menuend-separator"/>
				</menupopup>
			</toolbarbutton>
		);

		var ins = document.getElementById(ICON_POSITION);
		if (ins) ins.parentNode.insertBefore(icon, ins);

		var contextBack = document.getElementById("context-back");
		contextBack.parentNode.insertBefore($E(
			<menuitem id="urlfilter-add-image"
			          label={U("画像の URL を urlfilter に登録")}
			          class="menuitem-iconic"
			          accesskey="U"
			          oncommand="urlfilter.observer.addFilter(gContextMenu.mediaURL);" />
		), contextBack);

		var frameMenu = document.getElementById("frame").firstElementChild;
		frameMenu.appendChild($E(<>
			<menuseparator />
			<menuitem id="urlfilter-add-frame"
			          label={U("フレームの URL を urlfilter に登録")}
			          class="menuitem-iconic"
			          accesskey="U"
			          oncommand="urlfilter.observer.addFilter(gContextMenu.target.ownerDocument.location.href);" />
		</>));

		this.icon = document.getElementById("urlfilter-icon");
		this.popup = document.getElementById("urlfilter-menupopup");

		window.addEventListener("unload", this, false);
		
		this.updateIcon();
	},
	uninit: function() {
		window.removeEventListener("unload", this, false);
		var list = Services.wm.getEnumerator('navigator:browser');
		while (list.hasMoreElements()) {
			if (list.getNext() != window) return;
		}
		// 他にブラウザがなければオブザーバーに終了を通知
		urlfilter.observer.uninit();
	},
	destroy: function(){
		this.uninit();
		var ids = ["urlfilter-icon", "urlfilter-add-image", "urlfilter-add-frame"];
		for (let [, id] in Iterator(ids)) {
			let e = document.getElementById(id);
			if (e) e.parentNode.removeChild(e);
		}
		this.style.parentNode.removeChild(this.style);
	},
	handleEvent: function(event) {
		switch(event.type) {
			case "keypress":
				if (event.keyCode === event.DOM_VK_DELETE && !event.ctrlKey && !event.shiftKey && !event.altKey) {
					event.preventDefault();
					event.stopPropagation();
					var menuitem = this.popup.querySelector('menuitem[_moz-menuactive][filterType]');
					if (!menuitem) return;
					delete this.observer[menuitem.getAttribute("filterType")][menuitem.getAttribute("label")];

					var next = menuitem.nextSibling || menuitem.previousSibling;
					if (next && next.hasAttribute("filterType")) {
						next.setAttribute("_moz-menuactive", "true")
					}
					menuitem.parentNode.removeChild(menuitem);
				}
				break;
			case "unload":
				this.uninit();
				break;
		}
	},
	updateIcon: function() {
		if (this.observer.disabled) {
			this.icon.setAttribute("state", "off");
		} else {
			this.icon.setAttribute("state", "on");
		}
	},
	onPopupshowing: function(event) {
		var popup = event.target;

		if (popup.id === "urlfilter-menupopup") {
			for (let n in this.popupFlag) {
				this.popupFlag[n] = false;
			}

			var sep = document.getElementById("urlfilter-menuend-separator");
			if (sep.nextSibling) {
				let range = document.createRange();
				range.setStartBefore(sep.nextSibling);
				range.setEndAfter(popup.lastChild);
				range.deleteContents();
				range.detach();
			}

			var win = this.getFocusedWindow();
			if (win.blocked) {
				let menuitem = document.createElement("menuitem");
				menuitem.setAttribute("label", win.location.host + U(" でブロックした URL"));
				menuitem.setAttribute("disabled", "true");
				menuitem.setAttribute("style", "font-weight:bold;");
				popup.appendChild(menuitem);

				for (let [key, val] in Iterator(win.blocked)) {
					let menuitem = document.createElement("menuitem");
					menuitem.setAttribute("label", key);
					menuitem.setAttribute("tooltiptext", val);
					menuitem.setAttribute("disabled", "true");
					popup.appendChild(menuitem);
				}
			}
			addEventListener("keypress", this, true);
		}
		else if (popup.hasAttribute("popupType")) {
			var type = popup.getAttribute("popupType");
			if (this.popupFlag[type]) return;
			this.popupFlag[type] = true;

			if (popup.firstChild) {
				let range = document.createRange();
				range.selectNodeContents(popup);
				range.deleteContents();
				range.detach();
			}
			for (let [key, obj] in Iterator(this.observer[type])) {
				let menuitem = document.createElement("menuitem");
				menuitem.setAttribute("label", key);
				menuitem.setAttribute("acceltext", obj.count);
				menuitem.setAttribute("type", "checkbox");
				menuitem.setAttribute("autoCheck", "false");
				menuitem.setAttribute("checked", obj.enable);
				menuitem.setAttribute("filterType", type);
				popup.appendChild(menuitem);
			}
		}
	},
	onPopuphidden: function(event) {
		var popup = event.target;
		if (popup.id === "urlfilter-menupopup") {
			removeEventListener("keypress", this, true);
		}
	},
	onFilterItemCommand: function(event) {
		var menuitem = event.target;
		if (!menuitem.hasAttribute("filterType")) return;

		var obj = this.observer[menuitem.getAttribute("filterType")][menuitem.getAttribute("label")];
		obj.enable = !obj.enable;
		menuitem.setAttribute("checked", obj.enable);
	},
	onFilterItemClick: function(event) {
		if (!event.button) return;
		var menuitem = event.target;
		var type = menuitem.getAttribute("filterType");
		if (!type) return;
		event.preventDefault();
		event.stopPropagation();

		if (event.button == 1) {
			this.onFilterItemCommand(event);
		}
		else if (event.button == 2) {
			closeMenus(menuitem);
			this.observer.editFilter(type, menuitem.getAttribute("label"));
		}
	},
	log: log
}

window.urlfilter.init();


function getObserver(){
	var list = Services.wm.getEnumerator('navigator:browser');
	while (list.hasMoreElements()) {
		let win = list.getNext();
		if (win.urlfilter) return win.urlfilter.observer;
	}

	var _disabled = true;
	var obs = {
		lastInputFilter: "",
		kanzen: {},
		zenkou: {},
		kounou: {},
		bubun : {},
		seiki : {},
		get prefs() {
			delete this.prefs;
			return this.prefs = Services.prefs.getBranch("urlfilter.")
		},
		get disabled () _disabled,
		set disabled (bool) {
			if (_disabled != bool) {
				if (bool) {
					Services.obs.removeObserver(this, "http-on-modify-request");
					this.log('urlfilter stop');
				} else {
					Services.obs.addObserver(this, "http-on-modify-request", false);
					this.log('urlfilter start');
				}
			}
			_disabled = !!bool;

			var browserWins = Services.wm.getEnumerator("navigator:browser");
			while (browserWins.hasMoreElements()) {
				let win = browserWins.getNext();
				if (win.urlfilter) win.urlfilter.updateIcon();
			}
			return _disabled;
		},
		init : function(){
			try {
				let obj = JSON.parse(loadFile("urlfilter.json"));
				for (let n in obj) {
					this[n] = obj[n];
				}
				for (let [, s] in Iterator(this.seiki)) {
					Object.defineProperty(s, "regexp", {
						enumerable: false,
						value: new RegExp(s.word, "i")
					});
					//s.regexp = new RegExp(s.word, "i");
				}
			} catch (e) { }

			try {
				this.disabled = this.prefs.getBoolPref("disabled");
			} catch (e) {
				this.prefs.setBoolPref("disabled", false);
				this.disabled = false;
			}
		},
		uninit: function(){
			this.saveFilter();
			this.prefs.setBoolPref("disabled", this.disabled);
			this.disabled = true;
		},
		observe: function(subject, topic, data) {
			if (topic === "http-on-modify-request") {
				var http = subject.QueryInterface(Ci.nsIHttpChannel).QueryInterface(Ci.nsIRequest);
				var {spec, host} = http.URI;
				var win, matched, obj;

				[matched, obj] = this.scan(spec);
				if (obj) obj.count++;

				// images-amazon.com は amazon.co.jp からしか受け付けない
				if (!matched && host.indexOf('images-amazon.com') >= 0) {
					win = this.getRequesterWindow(http);
					if (win.location.host && win.location.host.indexOf('amazon.co.jp') === -1)
						matched = 'Default::images-amazon.com';
				}
				if (!matched) return;

				http.cancel(Cr.NS_ERROR_FAILURE);
				if (!win) win = this.getRequesterWindow(http);
				if (!win) return log("win Not Found. from observe");

				if (!win.blocked) win.blocked = {};
				win.blocked[spec] = matched;
			}
		},
		scan: function(url){
			for (let [key, obj] in Iterator(this.kanzen)) {
				if (obj.enable && url === obj.word) {
					return [key, obj]
				}
			}
			for (let [key, obj] in Iterator(this.zenpou)) {
				if (obj.enable && url.indexOf(obj.word) === 0) {
					return [key, obj]
				}
			}
			for (let [key, obj] in Iterator(this.kouhou)) {
				if (obj.enable && url.lastIndexOf(obj.word) === url.length - obj.word.length) {
					return [key, obj]
				}
			}
			for (let [key, obj] in Iterator(this.bubun)) {
				if (obj.enable && url.indexOf(obj.word) >= 0) {
					return [key, obj]
				}
			}
			for (let [key, obj] in Iterator(this.seiki)) {
				if (obj.enable && obj.regexp.test(url)) {
					return [key, obj]
				}
			}
			return [null, null];
		},
		getRequesterWindow: function(aRequest) {
			if (aRequest.notificationCallbacks) {
				try {
					return aRequest.notificationCallbacks.getInterface(Ci.nsILoadContext).associatedWindow;
				} catch (ex) { }
			}
			if (aRequest.loadGroup && aRequest.loadGroup.notificationCallbacks) {
				try {
					return aRequest.loadGroup.notificationCallbacks.getInterface(Ci.nsILoadContext).associatedWindow;
				} catch (ex) { }
			}
			return null;
		},
		addFilter: function(aURL, isRegExp) {
			var input = { value: aURL || this.lastInputFilter };
			var check = { value: isRegExp };
			var ok = Services.prompt.prompt(
				window, U('フィルタを追加します'), U('ワイルドカード(*)が指定できます'), 
				input, U('正規表現を使用する'), check);
			if (!ok) return;
			this.createFilter(input.value, check.value);
			this.lastInputFilter = "";
			return true;
		},
		removeFilter: function() {
			var list = [].concat(
				[x for (x in this.kanzen)],
				[x for (x in this.zenpou)],
				[x for (x in this.kouhou)],
				[x for (x in this.bubun)],
				[x for (x in this.seiki)]);
			list.sort();
			var selected = {};
			var ok = Services.prompt.select(
				window, U("フィルタを削除します"), U("削除するフィルタを選んでください"), 
				list.length, list, selected);
			if (!ok) return;

			for (let [, type] in Iterator(["kanzen", "zenpou", "kouhou" ,"bubun", "seiki"])) {
				if (list[selected.value] in this[type]) {
					delete this[type][list[selected.value]];
					break;
				}
			}
		},
		editFilter: function(aType, aKey) {
			var res = this.addFilter(aKey, aType == "seiki");
			if (!res) return;
			delete this[aType][aKey];
		},
		createFilter: function(aStr, isRegExp) {
			if (aStr.length < 4) return;

			var temp = { enable: true, count: 0 }
			this.lastInputFilter = aStr;

			if (isRegExp) {
				if (this.seiki[aStr]) return;
				try {
					temp.word = aStr;
					temp.regexp = new RegExp(temp.word, "i");
					this.seiki[aStr] = temp;
				} catch (e) {}
				return
			}
			if (aStr.indexOf('*') === -1) {
				if (this.kanzen[aStr]) return;
				temp.word = aStr;
				this.kanzen[aStr] = temp;
				return;
			}
			if (aStr[aStr.length-1] === '*' && aStr.indexOf('*') === aStr.length-1) {
				if (this.zenpou[aStr]) return;
				temp.word = aStr.slice(0, -1);
				this.zenpou[aStr] = temp;
				return;
			}
			if (aStr[0] === '*' && aStr.indexOf('*', 1) === -1) {
				if (this.kouhou[aStr]) return;
				temp.word = aStr.substr(1);
				this.kouhou[aStr] = temp;
				return;
			}
			if (aStr[0] === '*' && aStr[aStr.length-1] === '*' && aStr.indexOf('*', 1) === aStr.length-1) {
				if (this.bubun[aStr]) return;
				temp.word = aStr.substring(1, aStr.length-1);
				this.bubun[aStr] = temp;
				return;
			}
			if (this.seiki[aStr]) return;
			try {
				temp.word = aStr.replace(/[()\[\]{}|+.,^$?\\]/g, '\\$&').replace(/\*/g, '.*');
				temp.regexp = new RegExp(temp.word, "i");
				this.seiki[aStr] = temp;
			} catch (e) {}
			return;
		},
		importFilter: function() {
			var nsIFilePicker = Ci.nsIFilePicker;
			var fp = Cc["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
			fp.init(window, U("urlfilter.ini を指定してください"), nsIFilePicker.modeOpen);
			fp.appendFilter("INI Files","*.ini;*.txt");
			var res = fp.show();
			if (res != fp.returnOK) return;
			
			var file = fp.file;
			var fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
			var sstream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
			fstream.init(file, -1, 0, 0);
			sstream.init(fstream);

			var data = sstream.read(sstream.available());
			try {
				data = decodeURIComponent(escape(data));
			} catch(e) {  }
			sstream.close();
			fstream.close();

			data = data
				.replace(/^\s+|\s+$/g, "")
				.replace(/=UUID:.*/g, "")
				.replace(/^\"(.*)\"/g, "$1")
				.replace(/(^|\n)([^h*].*|\*\s)/g, "");

			var dataArray = data.split(/\s+/);
			for (let [, val] in Iterator(dataArray)) {
				this.createFilter(val);
			}
			this.saveFilter();
		},
		saveFilter: function() {
			var json = JSON.stringify({
				kanzen: this.kanzen,
				zenpou: this.zenpou,
				kouhou: this.kouhou,
				bubun : this.bubun,
				seiki : this.seiki
			});
			saveFile("urlfilter.json", json);
		},
		toggle: function() {
			this.disabled = !this.disabled;
		},
		copyString: function(aStr) {
			Cc['@mozilla.org/widget/clipboardhelper;1'].getService(Ci.nsIClipboardHelper).copyString(aStr);
		},
		log : log,
	};
	obs.init();
	return obs;
}


function log() { Application.console.log(Array.slice(arguments)) }
function error(str) {
	var err = Cc["@mozilla.org/scripterror;1"].createInstance(Ci.nsIScriptError);
	err.init(str, null, null, null, null, err.errorFlag, null);
	Services.console.logMessage(err);
}
function $(id) { return document.getElementById(id); }
function $$(exp, doc) { return Array.prototype.slice.call((doc || document).querySelectorAll(exp)); }
function $A(args) { return Array.prototype.slice.call(args); }
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

function loadFile(name) {
	var file = Services.dirsvc.get('UChrm', Ci.nsILocalFile);
	file.appendRelativePath(name);
	var fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
	var sstream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
	fstream.init(file, -1, 0, 0);
	sstream.init(fstream);

	var data = sstream.read(sstream.available());
	try {
		data = decodeURIComponent(escape(data));
	} catch(e) {  }
	sstream.close();
	fstream.close();
	return data;
}

function saveFile(name, data) {
	var file = Services.dirsvc.get('UChrm', Ci.nsILocalFile);
	file.appendRelativePath(name);

	var suConverter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
	suConverter.charset = 'UTF-8';
	data = suConverter.ConvertFromUnicode(data);

	var foStream = Cc['@mozilla.org/network/file-output-stream;1'].createInstance(Ci.nsIFileOutputStream);
	foStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
	foStream.write(data, data.length);
	foStream.close();
};

})(<![CDATA[

#urlfilter-icon {
  list-style-image: url("chrome://browser/skin/urlbar-popup-blocked.png");
  -moz-image-region: rect(0px 16px 16px 0px);
}

#urlfilter-icon[state="off"] .toolbarbutton-icon,
#urlfilter-icon[state="off"] .toolbarbutton-text {
  opacity: .3;
}

#urlfilter-add-image,
#urlfilter-add-frame {
  list-style-image: url("chrome://browser/skin/urlbar-popup-blocked.png");
  -moz-image-region: rect(0px 16px 16px 0px);
}

#urlfilter-menuend-separator:last-child,
#context-copyimage[hidden="true"] ~ #urlfilter-add-image
  { display: none; }




]]>.toString());
