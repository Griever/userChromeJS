// addMenu.uc.js の設定ファイルのサンプル
/*
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

// ページの右クリックメニューに追加
page({
	label  : "リンクのテキストを検索",
	text   : "%LINK_TEXT%",
	keyword: "g",
	where  : "tab"
});

// タブの右クリックメニューに追加
tab({
	label: "Favicon の URL をコピー",
	text: "%FAVICON%"
});

// Firefox メニューに追加
app({
	label: "再起動",
	accesskey: "R",
	oncommand: "Application.restart();"
});

// JS を書いてもいい
page({
	label: "DOMi で調査",
	accesskey: "D",
	oncommand: "inspectDOMNode(gContextMenu.target);"
});

// 関数を書いてもいい
page({
	label: "選択範囲内のリンクを開く",
	condition: "select", // 表示する条件を自分で決める
	oncommand: function(event) {
		var sel = addMenu.focusedWindow.getSelection();
		var urls = {};
		for (var i = 0, len = sel.rangeCount; i < len; i++) {
			Array.forEach(sel.getRangeAt(i).cloneContents().querySelectorAll('a:not(:empty)'), function(a){
				if (!urls[a.href] && /^http|^file/.test(a.href))
					gBrowser.addTab(a.href);
				urls[a.href] = true;
			});
		};
	}
});

page({
	label: "選択範囲内のチェックボックスを ON/OFF",
	class: "checkbox",
	condition: "select",
	oncommand: function(event) {
		var win = addMenu.focusedWindow;
		var sel = win.getSelection();
		Array.slice(win.document.querySelectorAll('input[type="checkbox"]:not(:disabled)')).forEach(function(e) {
			if (sel.containsNode(e, true))
				e.checked = !e.checked;
		});
	}
});

// ツールメニューの一番上にメニューを追加
tool({
	label: "クリックした要素を DOMi で調査",
	position: 1,
	oncommand: function(){
		function o(event){
			if (event.type == 'click'){
				if (event.ctrlKey || event.button == 1) return;
				if (event.button == 0) inspectDOMNode(event.originalTarget);
				setTimeout(function(){
					document.removeEventListener('click', o, true);
					document.removeEventListener('mousedown', o, true);
					document.removeEventListener('mouseup', o, true);
				}, 10);
			}
			event.preventDefault();
			event.stopPropagation();
		}
		document.addEventListener('click', o, true);
		document.addEventListener('mousedown', o, true);
		document.addEventListener('mouseup', o, true);
	}
});


// サブメニューを作成
// pagesub({ ... }) でサブメニューにアイテムを追加できる
var pagesub = PageMenu({ label: "サブメニュー" });

// 配列を入れてもいい
pagesub([
	{
		label : "リンク先のソースを表示",
		url   : "view-source:%l",
		where : "tab"
	},
	{
		label: "リンクを Google docs で開く",
		url  : "http://docs.google.com/viewer?url=%l",
		where: "tab"
	},
	{
		label: "Google ブックマークに登録",
		url: "http://www.google.co.jp/bookmarks/mark?op=add&bkmk=%u&title=%TITLE_ENCODE%&annotation=%SEL_ENCODE%",
		condition: "nolink"
	},
	{
		label: "はてなブックマークに登録",
		url: "http://b.hatena.ne.jp/my/add.confirm?url=%u",
		condition: "nolink"
	},
	{
		label: "リンクをはてなブックマークに登録",
		url: "http://b.hatena.ne.jp/my/add.confirm?url=%l",
	},
	{
		label: "livedoor Clip に登録",
		url: "http://clip.livedoor.com/clip/add?link=%u&title=%TITLE_ENCODE%",
		condition: "nolink"
	},
	{
		label: "Google 邦訳",
		url: "http://translate.google.co.jp/translate?u=%u",
		condition: "nolink"
	},
	{
		label: "Google キャッシュで開く",
		url: "http://www.google.co.jp/search?hl=ja&=cache:%u",
		condition: "nolink"
	},
	{
		label: "リンクを Google キャッシュで開く",
		url: "http://www.google.co.jp/search?hl=ja&=cache:%l",
	},
	{
		label: "Web Archive で開く",
		url: "http://wayback.archive.org/web/*/%u",
		condition: "nolink"
	},
	{
		label: "リンクを Web Archive で開く",
		url: "http://wayback.archive.org/web/*/%l",
	},
	{  }, // label やアクションが登録されていないので区切り
	{
		label: "サイドバーで開く",
		condition: "noselect nomedia noinput nomailto",
		oncommand: function(event) {
			var title = gContextMenu.onLink? gContextMenu.linkText() : gContextMenu.target.ownerDocument.title;
			var url = gContextMenu.linkURL || gContextMenu.target.ownerDocument.location.href;
			openWebPanel(title, url);
		}
	},
	{
		label: "Google 類似画像検索",
		url  : "http://www.google.com//searchbyimage?image_url=%i",
	},
	{},
	{
		label: "設定ファイルの再読込",
		oncommand: "setTimeout(function(){ addMenu.rebuild(true); }, 10);"
	}
]);


// IE などで開くメニューを作る
var execute = PageMenu({ label: "外部アプリケーションで開く", accesskey: "E", class: "exec" });
execute([
	{
		label: "Internet Explorer で開く",
		text: "%u",
		exec: "C:\\Program Files\\Internet Explorer\\iexplore.exe",
		accesskey: "I",
		condition: "nolink"
	},
	{
		label: "リンクを Internet Explorer で開く",
		text: "%l",
		accesskey: "I",
		exec: "C:\\Program Files\\Internet Explorer\\iexplore.exe"
	},
	{
		label: "Opera で開く",
		text : "%u",
		exec : "C:\\Program Files\\Opera\\opera.exe",
		accesskey: "O",
		condition: "nolink"
	},
	{
		label: "リンクを Opera で開く",
		text : "%l",
		accesskey: "O",
		exec : "C:\\Program Files\\Opera\\opera.exe", 
	},
	{
		label: "Chrome で開く",
		text: "%u",
		exec: Services.dirsvc.get("LocalAppData", Ci.nsILocalFile).path + "\\Google\\Chrome\\Application\\chrome.exe",
		accesskey: "C",
		condition: "nolink"
	},
	{
		label: "リンクを Chrome で開く",
		text: "%l",
		exec: Services.dirsvc.get("LocalAppData", Ci.nsILocalFile).path + "\\Google\\Chrome\\Application\\chrome.exe",
		accesskey: "C",
	},
	{
		label: "Chrome で開く(拡張無効)",
		text: "%u -disable-extensions",
		exec: Services.dirsvc.get("LocalAppData", Ci.nsILocalFile).path + "\\Google\\Chrome\\Application\\chrome.exe",
		accesskey: "E",
		condition: "nolink"
	},
	{
		label: "リンクを Chrome で開く(拡張無効)",
		text: "%l -disable-extensions",
		exec: Services.dirsvc.get("LocalAppData", Ci.nsILocalFile).path + "\\Google\\Chrome\\Application\\chrome.exe",
		accesskey: "E",
	}
]);

