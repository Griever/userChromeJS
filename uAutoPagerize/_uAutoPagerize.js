// uAutoPagerize の設定ファイルのサンプル。Ver 0.2.2 以降専用。
// 本体更新時に設定を書き換える手間を省くためのもので、無くても問題ない。

// 本体の EXCLUDE と入れ替わる
var EXCLUDE = [
	'https://mail.google.com/*'
	,'http://www.google.co.jp/reader/*'
	,'http://b.hatena.ne.jp/*'
	,'http://www.livedoor.com/*'
	,'http://reader.livedoor.com/*'
	,'http://fastladder.com/*'
	,'http://**mail.yahoo.co.jp/*'
	,'http://maps.google.co.jp/*'
	,'*/archives/*'
];

// 本体の MY_SITEINFO の先頭に追加される
var MY_SITEINFO = [
	{
		url         : '^https://mobile\\.twitter\\.com/[^/]+/status(?:es)?/\\d',
		nextLink    : 'id("tweets-list")/div[@class="list-tweet"][1]/div[@class="list-tweet-status permalink"]/a[@class="status_link"][2]',
		pageElement : 'id("tweets-list")',
	},
];

// 本体に組み込まれている MICROFORMAT を利用するか？
USE_MICROFORMAT = false;
