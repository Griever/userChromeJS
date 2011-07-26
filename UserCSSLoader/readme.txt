■このスクリプトについて
Stylish 風なスタイルシートを読み込むスクリプトです。

■使い方
1.UserCSSLoader.uc.jsを入れる
2.chrome/CSS フォルダに .css をぶち込む

□メニューの説明
・Rebuild
　CSS フォルダの中身を再読込する

・新規作成
　エディタに新しいファイルのパスを送るだけ。
　存在しないパスを受け取ったエディタがファイルを作るなりエラー吐くなりしてくれるんじゃないかな（ﾏﾃ

・CSS フォルダを開く
・スタイルのテスト
　CSS をテストするウインドウを提供します。
　DOM Inspector が無い場合はこのメニューは表示されません。
・userstyles.org でスタイルを検索
　userstyles.org にページのドメインを送って検索。

・.css メニューのクリックの割り当ては以下のとおり
　左クリックすると ON/OFF
　中クリックするとメニューを閉じずに ON/OFF
　右クリックするとエディタで開く
　　エディタのパスは about:config の "view_source.editor.path" を利用する。

■備考
・ファイル名が "xul-" で始まる物、".as.css" で終わる物は AGENT_SHEET で、それ以外は USER_SHEET で読み込みます。
・.css ファイルの内容はチェックしてないので @namespace 忘れに注意。
・.uc.js の都合上どうしても実行タイミングが遅れます。userChrome.css との使い分けも考えましょう。

■更新履歴
・version 0.0.2
　メニューを色々追加
　Rebuild の処理を最適化した

・version 0.0.1
　初版公開

