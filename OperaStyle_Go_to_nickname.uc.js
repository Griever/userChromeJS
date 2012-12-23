// ==UserScript==
// @name           OperaStyle_gotoNickname.uc.js
// @namespace      http://d.hatena.ne.jp/Griever/
// @include        main
// @charset        UTF-8
// @varsion        0.0.6
// @note           0.0.5 Remove E4X
// ==/UserScript==
/*
keyconfig 等で gotoNickname.open() を実行。
gotoNickname.open("google"); でも可能。
*/
if (window.gotoNickname) {
	window.gotoNickname.destroy();
	delete window.gotoNickname;
}

window.gotoNickname= {
	BEEP         : false, //ビープ音を鳴らす
	SHOW_COMPLETE: true,  // 候補を表示
	ALAWAYS_CHECK: false, // 毎回キーワードを取得し直す
	lastMatchedKeyword: '',
	get keywords(){
		return this._keywords || (this._keywords = this.getKeywords());
	},
	get _beep() {
		delete this._beep;
		return this._beep = Cc["@mozilla.org/sound;1"].createInstance(Ci.nsISound);
	},
	beep: function() {
		this._beep.beep();
	},
	getKeywords: function(){
		var bmsvc = Cc["@mozilla.org/browser/nav-bookmarks-service;1"].getService(Ci.nsINavBookmarksService);
		var ios = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

		// http://www.xuldev.org/blog/?p=181
		function flatChildNodes(aItemId) {
			var ret = [];
			var parentNode = PlacesUtils.getFolderContents(aItemId).root;
			for (var i = 0; i < parentNode.childCount; i++) {
				var childNode = parentNode.getChild(i);
				if (PlacesUtils.nodeIsBookmark(childNode)){
					var uri = ios.newURI(childNode.uri, null, null);
					if (uri.spec.indexOf('%s') >= 0)
						continue;
					var keyword = bmsvc.getKeywordForURI(uri);
					if (keyword) ret.push(keyword);
				}
				else if (PlacesUtils.nodeIsFolder(childNode))
					// call this function recursive
					ret = ret.concat(arguments.callee(childNode.itemId));
			}
			return ret;
		}
		return flatChildNodes(1).filter(function(e, i, a) a.indexOf(e) === i);
	},

	open: function(str){
		if (str){
			loadURI(getShortcutOrURI(str ,{}));
			return;
		}
		this.panel.openPopupAtScreen(
			window.screenX + window.innerWidth/2 - 150
			, window.screenY + window.innerHeight/2 - 40
			, false
		);
		if (this.ALAWAYS_CHECK)
			this._keywords = null;
	},

	onPopupshown: function(event) {
		this.input.inputField.style.imeMode = "inactive";
		this.input.select();
		if (this.BEEP) this.beep();
	},
	onPopuphidden: function(event) {
		this.input.value = this.lastMatchedKeyword;
		this.label.value = '';
	},
	onInput: function(event) {
		var value = this.input.value;
		if (value == '') {
			this.label.value = '';
			return;
		}
		var matchKeywords = this.keywords.filter(function(e) e.indexOf(value) === 0);
		if (matchKeywords.length === 1) {
			loadURI(getShortcutOrURI(matchKeywords[0],{}));
			content.focus();
			this.lastMatchedKeyword = matchKeywords[0];
			this.panel.hidePopup();
		} else if (this.SHOW_COMPLETE) {
			this.label.value = matchKeywords.join(' ');
		}
	},
	onKeypress: function(event) {
		var {keyCode:k, charCode:w, ctrlKey:c, shiftKey:s, altKey:a} = event;
		if (k === event.DOM_VK_RETURN && !c && !s && !a) {
			loadURI(getShortcutOrURI(this.input.value ,{}));
			content.focus();
			this.panel.hidePopup();
		}
	},
	init: function(){
		this.panel = $('mainPopupSet').appendChild($C("panel", {
			id: "gotoNickname-panel",
			width: "300",
			height: "80",
			onpopupshown: "gotoNickname.onPopupshown(event);",
			onpopuphidden: "gotoNickname.onPopuphidden(event);",
			style: "background-color: -moz-dialog; padding: 10px;"
		}));

		this.panel.appendChild($C("description", {
			value: "ブックマークのキーワードを入力してください",
		}));

		this.input = this.panel.appendChild($C("textbox", {
			id: "gotoNickname-input",
			onkeypress: "gotoNickname.onKeypress(event)",
			oninput: "gotoNickname.onInput(event);",
		}));

		this.label = this.panel.appendChild($C("description", {
			id: "gotoNickname-label",
			crop: "end",
			value: "",
		}));

		function $(id) document.getElementById(id);
		function $C(name, attr) {
			var el = document.createElement(name);
			if (attr) Object.keys(attr).forEach(function(n) el.setAttribute(n, attr[n]));
			return el;
		}
	},
	destroy: function() {
		var elem = document.getElementById('gotoNickname-panel');
		if (elem) elem.parentNode.removeChild(elem);
	},
};

gotoNickname.init();
