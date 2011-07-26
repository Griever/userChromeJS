// ==UserScript==
// @name           OperaStyle_gotoNickname.uc.js
// @namespace      http://d.hatena.ne.jp/Griever/
// @include        main
// @varsion        0.0.3
// @note           keyconfig等で gotoNickname.open() を実行
// @note           gotoNickname.open("google"); でも可能。
// ==/UserScript==

window.gotoNickname= {
	beep: false, //ビープ音を鳴らす
	complete: true, // 候補を表示
	alawaysCheck: false,// 毎回キーワードを取得し直す
	
	getKeywords: function(){
		var bmsvc = Components.classes["@mozilla.org/browser/nav-bookmarks-service;1"]
		                      .getService(Components.interfaces.nsINavBookmarksService);
		var ios = Components.classes["@mozilla.org/network/io-service;1"]
		                    .getService(Components.interfaces.nsIIOService);

		// http://www.xuldev.org/blog/?p=181
		function flatChildNodes(aItemId) {
			var ret = [];
			var parentNode = PlacesUtils.getFolderContents(aItemId).root;
			for (var i = 0; i < parentNode.childCount; i++) {
				var childNode = parentNode.getChild(i);
				if (PlacesUtils.nodeIsBookmark(childNode)){
					var uri = ios.newURI(childNode.uri, null, null);
					var keyword = bmsvc.getKeywordForURI(uri);
					if (keyword) ret.push(keyword);
				}
				else if (PlacesUtils.nodeIsFolder(childNode) &&
						 !PlacesUtils.nodeIsLivemarkContainer(childNode))
					// call this function recursive
					ret = ret.concat(arguments.callee(childNode.itemId));
			}
			return ret;
		}

		this.keywords = flatChildNodes(1).filter(function(e, i, a) a.indexOf(e) === i);
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
		if (this.alawaysCheck)
			this.getKeywords();
	},

	handleEvent: function(e){
		switch(e.type){
			case 'input':
				var value = this.input.value;
				if (value == '') {
					this.label.value = '';
					return;
				}
				var matchKeywords = this.keywords.filter(function(e) e.indexOf(value) === 0);
				if (matchKeywords.length === 1) {
					loadURI(getShortcutOrURI(matchKeywords[0],{}));
					this.panel.hidePopup();
				} else if (this.complete) {
					this.label.value = matchKeywords.join(' ');
				}
				return;
				this.panel.hidePopup();
				break;
			case 'keypress':
				if (e.keyCode != e.DOM_VK_RETURN || (e.ctrlKey || e.shiftKey || e.altKey))
					return;
				loadURI(getShortcutOrURI(this.input.value ,{}));
				this.panel.hidePopup();
				break;
			case 'popupshown':
				this.input.focus();
				if (this.beep)
					Components.classes["@mozilla.org/sound;1"]
					          .createInstance(Components.interfaces.nsISound)
					          .beep();
				break;
			case 'popuphidden':
				this.input.value = '';
				this.label.value = '';
				break;
			case 'unload':
				this.uninit();
				break;
		}
	},
	
	init: function(){
		this.panel = $('mainPopupSet').appendChild($E(
			<panel id="gotoNickname-panel"
			       width="300"
			       height="80">
				<description>
					{U("ブックマークのキーワードを入力してください")}
				</description>
				<textbox id="gotoNickname-input"/>
				<label id="gotoNickname-label" crop="end"/>
			</panel>
		));
		this.input = $('gotoNickname-input');
		this.label = $('gotoNickname-label');
		this.panel.style.backgroundColor = '-moz-dialog';
		this.panel.style.padding = '10px';
		
		if (!this.alawaysCheck)
			this.getKeywords();
		
		this.panel.addEventListener('popupshown', this, false);
		this.panel.addEventListener('popuphidden', this, false);
		this.input.addEventListener('input', this, false);
		this.input.addEventListener('keypress', this, false);
		window.addEventListener('unload', this, false);
		
		$('mainKeyset').appendChild($E(
			<key keycode="VK_F2" modifiers="shift" oncommand="gotoNickname.open();"/>
		));

		// http://gist.github.com/348749
		function $(id) document.getElementById(id);
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
	},
		
	uninit: function(){
		this.panel.removeEventListener('popupshown', this, false);
		this.panel.removeEventListener('popuphidden', this, false);
		this.input.removeEventListener('input', this, false);
		this.input.removeEventListener('keypress', this, false);
		window.removeEventListener('unload', this, false);
	},
		
};

gotoNickname.init();

if (typeof window.opera == 'undefined') window.opera = { toString : function(){ return "[object OperaActions]" } };
opera.gotoNickname = function(str){ gotoNickname.open(str) }
