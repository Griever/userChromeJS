// addMenu.uc.js ver 0.0.4 以降で使えるスクリプト
// 必要な物だけ設定ファイルにコピーしてください

/**
 * 冗長な右クリックメニューを纏めるスクリプト
 */

// command 属性からオリジナルの hidden 等を連動させる関数
function syncHidden(event) {
	Array.slice(event.target.children).forEach(function(elem){
		var command = elem.getAttribute('command');
		if (!command) return;
		var original = document.getElementById(command);
		if (!original) {
			elem.hidden = true;
			return;
		};
		elem.hidden = original.hidden;
		elem.collapsed = original.collapsed;
		elem.disabled = original.disabled;
	});
};

// 標準のページメニューを一纏めにする
new function () {
	var items = [
		{ command: 'context-bookmarkpage', icon: 'starbutton' }
		,{ command: 'context-savepage' }
		,{ label: 'ページの URL をコピー', text: '%URL%' }
		,{ command: 'context-sendpage', style:'display:none;' }
		,{ command: 'context-viewsource' }
		,{ command: 'context-viewinfo' }
		,{ command: 'context-viewbgimage' }
		,{ command: 'context-sep-viewbgimage' }
		,{ command: 'context-back', onclick:'checkForMiddleClick(document.getElementById("Browser:BackOrBackDuplicate"), event);' }
		,{ command: 'context-forward', onclick:'checkForMiddleClick(document.getElementById("Browser:ForwardOrForwardDuplicate"), event);' }
		,{ command: 'context-reload', onclick:'checkForMiddleClick(document.getElementById("Browser:ReloadOrDuplicate"), event);' }
		,{ command: 'context-stop', onclick:'checkForMiddleClick(document.getElementById("Browser:Stop"), event);' }
		,{ command: 'context-sep-stop' }
		,{
			label: 'ホームページを開く'
			,icon: 'home'
			,oncommand: 'BrowserGoHome(event);'
			,onclick:'checkForMiddleClick(document.getElementById("Browser:Home"), event);'
		}
	];
	var menu = PageMenu({condition: 'normal', insertBefore: 'context-bookmarkpage', icon: 'starbutton', onpopupshowing: syncHidden });
	menu(items);
	page({ condition:'normal', insertBefore:'context-bookmarkpage' });
	items.forEach(function(it){
		if (it.command)
			css('#contentAreaContextMenu #' + it.command + '{ display: none !important; }')
	});
};


// 標準のリンクメニューを一纏めにする
new function () {
	var items = [
		{ command: 'context-copylink' }
		,{ command: 'context-copyemail' }
		,{
			label: 'リンクを現在のタブに開く'
			,icon: 'url'
			,oncommand: 'document.getElementById("context-openlinkincurrent").doCommand();'
			,onclick: 'checkForMiddleClick(document.getElementById("context-openlinkintab"), event);'
		}
		,{ command: 'context-openlinkintab' }
		,{ command: 'context-openlink' }
		,{ command: 'context-sep-open' }
		,{ command: 'context-bookmarklink' }
		,{ command: 'context-savelink' }
		,{ command: 'context-sendlink', style:'display:none;' }
		,{ command: 'context-sep-copylink', style:'display:none;' }
	];
	var menu = PageMenu({ condition: 'link', insertBefore:'context-copylink', icon:'copy2', onpopupshowing: syncHidden});
	menu(items);
	page({ condition:'link', insertBefore:'context-sep-copylink' });
	items.forEach(function(it){
		if (it.command)
			css('#contentAreaContextMenu[addMenu~="link"] #' + it.command + '{ display: none !important; }')
	});
};


// 標準の画像メニューを一纏めにする
new function () {
	var items = [
		{ command: 'context-viewimage' }
		//,{ command: 'context-reloadimage' }
		,{ command: 'context-copyimage-contents' }
		,{ command: 'context-copyimage' }
		,{ command: 'context-sep-copyimage' }
		,{ command: 'context-saveimage' }
		,{ command: 'context-sendimage', style:'display:none;' }
		,{ command: 'context-viewimageinfo' }
		,{ command: 'context-setDesktopBackground' }
		,{}
		,{
			label: 'Google 類似画像検索'
			,url : 'http://www.google.com/searchbyimage?image_url=%IMAGE_URL%'
		}
	];
	var menu = PageMenu({ condition:'image', insertBefore:'context-viewimage', icon:'image', onpopupshowing: syncHidden});
	menu(items);
	page({ condition:'image', insertBefore:'context-setDesktopBackground' });
	items.forEach(function(it){
		if (it.command)
			css('#contentAreaContextMenu[addMenu~="image"] #' + it.command + '{ display: none !important; }')
	});
};


// 標準の入力欄のメニューを一纏めにする
new function () {
	var items = [
		{ command: 'context-undo' }
		//,{ command: 'context-sep-undo' }
		,{ command: 'context-cut' }
		,{ command: 'context-paste' }
		,{ command: 'context-delete' }
		,{ command: 'context-sep-paste' }
		,{ command: 'context-keywordfield' }
		,{ command: 'spell-separator', style:'display:none;' }
		,{ command: 'spell-check-enabled' }
		,{ command: 'spell-add-dictionaries-main' }
		,{ command: 'spell-dictionaries' }
	];
	var menu = PageMenu({ condition:'input', insertBefore:'context-undo', onpopupshowing: syncHidden });
	menu(items);
	items.forEach(function(it){
		if (it.command)
			css('#contentAreaContextMenu[addMenu~="input"] #' + it.command + '{ display: none !important; }')
	});
};




/**
 * ファイルメニューなどを右クリックメニューから無理矢理使えるようにする
 */

// 既存の menupopup をサブメニューとして利用する関数
// menu に subpopup 属性が必要
function subPopupshowing(event) {
	var subPopup = document.getElementById(event.currentTarget.getAttribute('subpopup'));
	if (!subPopup) return;

	var popup = event.target;
	if (!popup.hasAttribute('style')) {
		popup.style.cssText = [
			'-moz-appearance: none !important;'
			,'max-height: 1px !important;'
			,'border: none !important;'
			,'background: transparent !important;'
			,'opacity: 0 !important;'
		].join(' ');
	}
	popup.style.setProperty('min-width', (popup._width || 100)+'px', 'important');

	var { screenY, screenX, width } = popup.boxObject;
	var popupshown = function(evt) {
		var utils = window.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
		utils.sendMouseEvent('mousemove', screenX, screenY, 0, 1, 0);
		subPopup.removeEventListener('popupshown', popupshown, false);
		popup._width = subPopup.boxObject.width;
	};
	setTimeout(function() {
		subPopup.addEventListener('popupshown', popupshown, false);
		subPopup.openPopupAtScreen(screenX-2, screenY-2, true);
	}, 0);
};

// 右クリックメニューに ファイル・ブックマークなどを作る
PageMenu({
	label: 'ファイルメニュー'
	,accesskey: 'F'
	,subpopup: 'menu_FilePopup'
	,onpopupshowing: subPopupshowing
});
PageMenu({
	label: 'ブックマークメニュー'
	,accesskey: 'B'
	,subpopup: 'bookmarksMenuPopup'
	,onpopupshowing: subPopupshowing
});
PageMenu({
	label: '戻る進むメニュー'
	,accesskey: 'B'
	,subpopup: 'backForwardMenu'
	,onpopupshowing: subPopupshowing
});



/**
 * 選択範囲を色々するスクリプト群
 */
var selmenu = PageMenu({ label: "選択範囲を…", condition:"select", accesskey: "R", insertBefore: "context-sep-open" });
selmenu([
	{
		label: "サイト内検索"
		,url: "http://www.google.co.jp/search?hl=ja&prmdo=1&tbs=lr:lang_1ja&lr=lang_ja&q=site:%HOST%+%SEL%"
	}
	,{
		label: "選択文字列を強調"
		,oncommand: function(event) {
			var ts = {};
			addMenu.getRangeAll().forEach(function(range) {
				var word = range.toString();
				if (ts[word]) return;
				gFindBar._highlightDoc(true, word);
				ts[word] = true;
			});
		}
	}
	,{
		label: "選択範囲内の URL をすべて開く"
		,oncommand: function(event) {
			var urls = {};
			var reg = /h?t?tps?\:\/\/(?:\w+\.wikipedia\.org\/wiki\/\S+|[^\s\\.]+?\.[\w#%&()=~^_?.;:+*/-]+)/g;
			var matched = addMenu.focusedWindow.getSelection().toString().match(reg) || [];
			matched.forEach(function(url) {
				url = url.replace(/^h?t?tp/, "http");
				if (!urls[url])
					gBrowser.addTab(url);
				urls[url] = true;
			});
		}
	}
	,{
		label: "選択範囲内のリンクを開く"
		,oncommand: function(event) {
			var urls = {};
			addMenu.$$('a:not(:empty)', null, true).forEach(function(a) {
				if (!urls[a.href] && /^http|^file/.test(a.href))
					gBrowser.addTab(a.href);
				urls[a.href] = true;
			});
		}
	}
	,{
		label: "選択範囲内のリンクを新しいグループで開く"
		,oncommand: function(event) {
			var urls = [];
			addMenu.$$('a:not(:empty)', null, true).forEach(function(a) {
				if (/^http|^file/.test(a.href))
					urls.push(a.href);
			});
			if (urls.length === 0) return;

			TabView._initFrame(function(){
				var item = TabView._iframe.focusedWindow.GroupItems.newGroup();
				urls.forEach(function(url, i){
					var tab = gBrowser.addTab(url);
					TabView.moveTabTo(tab, item.id);
					if (i === 0) gBrowser.selectedTab = tab;
				});
			});
		}
	}
	,{
		label: "選択範囲内のリンクの URL をコピー"
		,oncommand: function(event) {
			var urls = {};
			addMenu.$$('a:not(:empty)', null, true).forEach(function(a) { urls[a.href] = true; });
			urls = Object.keys(urls);
			if (urls.length === 0) return;
			addMenu.copy(urls.join('\n'));
		}
	}
	,{
		label: "選択範囲内の画像を１つのタブで開く"
		,oncommand: function() {
			var urls = [];
			addMenu.$$('a:not(:empty)', null, true).forEach(function(a) {
				if (/\.(jpe?g|png|gif|bmp)$/i.test(a.href) && urls.indexOf(a.href) === -1)
					urls.push(a.href);
			});
			if (urls.length === 0) return;

			var htmlsrc = '<style> img { max-width: 100%; max-height: 100%; } </style>';
			htmlsrc += urls.map(function(u) '\n<img src="' + u + '">').join("");
			gBrowser.addTab("data:text/html;charset=utf-8," + encodeURIComponent(htmlsrc));
		}
	}
	,{
		label: "選択範囲内のチェックボックスを ON"
		,icon: "checkbox"
		,checked: true
		,oncommand: function(event) {
			addMenu.$$('input[type="checkbox"]:not(:disabled)', null, true).forEach(function(a){
				a.checked = true;
			});
		}
	}
	,{
		label: "選択範囲内のチェックボックスを OFF"
		,icon: "checkbox"
		,oncommand: function(event) {
			addMenu.$$('input[type="checkbox"]:not(:disabled)', null, true).forEach(function(a){
				a.checked = false;
			});
		}
	},
]);
