■このスクリプトについて
Greasemonkey の様な .user.js を読み込むスクリプトです。

■Greasemonkey との違い
・管理マネージャはない
・.user.js を書き替えてもそのままでは反響されない
　　Rebuild が必要（アイコンをホイールクリック or メニューから実行）
　　0.1.7 でスクリプトをキャッシュしないオプションを追加
・AutoPagerize の SITEINFO など、一部データを JSON に保存
・Scriptish を参考に一部機能を実装

■対応するメタデータ
・@name
・@namespace
・@include
・@exclude
・@require
・@resource
・@noframes(Scriptish)
・@run-at(Chrome)
・@delay(Scriptish)
・@bookmarklet(NinjaKit)
・@match(Chrome)
これ以外のメタデータは動作には関係ありません。

■対応する GM_API
・GM_log
・GM_xmlhttpRequest
・GM_openInTab
・GM_registerMenuCommand
・GM_getResourceText
・GM_getResourceURL
・GM_addStyle
・GM_setValue
・GM_getValue
・GM_listValues
・GM_deleteValue
・GM_setClipboard(Scriptish)
・GM_unregisterMenuCommand(Scriptish)
・GM_enableMenuCommand(Scriptish)
・GM_disableMenuCommand(Scriptish)
・GM_generateUUID(Scriptish)
・GM_getMetadata(Scriptish)

■今後の予定
・とくになし

■更新履歴

・version 0.1.8
　@match, @unmatch に超テキトーに対応
　　（不正なパターンでもエラーを出さないので注意）
　.tld をテキトーに改善

・version 0.1.7.1~9
　__exposedProps__ を付けた
　uAutoPagerize との連携をやめた
　window.open や target="_blank" で実行されないのを修正
　@delay 周りのバグを修正
　require で外部ファイルの取得がうまくいかない場合があるのを修正
　0.1.7.4 にミスがあったので修正
　GM_xmlhttpRequest の url が相対パスが使えなかったのを修正
　Google Reader NG Filterがとりあえず動くように修正
　document-startが機能していなかったのを修正
　.tld がうまく動作していなかったのを修正

・version 0.1.7
　書きなおした
　スクリプトを編集時に日本語のファイル名のファイルを開けなかったのを修正
　複数のウインドウを開くとバグることがあったのを修正
　.user.js 間で window を共有できるように修正
　.tld を簡略化した
　スクリプトをキャッシュしないオプションを追加
　GM_safeHTMLParser, GM_generateUUID に対応
　GM_unregisterMenuCommand, GM_enableMenuCommand, GM_disableMenuCommand に対応
　GM_getMetadata に対応(返り値は Array or undefined)
　GM_openInTab に第２引数を追加
　@require, @resource のファイルをフォルダに保存するようにした
　@delay に対応
　@bookmarklet に対応（from NinjaKit）
　GLOBAL_EXCLUDES を用意した
　セキュリティを軽視してみた

・version 0.1.6.1
　uAutoPagerize との連携ができなかったのを修正
　.user.js 間での連携は多分できません。。
・version 0.1.6
　色々修正。unsafeWindow 使ってて動かなかった物が動くかも
　Firefox 3.6 は切り捨てた

・version 0.1.5.1
　0.1.5.1 フレームページを開いた際にエラー吐いてたのを仮修正
・version 0.1.5
　アイコンをアドレスバーに移動した
　@run-at document-start の動作を Scriptish に合わせた（今までは Chrome 風）
　user.jsの最後の行が行コメントだった場合に Syntax Error になったのを修正

・version 0.1.4
　Firefox 3.6 での動作確認をやめた
　@run-at document-start に対応
　globalStorageをやめてjsonにした(プライベートモードで読み出せなかったので)

・version 0.1.3
　chrome の @run-at に対応（3.6.12 以降限定）
　4.0b7 で uAutoPagerize との連携を修正

・version 0.1.2
　@require, @Resource で読み込みに失敗することがあったのを修正
　Scriptish の @noframes, GM_setClipboard に対応
　Mac で SCRIPTS_FOLDER 未指定時の処理を修正したつもり（未テスト）

・version 0.1.1
　typo 修正

・version 0.1.0
　Firefox 4.0b6 に対応
　window.content を汚染しない仕組みを実装

・version 0.0.9
　GM_registerMenuCommand に対応
　globalStorage を利用した
　SCRIPTS_FOLDER で指定したフォルダが無いとエラーになるのを適当に修正

・version 0.0.8
　アイコン化
　フォルダを開くメニューとスクリプト保存メニューを追加
　GM_listValues, GM_getResourceText 改善
　@require, GM_getResourceURL 対応

・version 0.0.7
　GM_deleteValue を修正

・version 0.0.6
　.tld に対応
　ステータスバーの文字が変わらないのを修正

・version 0.0.5
　JavaScript 1.8(E4X等) が使えるように

・version 0.0.4
　typo 修正

・version 0.0.3
　設定を pref に書くようにした
　意図せず unsafeWindow にアクセスできたのを修正

・version 0.0.2
　凡ミス修正

・version 0.0.1
　初版公開

■
アイコンは FAMFAMFAM さんからお借りしています。
http://www.famfamfam.com/lab/icons/silk/preview.php

