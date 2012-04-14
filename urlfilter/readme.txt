■このスクリプトについて
Opera のコンテンツブロック（urlfilter.ini）を参考にした Adblock っぽいものです。


■使い方
urlfilter.uc.js をインストールし、urlfilter.ini を Chrome フォルダに置いてください。
フィルタの追加はアドレスバー内のアイコンを右クリックするか、urlfilter.ini を直接編集してください。


■書式
Opera 同様フィルタは完全一致で、ワイルドカード（*）が使えます。
フィルタっぽくない行は全てコメントとして扱います。

例: http://www.example.com/index.html にマッチするフィルタ
完全一致: http://www.example.com/index.html
前方一致: http://www.example.com/*
後方一致: *.example.com/index.html
部分一致: *.example.com/*
その他  : http://*.example.*/index.html


■書式2
独自機能として "://*." は Chrome の @match の様な動作をします。
例: http://www.example.com/ と http://example.com/ にマッチするフィルタ
  : http://*.example.com/

"/" で始まり "/" で終わる行は正規表現になります。
大文字小文字区別せず、部分一致になります。

Adblock のホワイトリスト（@@）、$image も使えます。


■ver 0.0.4 をお使いの方へ
var 0.0.5 より設定ファルが json から ini になりました。
ini がない場合は json を読み込み、終了時に ini を自動作成するのでフィルタはそのまま使えます。
