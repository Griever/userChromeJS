■このスクリプトについて
Greasemonkey 版の AutoPagerize（以下本家）が eval を多用するので「eval を最小限にして少ない負担で動作させよう」というコンセプトで本家をベースに作成した物です。
拙作の UserScriptLoader と連携可能です。

■本家との違い
・アイコンをアドレスバーに（フレームページではページ右上に）
・SITEINFO を JSON に保存
・Twitter など一部のサイトに標準対応
・SITEINFO に期限を設けてない

■今後の予定
・とくになし

■更新履歴
・version 0.2.0
　INCLUDE を設定できるようにした
　INCLUDE, EXCLUDE をワイルドカード式にした
　アイコンに右クリックメニューを付けた
　スクロールするまでは次を読み込まないオプションをつけた

・version 0.1.9.1
　Yahoo! 用の例外処理を修正
・version 0.1.9 
　セキュリティ上の問題を修正
　細部を調整

・version 0.1.8.2
　Google Images などで二重に実行されることがあったのを修正
・version 0.1.8.1
　Google のクソッタレを修正
・version 0.1.8
　SITEINFO のチェックを最適化した
　継ぎ足したページのURLを履歴に追加するオプションを追加
　次の読み込みを開始する位置の設定をミスってたのを修正
　YouTube のサムネイルが表示されないのに対応

・version 0.1.7.2
　google.co.jp への対応を修正
・version 0.1.7.1
　google.co.jpのトップページからの検索に仮対応
　ページの区切りにON/OFF切り替えアイコンを設置
　アイコンをアドレスバーに移動

・version 0.1.6.2
　Google Images の修正
・version 0.1.6.1
　NoScript インストール時に動かない問題修正

・version 0.1.5
　SITEINFO をソートするようにした
　iframe 内で動作してアイコンが状態と違った問題を修正
　アイコンが terminated の後にグレーにならないように変更

・version 0.1.4
　Scriptish との連携をやめた
　Greasemonkey と連携できなくなってたのを修正
　どちらも関係ない人は Ver.UP 不要です
　-----以下 0.1.3 の変更点-----
　xml に対応したかもしれない
　SITEINFO を globalStorage に保存
　フレーム対応（iframeは非対応）
　グローバルオブジェクトを作成
　Google Image を修正
　Google Video, naver まとめ, twitter.com（旧） に対応
　EXCLUDE の正規表現のミスを修正
　別ドメインのコンテンツが読み込めるセキュリティ上の問題を修正

・version 0.1.3
　SITEINFO を globalStorage に保存
　xml に対応したかも
　フレーム対応（iframeは非対応）
　グローバルオブジェクトを作成
　Google Video, naver まとめ, twitter.com に対応
　Google Image を修正
　EXCLUDE の正規表現のミスを修正
　セキュリティ上の問題を修正

・version 0.1.2
　ページ遷移を起因とするエラーと、OFFにしても他のタブで有効だったのを修正

・version 0.1.1
　Google Images, eow.alc.co.jp で動かなかったので修正

・version 0.1.0
　進む/戻るでのエラーを修正
　外部スクリプトから実行できなかったのを修正

・version 0.0.9
　全体的に書き直し
　Google Image と Firefox 3.6 になんとなく対応
　SITEINFO のキャッシュを GM 互換に戻したつもり
　GM と連携したつもり

・version 0.0.8
　YouTuve や mixi で実行されないのでタイマーを掛けた
　スクロールバーを出すようにした

・version 0.0.7
　prefs.js をちょっとダイエット
　DEBUG = false でも log を有効に
　DISABLE_IFRAME を廃止
　loading アイコンを変更
　その他全体的に微調整

・version 0.0.6
　eval から JSON.parse に変更

・version 0.0.5
　ブログで公開。細かいミスを修正

・version 0.0.4
　eow.alc.co.jp に対応

・version 0.0.3
　アイコン周り大幅修正。

・version 0.0.2
　DISABLE_IFRAME の設定が動作していなかったのを修正
　ON/OFF 周りを微修正

・version 0.0.1
　Twitter で初版公開
