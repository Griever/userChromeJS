// ==UserScript==
// @name           urlfilter.uc.js
// @description    Opera の urlfilter.ini っぽい何か
// @namespace      http://d.hatena.ne.jp/Griever/
// @author         Griever
// @license        MIT License
// @compatibility  Firefox 11
// @charset        UTF-8
// @include        main
// @version        0.0.6
// @note           0.0.6 URL が異様に長いとフリーズする問題を修正
// @note           0.0.5 全体的に書き換え
// @note           0.0.5 グローバル変数名を変更
// @note           0.0.5 メニューの操作性を変更
// @note           0.0.5 最後にブロックした時間を記録するようにした
// @note           0.0.5 json から ini に変更（ini が無い場合 json を読み込み ini を作る）
// @note           0.0.5 Adblock のホワイトリスト（@@）と $image に対応
// ==/UserScript==

/*
Opera の urlfilter.ini っぽい何か
Adblock とは互換性がないので注意
*/

(function(CSS, WRITE_DESCRIPTION){

const { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;
if (!window.Services) Cu.import("resource://gre/modules/Services.jsm");

var list = Services.wm.getEnumerator("navigator:browser");
while (list.hasMoreElements()) if (list.getNext() != window) return;


if (window.gURLFilter) {
	window.gURLFilter.destroy();
	delete window.gURLFilter;
}

function Filter(aStr) {
	if (typeof aStr != "string") return aStr;
	this.text = aStr;
}
Filter.prototype = {
	_text: '',
	get text() this._text,
	set text(aStr) {
		if (typeof aStr != "string") return aStr;
		aStr = aStr.trim();
		this._text = aStr;
		this.setFilter(aStr);
		return aStr;
	},
	_enable: true,
	get enable() this._enable,
	set enable(bool) {
		if (bool = !!bool) {
			delete gURLFilter.disables[this.text];
		} else {
			gURLFilter.disables[this.text] = true;
			gURLFilter[this.type + 'Filter'] = null;
		}
		return this._enable = bool;
	},
	_count: null,
	get count() {
		if (!this._count) return this._count;
		var sa = new Date().getTime() - this._count;
		var day = 86400000;
		return sa > day * 365 ? parseInt(sa/day/365, 10) + "年前"   : 
		       sa > day * 30  ? parseInt(sa/day/30, 10)  + "ヶ月前" : 
		       sa > day * 7   ? parseInt(sa/day/7, 10)   + "週間前" : 
		       sa > day       ? parseInt(sa/day, 10)     + "日前"   : 
		       sa > 3600000   ? parseInt(sa/3600000, 10) + "時間前" : 
		       sa > 60000     ? parseInt(sa/60000, 10)   + "分前"   : "1分以内";
	},
	set count(number) {
		if (typeof number == "number" && number > 0) {
			gURLFilter.counter[this.text] = number;
			this._count = number;
		} else {
			delete gURLFilter.counter[this.text];
			this._count = null;
		}
		return number;
	},
	type: "sonota",
	litreg: /^\/([^\/].*[^\\])\/[igm]*?$/,
	wldreg: /[^*]+\*[^*]+|\*\*|:\/\/\*\./,
	zenreg: /^\w+:[^*]+\*$/,
	koureg: /^\*[^*]+$/,
	bubreg: /^\*[^*]+\*$/,
	kanreg: /^\w+:[^*]+$/,
	dolreg: /\$([^/]+)$/,
	dosreg: /~?third-party|~?image|~?domain=[^,]+/g,
	symreg: /[()\[\]{}|+.,^$?\\]/g,
	setFilter: function(aStr) {
		if (aStr.length < 4 || !/^(?:@@)?[h*f/]/.test(aStr)) return;
		var temp = this;
		var overrideType = null;
		if (aStr.indexOf("@@") == 0) {
			overrideType = "white";
			aStr = aStr.replace(/^@{2,}/, "");
		}
		var doller = this.dolreg.exec(aStr);
		var dolmatch = doller && doller[1] ? doller[1].match(this.dosreg) : null;
		if (dolmatch) {
			aStr = aStr.replace(doller[0], "");
			dolmatch.forEach(function(n){
				if (n === "third-party") return temp.$third = true;
				if (n === "~third-party") return temp.$third = false;
				if (n === "image") return temp.$image = true;
				if (n === "~image") return temp.$image = false;
				if (n.indexOf("domain=") === 0) {
					var ok = [], ng = [];
					n.substr(7).split("|").forEach(function(d){
						if (d[0] === "~") {
							ng.push(d.substr(1).replace(this.symreg, "\\$&"));
						} else {
							ok.push(d.replace(this.symreg, "\\$&"));
						}
					});
					try {
						if (ok.length) temp.$domain_regexp = new RegExp(ok.join("|") + "$");
						if (ng.length) temp.$domain_ng_regexp = new RegExp(ng.join("|") + "$");
					} catch (e) {
						overrideType = "sonota";
					}
					return;
				}
			}, this);
		}

		if (overrideType === "sonota") return;
		if (this.litreg.test(aStr)) {
			temp.type = "seiki";
			temp.source = RegExp.$1;
		} else if (this.wldreg.test(aStr)) {
			temp.type = "seiki";
			temp.source = this.wildcardToRegExpStr(aStr);
		} else if (this.kanreg.test(aStr)) {
			temp.type = "kanzen";
			temp.word = aStr;
			temp.source = "^" + this.wildcardToRegExpStr(aStr) + "$";
		} else if (this.zenreg.test(aStr)) {
			temp.type = "zenpou";
			temp.word = aStr.replace(/\*/g, "");
			temp.source = "^" + this.wildcardToRegExpStr(aStr);
		} else if (this.koureg.test(aStr)) {
			temp.type = "kouhou";
			temp.word = aStr.replace(/\*/g, "");
			temp.source = this.wildcardToRegExpStr(aStr) + "$";
		} else if (this.bubreg.test(aStr)) {
			temp.type = "bubun";
			temp.word = aStr.replace(/\*/g, "");
			temp.source = this.wildcardToRegExpStr(aStr);
		} else {
			overrideType = "sonota";
		}
		if (temp.source && (temp.type === "seiki" || overrideType === "white")) {
			try {
				temp.regexp = new RegExp(temp.source, "i");
			} catch (e) {
				overrideType = "sonota";
			}
		}

		if (this._text in gURLFilter.disables)
			temp.enable = false;
		if (this._text in gURLFilter.counter)
			temp.count = gURLFilter.counter[this._text];
		if (overrideType) 
			temp.type = overrideType;
		return temp;
	},
	wildcardToRegExpStr: function (urlstr) {
		var res = urlstr.replace(this.symreg, "\\$&")
		.replace(/\*+|:\/\/\*\\\./g, function(str){
			if (str === "\\^") return "(?:^|$|\\b)";
			if (str === "://*\\.") return "://(?:[^/]+\\.)?";
			if (str[0] === "*") return ".*";
			return str;
		})
		return res;
	},
	match: function(url) {
		if (!this._enable) return false;
		switch(this.type) {
			case "white" : return this.regexp.test(url);
			case "kanzen": return url === this.word;
			case "zenpou": return url.indexOf(this.word) === 0;
			case "kouhou": return url.lastIndexOf(this.word) === url.length - this.word.length;
			case "bubun" : return url.indexOf(this.word) >= 0;
			case "seiki" : return this.regexp.test(url);
			default: return false;
		}
	},
	matchDoller: function(pageHost, isThird, isImage) {
		return (!("$domain_regexp" in this) || this.$domain_regexp.test(pageHost)) && 
		       (!("$domain_ng_regexp" in this) || !this.$domain_ng_regexp.test(pageHost)) && 
		       (!("$third" in this) || this.$third === isThird) && 
		       (!("$image" in this) || this.$image === isImage)
	},
};
Object.defineProperty(Filter.prototype, "toString", {enumerable: false, value: function() this.text});


window.gURLFilter = {
	Filter: Filter,
	WRITE_DESCRIPTION: WRITE_DESCRIPTION,
	kanzen: {},
	zenpou: {},
	kouhou: {},
	bubun: {},
	seiki: {},
	white: {},
	sonota: {},
	counter: {},
	disables: {},
	removed: {},
	popupFlag: { kanzen: false, zenpou: false, kouhou: false, bubun: false, seiki: false, white: false, counter:false },
	saveFlag: false,
	lastInputFilter: "",
	lastModifiedTime: 0,

	_disabled: true,
	get disabled () this._disabled,
	set disabled (bool) {
		bool = !!bool;
		if (this._disabled != bool) {
			if (bool) {
				Services.obs.removeObserver(this, "http-on-modify-request");
				this.log("stop");
			} else {
				Services.obs.addObserver(this, "http-on-modify-request", false);
				this.log("start");
			}
		}
		this._disabled = bool;
		this.updateIcon();
		return this._disabled;
	},
	get prefs() {
		delete this.prefs;
		return this.prefs = Services.prefs.getBranch("urlfilter.");
	},
	get file() {
		var aFile = Services.dirsvc.get("UChrm", Ci.nsILocalFile);
		aFile.appendRelativePath("urlfilter.ini");
		delete this.file;
		return this.file = aFile;
	},

/*
	createFilterRegexp: function(aType) {
		//if (!aType || aType === "all") {
		//	return this._allRegExpFilter = new RegExp([
		//		this.kanzenFilter.source,
		//		this.zenpouFilter.source,
		//		this.kouhouFilter.source,
		//		this.bubunFilter.source, 
		//		this.seikiFilter.source
		//	].join("|"));
		//}
		var arr = [x.source for each(x in this[aType]) if (x.enable)];
		return this["_"+ aType+"Filter"] = arr.length > 0 ? new RegExp(arr.join("|")) : /^a$/;
	},
	//get allRegExpFilter() this._allRegExpFilter || this.createFilterRegexp(),
	get kanzenFilter() this._kanzenFilter || this.createFilterRegexp("kanzen"),
	get zenpouFilter() this._zenpouFilter || this.createFilterRegexp("zenpou"),
	get kouhouFilter() this._kouhouFilter || this.createFilterRegexp("kouhou"),
	get bubunFilter() this._bubunFilter || this.createFilterRegexp("bubun"),
	get seikiFilter() this._seikiFilter || this.createFilterRegexp("seiki"),
	get whiteFilter() this._whiteFilter || this.createFilterRegexp("white"),
	//set allRegExpFilter(val) this._allRegExpFilter = val,
	set kanzenFilter(val) this._kanzenFilter = val,
	set zenpouFilter(val) this._zenpouFilter = val,
	set kouhouFilter(val) this._kouhouFilter = val,
	set bubunFilter(val) this._bubunFilter = val,
	set seikiFilter(val) this._seikiFilter = val,
	set whiteFilter(val) this._whiteFilter = val,
*/

	getFocusedWindow: function(){
		var win = document.commandDispatcher.focusedWindow;
		return (!win || win == window) ? window.content : win;
	},
	init: function() {
		this.xulstyle = addStyle(CSS);

		var menutooltiptext = [
			"左クリックで有効/無効の切り替え",
			"Sfhit＋クリックでフィルタの削除",
			"右クリックでフィルタの編集",
		].join("\n");

		this.icon = $("urlbar-icons").appendChild($E(
			<image id="urlfilter-icon" 
			       tooltiptext="urlfilter" 
			       context="urlfilter-menupopup" 
			       onclick="gURLFilter.onClick(event);"/>
		));
		this.icon.style.padding = "0px 2px";

		this.popup = $("mainPopupSet").appendChild($E(
			<menupopup id="urlfilter-menupopup"
			           onpopupshowing="gURLFilter.onPopupshowing(event);">
				<menuitem label="フィルタを追加"
				          accesskey="A"
				          oncommand="gURLFilter.addFilter();"/>
				<menuitem label="INI ファイルの再読み込み"
				          accesskey="R"
				          oncommand="gURLFilter.loadINI();"/>
				<menuitem label="INI ファイルの編集"
				          accesskey="E"
				          oncommand="gURLFilter.editINI();"/>
				<menuseparator />
				<menu label="完全一致">
					<menupopup popupType="kanzen"
					           oncommand="gURLFilter.onFilterItemCommand(event);"
					           onclick="gURLFilter.onFilterItemClick(event);"
					           tooltiptext={menutooltiptext} />
				</menu>
				<menu label="前方一致">
					<menupopup popupType="zenpou"
					           oncommand="gURLFilter.onFilterItemCommand(event);"
					           onclick="gURLFilter.onFilterItemClick(event);"
					           tooltiptext={menutooltiptext} />
				</menu>
				<menu label="後方一致">
					<menupopup popupType="kouhou"
					           oncommand="gURLFilter.onFilterItemCommand(event);"
					           onclick="gURLFilter.onFilterItemClick(event);"
					           tooltiptext={menutooltiptext} />
				</menu>
				<menu label="部分一致">
					<menupopup popupType="bubun"
					           oncommand="gURLFilter.onFilterItemCommand(event);"
					           onclick="gURLFilter.onFilterItemClick(event);"
					           tooltiptext={menutooltiptext} />
				</menu>
				<menu label="正規表現など">
					<menupopup popupType="seiki"
					           oncommand="gURLFilter.onFilterItemCommand(event);"
					           onclick="gURLFilter.onFilterItemClick(event);"
					           tooltiptext={menutooltiptext} />
				</menu>
				<menu label="ホワイトリスト">
					<menupopup popupType="white"
					           oncommand="gURLFilter.onFilterItemCommand(event);"
					           onclick="gURLFilter.onFilterItemClick(event);"
					           tooltiptext={menutooltiptext} />
				</menu>
				<menuseparator class="urlfilter-menuend-separator" />
			</menupopup>
		));

		var ins = $("spell-separator");
		ins.parentNode.insertBefore($E(<>
			<menuitem id="context-urlfilter-add-image"
			          label="画像の URL を urlfilter に登録"
			          class="menuitem-iconic"
			          accesskey="U"
			          oncommand="gURLFilter.addFilter(gContextMenu.mediaURL);" />
			<menuitem id="context-urlfilter-add-frame"
			          label="フレームの URL を urlfilter に登録"
			          class="menuitem-iconic"
			          accesskey="F"
			          oncommand="gURLFilter.addFilter(gContextMenu.target.ownerDocument.location.href);" />
		</>), ins);

		this.loadPrefSetting();
		this.loadINI() || this.importJSON();

		try {
			this.disabled = this.prefs.getBoolPref("disabled");
		} catch (e) {
			this.prefs.setBoolPref("disabled", false);
			this.disabled = false;
		}

		window.addEventListener("unload", this, false);
		gBrowser.mPanelContainer.addEventListener("popupshowing", this, false);
		gBrowser.mPanelContainer.addEventListener("load", this, true);
		gBrowser.mTabContainer.addEventListener("TabSelect", this, false);
		this.updateIcon();
	},
	uninit: function() {
		window.removeEventListener("unload", this, false);
		gBrowser.mPanelContainer.removeEventListener("popupshowing", this, false);
		gBrowser.mPanelContainer.removeEventListener("load", this, true);
		gBrowser.mTabContainer.removeEventListener("TabSelect", this, false);
		this.savePrefSetting();
		if (this.saveFlag || !this.file.exists())
			this.saveINI();
		this.prefs.setBoolPref("disabled", this.disabled);
		this.disabled = true;
	},
	destroy: function(){
		this.uninit();
		var ids = ["urlfilter-icon", "urlfilter-menupopup",
			"context-urlfilter-add-image", "context-urlfilter-add-frame"];
		for (let [, id] in Iterator(ids)) {
			let e = document.getElementById(id);
			if (e) e.parentNode.removeChild(e);
		}
		this.xulstyle.parentNode.removeChild(this.xulstyle);
	},
	handleEvent: function(event) {
		switch(event.type) {
			case "TabSelect":
				if (this.disabled) return;
				setTimeout(this.updateIcon.bind(this), 10);
				break;
			case "load":
				if (this.disabled) return;
				this.updateIcon();
				break;
			case "popupshowing":
				var popup = event.target;
				if (popup.id.indexOf("hud_panel") != 0 || popup.hasAttribute("urlfilter-added")) return;
				popup.setAttribute("urlfilter-added", "true");
				popup.insertBefore(document.createElement("menuseparator"), popup.firstChild);
				var m = popup.insertBefore(document.createElement("menuitem"), popup.firstChild);
				m.setAttribute("label", "urlfilter に追加");
				m.setAttribute("accesskey", "A");
				m.setAttribute("oncommand", <![CDATA[
					var rich = this.parentNode.parentNode.querySelector('richlistbox');
					if (!rich || rich.selectedIndex === -1) return;
					var label = rich.selectedItem.querySelector('.webconsole-msg-url');
					if (label) gURLFilter.addFilter(label.value);
				]]>.toString());
				break;
			case "unload":
				this.uninit();
				break;
		}
	},
	onPopupshowing: function(event) {
		var popup = event.target;

		if (popup === event.currentTarget) {
			popup.setAttribute("hasmanager", "gURLFilterManager" in window);
			for (let n in this.popupFlag) {
				this.popupFlag[n] = false;
			}
			var sep = popup.querySelector(".urlfilter-menuend-separator");
			if (sep.nextSibling) {
				let range = document.createRange();
				range.setStartBefore(sep.nextSibling);
				range.setEndAfter(popup.lastChild);
				range.deleteContents();
				range.detach();
			}

			var win = this.getFocusedWindow();
			if (win.blocked) {
				var menutooltiptext = [
					"左クリックでホワイトリストに追加",
					"中クリックで URL を開く",
					"右クリックでフィルタの編集",
				].join("\n");
				let menuitem = document.createElement("menuitem");
				menuitem.setAttribute("label", win.location.host + " でブロックした URL");
				menuitem.setAttribute("disabled", "true");
				menuitem.setAttribute("style", "font-weight:bold;");
				popup.appendChild(menuitem);

				for (let [key, val] in Iterator(win.blocked)) {
					let menuitem = document.createElement("menuitem");
					menuitem.setAttribute("label", key);
					menuitem.setAttribute("matched", val);
					menuitem.setAttribute("tooltiptext", menutooltiptext + '\n' + val);
					menuitem.setAttribute("oncommand", 'gURLFilter.onBlockedItemCommand(event);');
					menuitem.setAttribute("onclick", 'gURLFilter.onBlockedItemClick(event);');
					popup.appendChild(menuitem);
				}
			}
		}
		var type = popup.getAttribute("popupType");
		if (!type || this.popupFlag[type]) return;
		this.popupFlag[type] = true;

		if (popup.hasChildNodes()) {
			let range = document.createRange();
			range.selectNodeContents(popup);
			range.deleteContents();
			range.detach();
		}
		var arr = [x for each(x in this[type])];
		if (arr.length) {
			arr.sort(function(a, b) a._count < b._count ? 1  :
			                        a._count > b._count ? -1 :
			                        a.text   < b.text   ? -1 :
			                        a.text   > b.text   ? 1  : -1);
			arr.forEach(function({text,type,count,enable}) {
				var menuitem = document.createElement("menuitem");
				menuitem.setAttribute("label", text);
				menuitem.setAttribute("acceltext", count);
				menuitem.setAttribute("filterType", type);
				menuitem.setAttribute("checked", enable);
				menuitem.setAttribute("type", "checkbox");
				menuitem.setAttribute("autoCheck", "false");
				menuitem.setAttribute("closemenu", "none");
				popup.appendChild(menuitem);
			}, this);
		}
	},
	onBlockedItemCommand: function(event) {
		this.addFilter("@@" + event.target.getAttribute("label"));
	},
	onBlockedItemClick: function(event) {
		if (!event.button) return;
		if (event.button === 1) {
			this.openURL(event.target.getAttribute("label"));
			closeMenus(event.target);
		} else if (event.button === 2) {
			let temp = this.getFilterFromText(event.target.getAttribute("matched"));
			closeMenus(event.target);
			if (temp) {
				this.editFilter(temp.text, temp.type);
			}
		}
		event.preventDefault();
		event.stopPropagation();
	},
	onFilterItemCommand: function(event) {
		var menuitem = event.target;
		var type = menuitem.getAttribute("filterType");
		var text = menuitem.getAttribute("label");
		if (!type || !text) return;

		if (event.shiftKey) {
			this.removeFilter(text, type);
			menuitem.parentNode.removeChild(menuitem);
		} else {
			var obj = this[type][text];
			obj.enable = !obj.enable;
			menuitem.setAttribute("checked", obj.enable);
		}
	},
	onFilterItemClick: function(event) {
		if (event.button === 1) return this.onFilterItemCommand(event);
		if (event.button != 2) return;
		var menuitem = event.target;
		var type = menuitem.getAttribute("filterType");
		var text = menuitem.getAttribute("label");
		if (!type || !text) return;
		event.preventDefault();
		event.stopPropagation();
		closeMenus(menuitem);
		this.editFilter(text, type);
	},
	onClick: function(event) {
		if (!event.button) {
			this.disabled = !this.disabled;
		} else if (event.button === 1) {
			this.loadINI();
		}
	},
	updateIcon: function() {
		if (this.disabled) {
			this.icon.setAttribute("state", "off");
			this.icon.setAttribute("tooltiptext", "urlfilter off");
		} else {
			this.icon.setAttribute("tooltiptext", "urlfilter on");
			if ("blocked" in this.getFocusedWindow()) {
				this.icon.setAttribute("state", "blocked");
			} else {
				this.icon.setAttribute("state", "on");
			}
		}
	},
	observe: function(subject, topic, data) {
		if (topic === "http-on-modify-request") {
			var http = subject.QueryInterface(Ci.nsIHttpChannel).QueryInterface(Ci.nsIRequest);
			var {spec, host, scheme} = http.URI;
			if (this.onceThroughURL === spec)
				return this.onceThroughURL = null;
//			if (spec.length > 1000)
//				return this.log("URLが長過ぎます。\n" + spec);

			var win = this.getRequesterWindow(http);
			var {href:pageURL, host:pageHost, protocol:pageProtocol } = win ? win.location : { href:"", host:""};
			var isImage = !http.loadGroup || !http.loadGroup.groupObserver;
			var isThird = !(scheme == pageProtocol && host == pageHost);
			var matched;

			var obj = this.scanX(spec, "white", pageHost, isThird, isImage) || 
				this.scanX(spec, "kanzen", pageHost, isThird, isImage) || 
				this.scanX(spec, "zenpou", pageHost, isThird, isImage) || 
				this.scanX(spec, "kouhou", pageHost, isThird, isImage) || 
				this.scanX(spec, "bubun", pageHost, isThird, isImage) || 
				this.scanX(spec, "seiki", pageHost, isThird, isImage);
			if (obj) {
				obj.count = new Date().getTime();
				if (obj.type === "white") return;
				matched = obj.text;
			} else if (isImage && host.indexOf("amazon.") >= 0 && pageHost.indexOf("amazon.") === -1) {
				matched = "Default::images-amazon.com";
			}
			if (!matched) return;
			http.cancel(Cr.NS_ERROR_FAILURE);

			if (!win) return;
			if (!win.blocked) {
				win.blocked = {};
				this.updateIcon();
			}
			win.blocked[spec] = matched;
		}
	},
	scanX: function(url, type, pageHost, isThird, isImage) {
		if (type === "white")
			for each(let obj in this.white)
				if (obj.match(url) && obj.matchDoller(pageHost, isThird, isImage))
					return obj;
//		if (type === "kanzen")
//			for each(let obj in this.kanzen)
//				if (obj.match(url) && obj.matchDoller(pageHost, isThird, isImage))
//					return obj;
		var knzn = this.kanzen[url];
		if (knzn && knzn.matchDoller(pageHost, isThird, isImage))
			return knzn

		if (type === "zenpou")
			for each(let obj in this.zenpou)
				if (obj.match(url) && obj.matchDoller(pageHost, isThird, isImage))
					return obj;
		if (type === "kouhou")
			for each(let obj in this.kouhou)
				if (obj.match(url) && obj.matchDoller(pageHost, isThird, isImage))
					return obj;
		if (type === "bubun")
			for each(let obj in this.bubun)
				if (obj.match(url) && obj.matchDoller(pageHost, isThird, isImage))
					return obj;
		if (type === "seiki")
			for each(let obj in this.seiki)
				if (obj.match(url) && obj.matchDoller(pageHost, isThird, isImage))
					return obj;
		return null;
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
	getFilterFromText: function(aText) {
		return this.kanzen[aText] || this.zenpou[aText] || this.kouhou[aText] 
		       this.bubun[aText]  || this.seiki[aText]  || this.white[aText];
	},
	getTypeFromText: function(aText) {
		return aText in this.kanzen ? "kanzen" : 
		       aText in this.zenpou ? "zenpou" : 
		       aText in this.kouhou ? "kouhou" : 
		       aText in this.bubun  ? "bubun"  : 
		       aText in this.seiki  ? "seiki"  : 
		       aText in this.white  ? "white"  : 
		       aText in this.sonota ? "sonota" : "";
	},
	addFilter: function(aURL) {
		var des = this.WRITE_DESCRIPTION.replace(/\;\s+/g, "");
		var ok = prompt(des, aURL || this.lastInputFilter || getBrowserSelection());
		if (!ok) return;
		this.lastInputFilter = ok;
		var temp = new this.Filter(ok);
		if (temp.type === "sonota") return;
		this.addData(temp);
		this.lastInputFilter = "";
		this.saveFlag = true;
		return temp;
	},
	removeFilter: function(aText, aType){
		aType || (aType = this.getTypeFromText(aText));
		if (!aType) return false;
		this.removed[aText] = true;
		delete this[aType][aText];
		this[aType + "Filter"] = null;
		this.saveFlag = true;
		return true;
	},
	editFilter: function(aText, aType) {
		aType || (aType = this.getTypeFromText(aText));
		if (!aType) return false;
		var temp = this[aType][aText];
		var des = this.WRITE_DESCRIPTION.replace(/\;\s+/g, "");
		var ok = prompt(des, temp.text);
		if (!ok) return;
		temp.text = ok;
		temp.count = null;

		delete this[aType][aText];
		this[temp.type][temp.text] = temp;
		this.removed[aText] = true;
		this[aType + "Filter"] = null;
		this[temp.type + "Filter"] = null;
		return temp;
	},
	addData: function(temp) {
		var {text, line, type} = temp;
		var tt = this[type];
		if (typeof line === "number" || !tt[text] || typeof tt[text].line != "number") {
			if (type === "sonota") {
				tt["[line: "+ line +"] " + text] = temp;
			} else {
				tt[text] = temp;
				this[type + "Filter"] = null;
			}
		}
	},
	importJSON: function() {
		var data = this.loadFile("urlfilter.json");
		if (!data) return null;

		data = JSON.parse(data);
		for (let [filterType, filterHash] in Iterator(data)) {
			for (let n in filterHash) {
				let enable = filterHash[n].enable;
				if (filterType === "seiki" && /\\|\[/.test(n)) 
					n = "/" + n + "/";
				let temp = new this.Filter(n);
				temp.enable = enable;
				this.addData(temp);
			}
		}
		this.log("JSON を読み込みました");
		this.saveFlag = true;
		return true;
	},
	loadINI: function() {
		var file = this.file;
		if (!file.exists() || !file.isFile()) return;
		if (this.lastModifiedTime === file.lastModifiedTimeOfLink) return;
		this.lastModifiedTime = this.file.lastModifiedTimeOfLink;
		var data = this.loadText(file);
		if (!data) return;
		data = data
			.replace(/=UUID:.*/g, "")
			.replace(/\n\"(.*)\"/g, "\n$1")
			;
		["kanzen", "zenpou", "kouhou", "bubun", "seiki", "white", "sonota"].forEach(function(type){
			var hash = this[type];
			for (let [key, {ini}] in Iterator(hash)) {
				if (ini) delete hash[key];// ini から読み込まれたフィルタを削除
			}
		}, this);
		data.split(/\r?\n/).forEach(function(line, i){
			var temp = new this.Filter(line);
			temp.line = i;
			temp.ini = true;
			this.addData(temp);
		}, this);
		this.log("ini を読み込みました");
		return true;
	},
	saveINI: function() {
		var file = this.file;
		if (file.exists() && !file.isFile()) return;
		var res = [];
		var added = [];
		["kanzen", "zenpou", "kouhou", "bubun", "seiki", "white", "sonota"].forEach(function(type){
			var hash = this[type];
			for each(let temp in hash) {
				if (temp.ini) res[temp.line] = temp;
				else added.push(temp);
			}
		}, this);
		res = res.map(function(temp) temp ? temp.text : "");

		added.forEach(function({text, line}) {
			if (typeof line === "number") {
				res[line] = res[line] ? res[line] + "\n" + text: text;
			} else {
				res.push(text);
			}
		});
		res = res.join("\n");
		if (!file.exists())
			res = this.WRITE_DESCRIPTION + "\n" + res;
		this.saveText(file, res);
		this.saveFlag = false;
		this.lastModifiedTime = file.lastModifiedTimeOfLink;
	},
	editINI: function() {
		if (!this.file.exists()) return alert("urlfilter.ini が見つかりません");
		var editor = Services.prefs.getCharPref("view_source.editor.path");
		if (!editor) return alert("エディタのパスが未設定です。\n view_source.editor.path を設定してください");
		try {
			var UI = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
			UI.charset = window.navigator.platform.toLowerCase().indexOf("win") >= 0? "Shift_JIS": "UTF-8";
			var path = UI.ConvertFromUnicode(this.file.path);
			var app = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
			app.initWithPath(editor);
			var process = Cc["@mozilla.org/process/util;1"].createInstance(Ci.nsIProcess);
			process.init(app);
			process.run(false, [path], 1);
		} catch (e) {}
	},
	savePrefSetting: function() {
		var ds = {}, ct = {};
		var data = [].concat(
			[x for each(x in this.kanzen)]
			,[x for each(x in this.zenpou)]
			,[x for each(x in this.kouhou)]
			,[x for each(x in this.bubun)]
			,[x for each(x in this.seiki)]
			,[x for each(x in this.white)]);
		data.forEach(function({text,enable,_count}){
			if (_count) ct[text] = _count;
			if (!enable) ds[text] = true;
		}, this);
		this.counter = ct;
		this.disables = ds;
		var str = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
		str.data = JSON.stringify(this.counter);
		this.prefs.setComplexValue("counter", Ci.nsISupportsString, str);
		var str = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
		str.data = JSON.stringify(this.disables);
		this.prefs.setComplexValue("disables", Ci.nsISupportsString, str);
	},
	loadPrefSetting: function() {
		try {
			this.counter = JSON.parse(this.prefs.getCharPref("counter"));
		} catch (e) {}
		try {
			this.disables = JSON.parse(this.prefs.getCharPref("disables"));
		} catch (e) {}
	},
	openURL: function(aURL) {
		this.onceThroughURL = aURL;
		openLinkIn(aURL, "tab", {});
	},
	copyString: function(aStr) {
		Cc["@mozilla.org/widget/clipboardhelper;1"].getService(Ci.nsIClipboardHelper).copyString(aStr);
	},
	log : function() {
		Application.console.log("[urlfilter]" + Array.slice(arguments));
	},
	loadText: loadText,
	saveText: saveText,
	loadFile: loadFile,
	saveFile: saveFile,
};

window.gURLFilter.init();


function loadText(aFile) {
	if (!aFile.exists() || !aFile.isFile()) return null;
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
function saveText(aFile, data) {
	var suConverter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
	suConverter.charset = "UTF-8";
	data = suConverter.ConvertFromUnicode(data);
	var foStream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
	foStream.init(aFile, 0x02 | 0x08 | 0x20, 0664, 0);
	foStream.write(data, data.length);
	foStream.close();
};
function loadFile(aLeafName) {
	var aFile = Services.dirsvc.get("UChrm", Ci.nsILocalFile);
	aFile.appendRelativePath(aLeafName);
	return loadText(aFile);
}
function saveFile(aLeafName, data) {
	var aFile = Services.dirsvc.get("UChrm", Ci.nsILocalFile);
	aFile.appendRelativePath(aLeafName);
	saveText(aFile);
};

function log() { Application.console.log(Array.slice(arguments)) }
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

})(<![CDATA[
/*
 * Some icons by Yusuke Kamiyamane. All rights reserved.
 * http://p.yusukekamiyamane.com/
 */
#urlfilter-icon,
#context-urlfilter-add-image,
#context-urlfilter-add-frame {
  list-style-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAB5ElEQVQ4jZ3OQUgiURzH8R8y4CAooiCEeFLRq9QQQwSBdApBpEMMpAdpKQ8TrHSaw7peBOnQIeiSgZWF0im6hBDUwByWd2io1qi85AheOs15+O9lW0ifl/3Dgwff9z78gbFpAN4OoLSBZgfQO4D+9640AO/4+y9zAsycAy1jYa4/Kpdsu6o5dlVzRuWSbSzM9c+B1gkww/3cALynwNnTWnb0sbNNw3z+y/nY2aantezoFDjjbnIMKHfzs/2hukW9XM65SCYHdY/HrHs85kUyOejlcs5Q3aK7+dn+MaBMAEdA82WzYN9nMtSKxQYVoK4BYQ0IV4B6KxYb3Gcy9LJZsI+A5gRwCOhvpaJjpNNUc7tNDQh/Ng0I19xu00in6a1UdA4BfQI4AFhvI083skwVgI33CsBuZJl+F9fpgNOxD7AHZZW6qdRUoJtK0YOySvs8YA9gj9kVuk0kpgK3iQQ9ZldojwfsAux1eYlYJDIVYJEIvS4v0S4PqAHsfVGm51BoKvAcCtH7okw1HiBJ0oZpmtRud0mSpDKnf2OM0eWlzu2IRqP/gHg8rvL6J8Dr8Pl8qmVZdHVlUCAQ+D7eg8GgalkWXV//Ir/fP9EhimJeEISKIAg/RVEs8LrL5fohCEKV1/97/gCuDO25VCRH2wAAAABJRU5ErkJggg==");
}

#urlfilter-icon[state="off"] {
  filter: url("chrome://mozapps/skin/extensions/extensions.svg#greyscale");
}

#urlfilter-icon[state="blocked"] {
  list-style-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACZElEQVQ4jZ3MXUhTcRjH8Z92wJOk+FKDkBGk4oJuZI6aIUnDbkIwSZJBkwjLJCa0JGKCyxvZ8KILqyG+m62thWgLMt9ag6PJP3DaUGej1GN6QAmbuwnH01WH1NNNP3iuvjwfYN86gBQPYHQDPR4g4AECbqDnnRGdbAAD069xff+PvD7guAvoF84VRDYstdFokzUebbLGv9+7Ff1oP/rzx/Lj2LT30IuJLvAHnjuAlGfA81Bl2cZWfR2tmUzyRe4baGWsknZjLyk0eF4SPLh8AOgFjB/OaCNr5ts0X14e92o0q47k5GDLkeTZscb02PZXO1VUVNDmonXX/yTh7YQN3B6gE+gJ11RFZ0pLqT8nZ9UGOKxAlucOrk65Tq9uiw0EgNYXakjoOrE+7oJhD9AOBL7U3ogLBgM1JyUFrUAWgITRPjiXQ9c25+cu0htfPc3OFNOnibO/RvvgBJAgA08BNl9tonG9nmwAAwBfGwr9r45Nflu8QJGQlgBQJKSlSKiA3ntTJn1tKJSBVoDNGa/QSH6+DAw60R6eOilJS6dICmsotvWApLCGpLCGFoUsadCJdhl4BLDPZZfIn5cnA70OtHbbIXTbIbTVYcdlOUzehnTqqMNOtx1CrwOtMtACsKWSYmJqtQz8PRvAmFpNSyXF1KLQ0QywlSI9LahU/wQWVCpaKdJTsxKg0+mqg8Egud0jpNPpLAr9JmOMhoYCih3Z2dkykJuba1bqfwCljtTUVLMoiuTzCZSRkXF3f8/MzDSLokjDw9OUlpZ2oIPneRPHcTaO4x7yPF+l1BMTExs5jmtS6v+932DjNskjJRnPAAAAAElFTkSuQmCC");
}

/* アイコンを U に見せるために逆さにする。！マークがひっくり返る… */
#urlfilter-icon,
#context-urlfilter-add-image .menu-iconic-icon,
#context-urlfilter-add-frame .menu-iconic-icon{
  -moz-transform:  rotate(180deg);
}


.urlfilter-menuend-separator:last-child,
#context-copyimage[hidden="true"] ~ #context-urlfilter-add-image,
#frame[hidden="true"] ~ #context-urlfilter-add-frame,
#urlfilter-menupopup[hasmanager="false"] > #urlfilter-run-manager,
#urlfilter-menupopup[hasmanager="false"] > #urlfilter-run-elements
  { display: none; }


]]>.toString()
,<![CDATA[
; Opera の urlfilter.ini のような完全一致
; ワイルドカード（*）と下記パターンが利用可能
; ・"://*." は Chrome の @match の様な動作
; ・/～/ で正規表現。大文字小文字は区別せず。部分一致。
; ・@@ で始まる行はホワイトリスト
]]>.toString()
);
