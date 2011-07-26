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
%EOL% 改行(\r\n)
%TITLE% ページタイトル
%URL% URI
%SEL% 選択範囲の文字列
%RLINK% リンクアンカー先の URL
%IMAGE_URL% 画像の URL
%IMAGE_ALT% 画像の alt 属性
%IMAGE_TITLE% 画像の title 属性
%LINK% リンクアンカー先の URL
%LINK_TEXT% リンクのテキスト
%RLINK_TEXT% リンクのテキスト
%MEDIA_URL% メディアの URL
%CLIPBOARD% クリップボードの内容
%FAVICON% Favicon の URL
%EMAIL% リンク先の E-mail アドレス
%HOST% ページのホスト(ドメイン)
%LINK_HOST% リンクのホスト(ドメイン)
%RLINK_HOST% リンクのホスト(ドメイン)
%LINK_OR_URL% リンクの URL が取れなければページの URL
%RLINK_OR_URL% リンクの URL が取れなければページの URL

%XXX_HTMLIFIED% HTML エンコードされた上記変数（XXX → TITLE などに読み替える）
%XXX_HTML% HTML エンコードされた上記変数
%XXX_ENCODE% URI エンコードされた上記変数

◇ 簡易的な変数 ◇
%h ページのホスト(ドメイン)
%i 画像の URL
%l リンクの URL
%m メディアの URL
%p クリップボードの内容
%s 選択文字列
%t ページのタイトル
%u ページの URL

基本的に Copy URL Lite+ の変数はそのまま使えます。
大文字・小文字は区別しません。
