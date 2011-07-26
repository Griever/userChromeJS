// ==UserScript==
// @name           uAutoPagerize
// @namespace      http://d.hatena.ne.jp/Griever/
// @description    loading next page and inserting into current page.
// @include        main
// @compatibility  Firefox 4.0
// @version        0.1.9.1
// @note           0.1.9.1 Yahoo! 用の例外処理を修正
// @note           0.1.9 セキュリティ上の問題を修正
// @note           0.1.9 細部を調整
// ==/UserScript==

// this script based on
// AutoPagerize version: 0.0.41 2009-09-05T16:02:17+09:00 (http://autopagerize.net/)
// oAutoPagerize (http://d.hatena.ne.jp/os0x/searchdiary?word=%2a%5boAutoPagerize%5d)
//
// Released under the GPL license
// http://www.gnu.org/copyleft/gpl.html

(function(css) {

var EXCLUDE = [// RegExp
	'https://mail\\.google\\.com/.*'
	,'http://b\\.hatena\\.ne\\.jp/.*'
];

// 継ぎ足したページを履歴に入れる default:false
var ADD_HISTORY = false;

// 継ぎ足したページのリンクは新しいタブで開く default:true
var FORCE_TARGET_WINDOW = true;

var BASE_REMAIN_HEIGHT = 400;
var ONLOAD_TIMER = 0;
var CACHE_EXPIRE = 24 * 60 * 60 * 1000;
var XHR_TIMEOUT = 30 * 1000;
var SITEINFO_IMPORT_URLS = [
	'http://wedata.net/databases/AutoPagerize/items.json'
];

var MY_SITEINFO = [
	{
		url         : 'http://eow\\.alc\\.co\\.jp/[^/]+'
		,nextLink   : 'id("AutoPagerizeNextLink")'
		,pageElement: 'id("resultsList")/ul'
		,exampleUrl : 'http://eow.alc.co.jp/%E3%81%82%E3%82%8C/UTF-8/ http://eow.alc.co.jp/are'
	},
	{
		url         : '^http://(?:images|www)\\.google(?:\\.[^./]{2,3}){1,2}/(images\\?|search\\?.*tbm=isch)'
		,nextLink   : 'id("nn")/parent::a | id("navbar navcnt nav")//td[last()]/a'
		,pageElement: 'id("ImgCont ires")/table | id("ImgContent")'
		,exampleUrl : 'http://images.google.com/images?ndsp=18&um=1&safe=off&q=image&sa=N&gbv=1&sout=1'
	},
	{
		url         : '^http://matome\\.naver\\.jp/\\w+'
		,nextLink   : '//div[contains(concat(" ", @class, " "), " MdPagination03 ")]/strong[1]/following-sibling::a[1]'
		,pageElement: '//div[contains(concat(" ", @class, " "), " MdMTMWidgetList01 ")]'
		,exampleUrl : 'http://matome.naver.jp/odai/2127476492987286301'
	},
	{
		url         : '^https?://mobile\\.twitter\\.com/'
		,nextLink   : 'id("more_link") | //div[contains(concat(" ", @class, " "), " full-button ") or contains(concat(" ", @class, " "), " list-more ")]/a'
		,pageElement: '//div[contains(concat(" ", @class, " "), " list-tweet ")]'
		,exampleUrl : 'http://mobile.twitter.com/searches?q=%23css'
	},
	{
		url          : '^https?://gist\\.github\\.com/(?!gists/\\d+|\\d+$).'
		,nextLink    : '//div[contains(concat(" ",normalize-space(@class)," "), " pagination ")]/*[count(following-sibling::*)=0 and @href]'
		,pageElement : 'id("files")/*'
		,exampleUrl  : 'https://gist.github.com/Griever'
	}
];

var MICROFORMAT = [
	{
		url         : '^https?://.*',
		nextLink    : '//a[@rel="next"] | //link[@rel="next"]',
		insertBefore: '//*[contains(@class, "autopagerize_insert_before")]',
		pageElement : '//*[contains(@class, "autopagerize_page_element")]',
	}
];

var COLOR = {
	on: '#0f0',
	off: '#ccc',
	enable: '#0f0',
	disable: '#ccc',
	loading: '#0ff',
	terminated: '#00f',
	error: '#f0f'
}

if (typeof window.uAutoPagerize != 'undefined') {
	window.uAutoPagerize.theEnd();
}

var ns = window.uAutoPagerize = {
	EXCLUDE            : EXCLUDE,
	DEBUG              : false,
	AUTO_START         : true,
	ADD_HISTORY        : ADD_HISTORY,
	FORCE_TARGET_WINDOW: FORCE_TARGET_WINDOW,
	BASE_REMAIN_HEIGHT : BASE_REMAIN_HEIGHT,
	ONLOAD_TIMER       : ONLOAD_TIMER,
	MICROFORMAT        : MICROFORMAT,
	MY_SITEINFO        : MY_SITEINFO,
	SITEINFO           : [],

	get historyService() {
		delete historyService;
		return historyService = Cc["@mozilla.org/browser/global-history;2"]
				.getService(Ci.nsIBrowserHistory);
	},
	init: function() {
		ns.style = addStyle(css);
/*
		ns.icon = $('status-bar').appendChild($E(
			<statusbarpanel id="uAutoPagerize-icon"
			                class="statusbarpanel-iconic-text"
			                state="disable"
			                tooltiptext="disable"
			                onclick="if(event.button != 2) uAutoPagerize.iconClick(event);"
			                context=""/>
		));
*/
		ns.icon = $('urlbar-icons').appendChild($E(
			<image id="uAutoPagerize-icon"
			       state="disable"
			       tooltiptext="disable"
			       onclick="if(event.button != 2) uAutoPagerize.iconClick(event);"
			       style="padding: 0px 2px;"/>
		));
/*
		ns.context = $('contentAreaContextMenu').appendChild($E(
			<menuitem id="uAutoPagerize-context"
			          class="menuitem-iconic"
			          label="uAutoPagerize ON/OFF"
			          state="disable"
			          tooltiptext="disable"
			          oncommand="uAutoPagerize.iconClick(event);"/>
		));
*/
		ns.EXCLUDE = ns.EXCLUDE.map(function(e) new RegExp(e));
		if (!getCache())
			requestSITEINFO();

		GM_COOP();
		ns.addListener();
	},
	uninit: function() {
		ns.removeListener();
		//ns.saveFile('uAutoPagerize.json', JSON.stringify(ns.SITEINFO));
		let saveJSON = ns.SITEINFO.map(function(info){
			delete info.url_regexp;
			return info;
		});
		ns.saveFile('uAutoPagerize.json', JSON.stringify(saveJSON));
	},
	theEnd: function() {
		var i = $('uAutoPagerize-icon');
		if (i) i.parentNode.removeChild(i);
		i = $('uAutoPagerize-context');
		if (i) i.parentNode.removeChild(i);
		ns.style.parentNode.removeChild(ns.style);
		ns.removeListener();
	},
	destroy: function() {
		ns.theEnd();
		ns.uninit();
		delete window.uAutoPagerize;
	},
	addListener: function() {
		gBrowser.mPanelContainer.addEventListener('DOMContentLoaded', ns.domContentLoaded, true);
		//$('sidebar').addEventListener('DOMContentLoaded', ns.domContentLoaded, true);
		gBrowser.mTabContainer.addEventListener('TabSelect', ns.tabSelect, false);
		window.addEventListener('uAutoPagerize_destroy', ns.destroy, false);
		window.addEventListener('unload', ns.uninit, false);
	},
	removeListener: function() {
		gBrowser.mPanelContainer.removeEventListener('DOMContentLoaded', ns.domContentLoaded, true);
		//$('sidebar').removeEventListener('DOMContentLoaded', ns.domContentLoaded, true);
		gBrowser.mTabContainer.removeEventListener('TabSelect', ns.tabSelect, false);
		window.removeEventListener('uAutoPagerize_destroy', ns.destroy, false);
		window.removeEventListener('unload', ns.uninit, false);
	},
	launch: function(win, timer){
		var locationHref = win.location.href;
		if (locationHref.indexOf('http') != 0)
			return updateIcon();
		var doc = win.document;
		if (doc.contentType !== 'text/html' && doc.contentType.indexOf('xml') === -1)
			return updateIcon();
		if (doc.body instanceof HTMLFrameSetElement)
			return updateIcon();

		if (typeof win.AutoPagerize == 'undefined') {
			win.filters         = [];
			win.documentFilters = [];
			win.requestFilters  = [];
			win.responseFilters = [];
			win.AutoPagerize = {
				addFilter         : function(f) { win.filters.push(f) },
				addDocumentFilter : function(f) { win.documentFilters.push(f); },
				addResponseFilter : function(f) { win.responseFilters.push(f); },
				addRequestFilter  : function(f) { win.requestFilters.push(f); },
				launchAutoPager   : function(l) { launchAutoPager_org(l, win); }
			}
		}
		var ev = doc.createEvent('Event')
		ev.initEvent('GM_AutoPagerizeLoaded', true, false)
		doc.dispatchEvent(ev)

		var miscellaneous = [];
		// 継ぎ足されたページからは新しいタブで開く
		if (ns.FORCE_TARGET_WINDOW){
			win.documentFilters.push(function(doc){
				var arr = getElementsByXPath('//a[@href and not(starts-with(@href, "mailto:")) and not(starts-with(@href, "javascript:")) and not(starts-with(@href, "#"))]', doc);
				arr.forEach(function (elem){
					elem.setAttribute('target', '_blank');
				});
			});
		}
		if (ns.ADD_HISTORY) {
			win.documentFilters.push(function(_doc, _requestURL, _info){
				var uri = makeURI(_requestURL);
				ns.historyService.removePage(uri)
				ns.historyService.addPageWithDetails(uri, _doc.title, new Date().getTime() * 1000);
			});
		}

		if (/http\:\/\/\w+\.google\.(co\.jp|com)/.test(locationHref)) {
			if (!timer || timer < 400) timer = 400;
			win.addEventListener("hashchange", function(event) {
				if (!win.ap) {
					win.setTimeout(function(){
						let [, info] = ns.getInfo(ns.MY_SITEINFO, win);
						if (!info) [, info] = ns.getInfo(ns.SITEINFO, win);
						if (info) win.ap = new AutoPager(win.document, info);
						updateIcon();
					}, timer);
					return;
				}
				win.ap.win.removeEventListener("scroll", win.ap.scroll, false);
				if (win.ap.req) {
					win.ap.req.abort();
					win.ap.req = null;
				}
				if (win.ap.pageNum > 1) {
					win.ap.pageNum = 1;
					var separator = win.ap.doc.querySelector('.autopagerize_page_separator, .autopagerize_page_info');
					if (separator) {
						var insertPoint = win.ap.insertPoint;
						var range = doc.createRange();
						range.setStartBefore(separator);
						range.setEndAfter(insertPoint.previousSibling);
						range.deleteContents();
						range.detach();
					}
				}
				win.setTimeout(function(){
					var url = win.ap.getNextURL(win.ap.doc);
					if (!url) {
						win.ap.state = "disable";
						updateIcon();
						return;
					};
					win.ap.requestURL = url;
					win.ap.loadedURLs = {};
					win.ap.loadedURLs[doc.location.href] = true;
					win.ap.state = "enable";
					updateIcon();
					win.ap.win.addEventListener("scroll", win.ap.scroll, false);
					win.ap.scroll();
				}, timer);
			}, false);
		}
		if (/^https?:\/\/[^.]+\.google\.(?:[^.]{2,3}\.)?[^./]{2,3}\/.*?\b(vid(?:%3A|:)1|tbm=vid)/i.test(locationHref)) {
			// Google Video
			var js = '';
			var df = function (newDoc) {
				Array.slice(doc.querySelectorAll('[id^="vidthumb"]')).forEach(function(e){
					e.removeAttribute('id');
				});
				var x = getElementsByXPath('//script/text()[starts-with(self::text(), "(function(x){x&&(x.src=")]', newDoc);
				js = x.map(function(e) e.textContent ).join('\n');
			}
			var af = function af(elems) {
				var s = doc.createElement('script');
				s.type = 'text/javascript';
				s.textContent = js;
				doc.body.appendChild(s);
				doc.body.removeChild(s);
				js = '';
			}
			win.documentFilters.push(df);
			win.filters.push(af);
		}
		else if (/^http:\/\/(?:images|www)\.google(?:\.[^.\/]{2,3}){1,2}\/(images\?|search\?.*tbm=isch)/.test(locationHref)) {
			// Google Image
			let [, info] = ns.getInfo(ns.MY_SITEINFO, win);
			if (info && getFirstElementByXPath(info.pageElement, doc)) {
				if (!timer || timer < 1000) timer = 1000;
				win.requestFilters.push(function(opt) {
					opt.url = opt.url.replace(/\?/, '?gbv=1&').replace(/&?gbv=2/, '');
					if (opt.url.indexOf("sout=1") === -1)
						opt.url += "&sout=1";
				});
			}
		}
		else if (win.location.host === 'twitter.com') {
			win.documentFilters.push(function(_doc, _requestURL, _info) {
				win.ap.requestURL = win.ap.lastRequestURL;
			});
		}
		// oAutoPagerize
		else if (win.location.host === 'eow.alc.co.jp') {
			var alc = function(doc){
				var a,r = doc.evaluate('//p[@id="paging"]/a[last()]',
					doc,null,XPathResult.FIRST_ORDERED_NODE_TYPE,null);
				if (r.singleNodeValue) a = r.singleNodeValue;
				else return;
				a.id = 'AutoPagerizeNextLink';
				a.href = a.href.replace(/javascript:goPage\("(\d+)"\)/,'./?pg=$1');
			};
			win.documentFilters.push(alc);
			miscellaneous.push(alc);
		}
		else if (win.location.host === 'matome.naver.jp') {
			let [, info] = ns.getInfo(ns.MY_SITEINFO, win);

			var naver = function(doc){
				var next = getFirstElementByXPath(info.nextLink, doc);
				if (next) {
					next.href = win.location.pathname + '?page=' + next.textContent;
				}
			}
			win.documentFilters.push(naver);
			miscellaneous.push(naver);
		}
		else if (win.location.host === "www.youtube.com") {
			// from youtube_AutoPagerize_fix.js https://gist.github.com/761717
			win.documentFilters.push(function(_doc) {
				Array.slice(_doc.querySelectorAll('img[data-thumb]')).forEach(function(img) {
					img.src = img.getAttribute('data-thumb');
					img.removeAttribute('data-thumb');
				});
			});
		}
		if (win.frameElement && !(win.frameElement instanceof HTMLFrameElement))
			return;

		if (ns.EXCLUDE.some(function(ads) ads.test(locationHref)))
			return updateIcon();

		win.setTimeout(function(){
			win.ap = null;
			miscellaneous.forEach(function(func){ func(doc); });

			var index = -1;
			var [, info] = ns.getInfo(ns.MY_SITEINFO, win);
			//var s = new Date().getTime();
			if (!info) [index, info] = ns.getInfo(ns.SITEINFO, win);
			//debug(index + 'th/' + (new Date().getTime() - s) + 'ms');
			if (!info) [, info] = ns.getInfo(ns.MICROFORMAT, win);
			if (info) win.ap = new AutoPager(win.document, info);

			updateIcon();
			if (info && index > 20 && !/tumblr|fc2/.test(info.url)) {
				ns.SITEINFO.splice(index, 1);
				ns.SITEINFO.unshift(info);
			}
		}, timer||0);
	},

	domContentLoaded: function(event){
		var doc = event.target;
		if (ns.AUTO_START)
			ns.launch(doc.defaultView, ns.ONLOAD_TIMER);
	},
	tabSelect: function(event){
		if (!ns.AUTO_START)
			return
		updateIcon();
	},
	iconClick: function(event){
		if (!event.button){
			if (ns.AUTO_START){
				ns.AUTO_START = false;
				updateIcon();
			}else{
				ns.AUTO_START = true;
				if (!content.ap)
					ns.launch(content);
				else updateIcon();
			}
		}
		else if (event.button == 1){
			if (confirm('reset SITEINFO?'))
				requestSITEINFO();
		}
	},
	getInfo: function (list, win) {
		if (!list) list = ns.SITEINFO;
		if (!win)  win  = content;
		var doc = win.document;
		var locationHref = doc.location.href;
		for (let [index, info] in Iterator(list)) {
			try {
				var exp = info.url_regexp || (info.url_regexp = new RegExp(info.url));
				if ( !exp.test(locationHref) ) {
				} else if (!getFirstElementByXPath(info.nextLink, doc)) {
					// ignore microformats case.
					if (!exp.test('http://a'))
						debug('nextLink not found.', info.nextLink);
				} else if (!getFirstElementByXPath(info.pageElement, doc)) {
					if (!exp.test('http://a')) 
						debug('pageElement not found.', info.pageElement);
				} else {
					return [index, info];
				}
			} catch(e) {
				log('error at launchAutoPager() : ' + e);
			}
		}
		return [-1, null];
	},
	getInfoFromWindow: function (win) {
		if (!win)  win  = content;
		var list = ns.SITEINFO;
		var locationHref = win.location.href;
		return list.filter(function(info, index, array) {
			try {
				return new RegExp(info.url).test(locationHref);
			} catch(e){ }
		});
	},
	loadFile: loadFile,
	saveFile: saveFile,
	updateIcon: updateIcon,
	getCache: getCache,
	requestSITEINFO: requestSITEINFO,
	getCacheCallback: getCacheCallback,
	getCacheErrorCallback: getCacheErrorCallback
};

// Class
function AutoPager(doc, info) {
	this.init.apply(this, arguments);
};
AutoPager.prototype = {
	req: null,
	pageNum: 1,
	state: 'enable',

	init: function(doc, info) {
		this.doc = doc;
		this.win = doc.defaultView;
		this.documentElement = doc.documentElement;
		this.body = doc.body;
		this.info = info;
		this.isXML = this.doc.contentType.indexOf('xml') > 0;
		this.isFrame = this.win.top != this.win;

		var url = this.getNextURL(this.doc);
		if ( !url ) {
			log("getNextURL returns null.", this.info.nextLink);
			return;
		}
		if (info.insertBefore) {
			this.insertPoint = getFirstElementByXPath(this.info.insertBefore, this.doc);
		}

		if (!this.insertPoint) {
			var lastPageElement = getElementsByXPath(this.info.pageElement, this.doc).pop();
			if (lastPageElement) {
				this.insertPoint = lastPageElement.nextSibling ||
					lastPageElement.parentNode.appendChild(this.doc.createTextNode(' '));
			}
		}
		if (!this.insertPoint) {
			log("insertPoint not found.", lastPageElement, this.info.pageElement);
			return;
		}

		if (this.isFrame)
			this.initIcon();

		this.requestURL = url;
		this.loadedURLs = {};
		this.loadedURLs[doc.location.href] = true;

		var self = this;
		this.scroll = function() { self.onScroll() };
		this.pagehide = function() { self.onPagehide() };
		this.win.addEventListener("scroll", this.scroll, false);
		this.win.addEventListener("pagehide", this.pagehide, false);

		var scrollHeight = Math.max(this.documentElement.scrollHeight, this.body.scrollHeight);
		var bottom = getElementPosition(this.insertPoint).top ||
			this.getPageElementsBottom() || (Math.round(scrollHeight * 0.8));
		this.remainHeight = scrollHeight - bottom + ns.BASE_REMAIN_HEIGHT;
		
		this.scroll();
		scrollHeight = Math.max(this.documentElement.scrollHeight, this.body.scrollHeight);
		if (scrollHeight == this.win.innerHeight)
			this.body.style.minHeight = (this.win.innerHeight + 1) + 'px';
	},
	setState : function(state){
		this.state = state;
		updateIcon();
		if (state != "loading") {
			Array.forEach(this.doc.getElementsByClassName('autopagerize_icon'), function(e) {
				e.style.background = COLOR[state];
			});
		}
		if (state === 'terminated' || state === 'error')
			this.win.removeEventListener('scroll', this.scroll, false)
	},
	onPagehide: function(event){
		//this.win.removeEventListener('scroll', this.scroll, false);
		//this.win.removeEventListener('pagehide', this.pagehide, false);
		if (this.req) {
			this.req.abort();
			this.req = null;
		}
	},
	onScroll : function(){
		if (this.state !== 'enable' || !ns.AUTO_START)
			return;
		var scrollHeight = Math.max(this.documentElement.scrollHeight, this.body.scrollHeight);
		var remain = scrollHeight - this.win.innerHeight - this.win.scrollY;
		if (remain < this.remainHeight) {
			this.request();
		}
	},
	request : function(){
		if (!this.requestURL || this.lastRequestURL == this.requestURL)
			return;

		var url_s = this.requestURL.split('/');
		if (url_s[0] !== this.win.location.protocol) {
			debug("external scheme.");
			this.setState('error');
			return;
		}
		var host = this.win.location.host;
		var isSameDomain = url_s[2] === host;

		this.lastRequestURL = this.requestURL;
		var self = this;
		var headers = {};
		if (isSameDomain) {
			headers.Cookie = this.doc.cookie;
		} else {
			// ドメインは違うけど下記のドメイン同士なら許可
			let ok = ["yahoo.co.jp", "livedoor.com"].some(function(h){
				return url_s[2].slice(-h.length) === h && host.slice(-h.length) === h;
			});
			if (!ok) {
				debug('external domain.');
				this.setState('error');
				return;
			}
		}
		var opt = {
			method: 'get',
			get url() self.requestURL,
			set url(url) self.requestURL = url,
			headers: headers,
			overrideMimeType: 'text/html; charset=' + this.doc.characterSet,
			onerror: function(){ self.setState('error'); self.req = null; },
			onload: function(res) { self.requestLoad.apply(self, [res]); self.req = null; }
		}
		this.win.requestFilters.forEach(function(i) { i(opt) }, this);
		this.setState('loading');
		this.req = GM_xmlhttpRequest(opt, isSameDomain? this.win : null);
	},
	requestLoad : function(res){
		if (res.URI.scheme !== res.originalURI.scheme) {
			debug("external scheme.");
			this.setState('error');
			return;
		}
		let before = res.URI.host;
		let after  = res.originalURI.host;
		if (before !== after) {
			let ok = ["yahoo.co.jp", "livedoor.com"].some(function(h){
				return before.slice(-h.length) === h && after.slice(-h.length) === h;
			});
			if (!ok) {
				debug('finalUrl is external domain.' , res.originalURI.spec);
				this.setState('error');
				return;
			}
		}
		delete res.URI;
		delete res.originalURI;

		this.win.responseFilters.forEach(function(i) { i(res, this.requestURL) }, this);
		if (res.finalUrl)
			this.requestURL = res.finalUrl;

		var str = res.responseText;
		var htmlDoc;
		if (this.isXML){
			htmlDoc = new DOMParser().parseFromString(str, "application/xml");
		} else {
			// thx! http://pc12.2ch.net/test/read.cgi/software/1253771697/478
			htmlDoc = this.doc.cloneNode(false);
			htmlDoc.appendChild(htmlDoc.importNode(this.documentElement, false));
			var range = this.doc.createRange();
			//range.selectNodeContents(this.body);
			htmlDoc.documentElement.appendChild(range.createContextualFragment(str));
			range.detach();
		}
		this.win.documentFilters.forEach(function(i) { i(htmlDoc, this.requestURL, this.info) }, this);

		try {
			var page = getElementsByXPath(this.info.pageElement, htmlDoc);
			var url = this.getNextURL(htmlDoc);
		}
		catch(e){
			this.setState('error');
			return;
		}

		if (!page || page.length < 1 ) {
			debug('pageElement not found.' , this.info.pageElement);
			this.setState('terminated');
			return;
		}

		if (this.loadedURLs[this.requestURL]) {
			debug('page is already loaded.', this.requestURL, this.info.nextLink);
			this.setState('terminated');
			return;
		}

		if (typeof this.win.ap == 'undefined'){
			this.win.ap = { state: 'enabled' };
			updateIcon(this.win);
		}
		this.loadedURLs[this.requestURL] = true;
		page = this.addPage(htmlDoc, page);
		this.win.filters.forEach(function(i) { i(page) });
		this.requestURL = url;
		this.setState('enable');
		//this.onScroll();
		if (!url) {
			debug('nextLink not found.', this.info.nextLink, htmlDoc);
			this.setState('terminated');
		}
		var ev = this.doc.createEvent('Event');
		ev.initEvent('GM_AutoPagerizeNextPageLoaded', true, false);
		this.doc.dispatchEvent(ev);
	},
	addPage : function(htmlDoc, page){
		var hr = this.doc.createElement('hr');
		var p  = this.doc.createElement('p');
		hr.setAttribute('class', 'autopagerize_page_separator');
		p.setAttribute('class', 'autopagerize_page_info');
		var self = this;

		if (this.insertPoint.compareDocumentPosition(this.doc) >= 32) {
			this.insertPoint = null;
			if (this.info.insertBefore) {
				this.insertPoint = getFirstElementByXPath(this.info.insertBefore, this.doc);
			}
			if (!this.insertPoint) {
				var lastPageElement = getElementsByXPath(this.info.pageElement, this.doc).pop();
				if (lastPageElement) {
					this.insertPoint = lastPageElement.nextSibling ||
						lastPageElement.parentNode.appendChild(this.doc.createTextNode(' '));
				}
			}
			if (!this.insertPoint) {
				debug("insertPoint not found.", lastPageElement, this.info.pageElement);
				this.setState('error');
				return [];
			}
			var scrollHeight = Math.max(this.documentElement.scrollHeight, this.body.scrollHeight);
			var bottom = getElementPosition(this.insertPoint).top ||
				this.getPageElementsBottom() || (Math.round(scrollHeight * 0.8));
			this.remainHeight = scrollHeight - bottom + ns.BASE_REMAIN_HEIGHT;
		}
		var insertParent = this.insertPoint.parentNode;
		if (page[0] && page[0].tagName == 'TR') {
			var colNodes = getElementsByXPath('child::tr[1]/child::*[self::td or self::th]', insertParent);

			var colums = 0;
			for (var i = 0, l = colNodes.length; i < l; i++) {
				var col = colNodes[i].getAttribute('colspan');
				colums += parseInt(col, 10) || 1;
			}
			var td = this.doc.createElement('td');
			td.appendChild(hr);
			td.appendChild(p);
			var tr = this.doc.createElement('tr');
			td.setAttribute('colspan', colums);
			tr.appendChild(td);
			insertParent.insertBefore(tr, this.insertPoint);
		}
		else {
			insertParent.insertBefore(hr, this.insertPoint);
			insertParent.insertBefore(p, this.insertPoint);
		}

		p.innerHTML = 'page: <a class="autopagerize_link" href="' +
			this.requestURL.replace(/&/g, '&amp;') + '">' + (++this.pageNum) + '</a> ';

		if (!this.isFrame) {
			var o = p.insertBefore(this.doc.createElement('div'), p.firstChild);
			o.setAttribute('class', 'autopagerize_icon');
			o.style.cssText = [
				'background: ', COLOR['enable'], ';'
				,'width: .8em;'
				,'height: .8em;'
				,'padding: 0px;'
				,'margin: 0px .4em 0px 0px;'
				,'display: inline-block;'
				,'vertical-align:middle;'
			].join('');
			o.addEventListener('click', function(event) {
				if (event.button != 0 || !event.isTrusted) return;
				if (!/^(enable|disable)$/.test(self.state)) return;
				self.setState(self.state == 'enable'? 'disable' : 'enable');
			}, false);
		}

		var df = this.doc.createDocumentFragment();
		page.forEach(function(i) { df.appendChild(i); }, this);
		insertParent.insertBefore(df, this.insertPoint);

		return page.map(function(i) {
			var pe = i || this.doc.importNode(i, true);
			//insertParent.insertBefore(pe, self.insertPoint);
			var ev = this.doc.createEvent('MutationEvent');
			ev.initMutationEvent('AutoPagerize_DOMNodeInserted', true, false,
			                     insertParent, null,
			                     self.requestURL, null, null);
			pe.dispatchEvent(ev);
			return pe;
		}, this);
	},
	getNextURL : function(doc) {
		var nextLink = getFirstElementByXPath(this.info.nextLink, doc);
		if (nextLink) {
			var nextValue = nextLink.getAttribute('href') ||
				nextLink.getAttribute('action') || nextLink.value;

			if (nextValue.indexOf('http') != 0){
				var anc = this.doc.createElement('a');
				anc.setAttribute('href', nextValue);
				nextValue = anc.href;
			}
			return nextValue;
		}
	},
	getPageElementsBottom : function() {
		try {
			var elem = getElementsByXPath(this.info.pageElement, this.doc).pop();
			return getElementBottom(elem);
		}
		catch(e) {}
	},
	initIcon: function() {
		var self = this;
		var div = self.doc.createElement("div");
		div.setAttribute('id', 'autopagerize_icon');
		var s = div.style;
		s.fontSize   = '12px';
		s.position   = 'fixed';
		s.top        = '3px';
		s.right      = '3px';
		s.background = COLOR[self.state == 'enable'? 'enable' : 'disable'];
		s.color      = '#fff';
		s.width  = '10px';
		s.height = '10px';
		s.zIndex = '255';
		self.icon = self.body.appendChild(div);

		self.setState = function(state) {
			self.state = state;
			self.icon.style.background = COLOR[self.state];
			if (state === 'terminated' || state === 'error') {
				self.win.removeEventListener('scroll', self.scroll, false)
				self.state = 'disable';
				self.win.setTimeout(function() {
					self.icon.style.background = COLOR[self.state];
					self.icon.style.display = 'none';
				}, 1500);
			}
		}
		
		var toggle = function(event) {
			self.state = self.state == 'enable'? 'disable' : 'enable';
			self.icon.style.backgroundColor = COLOR[self.state];
		}

		self.icon.addEventListener('click', toggle, false);
		self.win.addEventListener('pagehide', function(event) {
			event.currentTarget.removeEventListener(event.type, arguments.callee, false);
			self.icon.removeEventListener('click', toggle, false);
		}, false);
	},
};



function updateIcon(win){
	var newState = "";
	if (ns.AUTO_START == false) {
		newState = "off";
	} else {
		win || (win = content);
		if (win.ap) {
			newState = win.ap.state;
		} else {
			newState = "disable"
		}
	}
	ns.icon.setAttribute('state', newState);
	ns.icon.setAttribute('tooltiptext', newState);
	if (ns.context) {
		ns.context.setAttribute('state', newState);
		ns.context.setAttribute('tooltiptext', newState);
	}
}

function launchAutoPager_org(list, win) {
	try {
		var doc = win.document;
		var locationHref = win.location.href;
	} catch(e) {
		return;
	}
	list.some(function(info, index, array) {
		try {
			var exp = new RegExp(info.url);
			if (win.ap) {
			} else if ( ! exp.test(locationHref) ) {
			} else if (!getFirstElementByXPath(info.nextLink, doc)) {
				// ignore microformats case.
				if (!exp.test('http://a'))
					debug('nextLink not found.', info.nextLink);
			} else if (!getFirstElementByXPath(info.pageElement, doc)) {
				if (!exp.test('http://a'))
					debug('pageElement not found.', info.pageElement);
			} else {
				win.ap = new AutoPager(doc, info);
				return true;
			}
		} catch(e) {
			log('error at launchAutoPager() : ' + e);
		}
	});
	updateIcon();
}


function getElementsByXPath(xpath, node) {
	var nodesSnapshot = getXPathResult(xpath, node, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
	var data = [];
	for (var i = 0, l = nodesSnapshot.snapshotLength; i < l; i++) {
		data[i] = nodesSnapshot.snapshotItem(i);
	}
	return data;
}

function getFirstElementByXPath(xpath, node) {
	var result = getXPathResult(xpath, node, XPathResult.FIRST_ORDERED_NODE_TYPE);
	return result.singleNodeValue;
}

function getXPathResult(xpath, node, resultType) {
	var doc = node.ownerDocument || node
	var resolver = doc.createNSResolver(node.documentElement || node)
	// Use |node.lookupNamespaceURI('')| for Opera 9.5
	var defaultNS = node.lookupNamespaceURI(null)
	if (defaultNS) {
		const defaultPrefix = '__default__'
		xpath = addDefaultPrefix(xpath, defaultPrefix)
		var defaultResolver = resolver
		resolver = function (prefix) {
			return (prefix == defaultPrefix)
				? defaultNS : defaultResolver.lookupNamespaceURI(prefix)
		}
	}
	return doc.evaluate(xpath, node, resolver, resultType, null)
}

function addDefaultPrefix(xpath, prefix) {
	const tokenPattern = /([A-Za-z_\u00c0-\ufffd][\w\-.\u00b7-\ufffd]*|\*)\s*(::?|\()?|(".*?"|'.*?'|\d+(?:\.\d*)?|\.(?:\.|\d+)?|[\)\]])|(\/\/?|!=|[<>]=?|[\(\[|,=+-])|([@$])/g
	const TERM = 1, OPERATOR = 2, MODIFIER = 3
	var tokenType = OPERATOR
	prefix += ':'
	function replacer(token, identifier, suffix, term, operator, modifier) {
		if (suffix) {
			tokenType =
				(suffix == ':' || (suffix == '::' &&
				 (identifier == 'attribute' || identifier == 'namespace')))
				? MODIFIER : OPERATOR
		}
		else if (identifier) {
			if (tokenType == OPERATOR && identifier != '*') {
				token = prefix + token
			}
			tokenType = (tokenType == TERM) ? OPERATOR : TERM
		}
		else {
			tokenType = term ? TERM : operator ? OPERATOR : MODIFIER
		}
		return token
	}
	return xpath.replace(tokenPattern, replacer)
};

function getElementPosition(elem) {
	var offsetTrail = elem;
	var offsetLeft  = 0;
	var offsetTop   = 0;
	while (offsetTrail) {
		offsetLeft += offsetTrail.offsetLeft;
		offsetTop  += offsetTrail.offsetTop;
		offsetTrail = offsetTrail.offsetParent;
	}
	return {left: offsetLeft || null, top: offsetTop|| null};
}

function getElementBottom(elem) {
	var doc = elem.ownerDocument;
	if ('getBoundingClientRect' in elem){
		var rect = elem.getBoundingClientRect();
		var top = parseInt(rect.top, 10) + (doc.body.scrollTop || doc.documentElement.scrollTop);
		var height = parseInt(rect.height, 10);
	}else{
		var c_style = doc.defaultView.getComputedStyle(elem, '');
		var height  = 0;
		var prop    = ['height', 'borderTopWidth', 'borderBottomWidth',
			'paddingTop', 'paddingBottom',
			'marginTop', 'marginBottom'];
		prop.forEach(function(i) {
			var h = parseInt(c_style[i]);
			if (typeof h == 'number') {
				height += h;
			}
		});
		var top = getElementPosition(elem).top;
	}
	return top ? (top + height) : null;
}


// end utility functions.

function GM_COOP() {
	var ret = false;
/*
	scflag:try {
		var svc = Cc["@scriptish.erikvold.com/scriptish-service;1"];
		if (!svc) break scflag;
		svc = svc.getService().wrappedJSObject;
		svc.injectScripts_original = svc.injectScripts;
		if (svc.uAutoPagerize) {
			ret = true;
			break scflag;
		}
		svc.uAutoPagerize = true;

		let tmp = Cu.import("resource://scriptish/utils/Scriptish_getFirebugConsole.js", {});
		let Scriptish_getFirebugConsole = tmp.Scriptish_getFirebugConsole;
		let XPATH_RESULT = Ci.nsIDOMXPathResult;

		eval("svc.injectScripts = " + svc.injectScripts_original.toString()
			.replace(
				"var fbConsole",
				<![CDATA[
				var data = chromeWin.GrieverWindowStore.get(unsafeContentWin);
				wrappedContentWin = {
					AutoPagerize: data.AutoPagerize,
					unsafeWindow: unsafeContentWin,
					__proto__: wrappedContentWin
				};
				var fbConsole
				]]>.toString()
			)
			.replace(
				"sandbox.unsafeWindow = unsafeContentWin;",
				<![CDATA[
				sandbox.unsafeWindow = unsafeContentWin;
				sandbox.window = wrappedContentWin;
				]]>.toString()
			)
		);
		ret = true;
	} catch(e) {}

	gmflag:try{
		var gm = Components.classes['@greasemonkey.mozdev.org/greasemonkey-service;1'];
		if (!gm) break gmflag;
		gm = gm.getService().wrappedJSObject;
		if (gm.uAutoPagerize) {
			ret = true;
			break gmflag;
		}
		gm.uAutoPagerize = true;
		var addBefore = function(target,name,newFunc){
			var original = target[name];
			target[name] = function(){
				newFunc.apply(target,arguments);
				var tmp = original.apply(target,arguments);
				return tmp;
			};
			target[name + '_original'] = original;
		}
		addBefore(gm,"evalInSandbox",function(code, codebase, sandbox, script){
			try{
				if ('AutoPagerize' in sandbox.window) return;

				var win = GrieverWindowStore.get(sandbox.document.defaultView);
				if ('AutoPagerize' in win)
					sandbox.window.AutoPagerize = win.AutoPagerize;
			}catch(e){}
		});
		ret = true;
	} catch(e){ }
	return ret;
*/
}

function getCache() {
	try{
		var cache = loadFile('uAutoPagerize.json');
		if (!cache) return false;
		cache = JSON.parse(cache);
		ns.SITEINFO = cache;
		log('[uAutoPagerize] Load cacheInfo.');
		return true;
	}catch(e){
		log('[uAutoPagerize] Error getCache.')
		return false;
	}
}

function requestSITEINFO(){
	var xhrStates = {};
	SITEINFO_IMPORT_URLS.forEach(function(i) {
		var opt = {
			method: 'get',
			url: i,
			onload: function(res) {
				xhrStates[i] = 'loaded';
				getCacheCallback(res, i);
			},
			onerror: function(res){
				xhrStates[i] = 'error';
				getCacheErrorCallback(i);
			},
		}
		xhrStates[i] = 'start';
		GM_xmlhttpRequest(opt);
		setTimeout(function() {
			if (xhrStates[i] == 'start') {
				getCacheErrorCallback(i);
			}
		}, XHR_TIMEOUT);
	});
};

function getCacheCallback(res, url) {
	if (res.status != 200) {
		return getCacheErrorCallback(url);
	}

	var info;
	try {
		var s = new Components.utils.Sandbox( new XPCNativeWrapper(window) );
		info = Components.utils.evalInSandbox(res.responseText, s).map(function(i) { return i.data });
	} catch(e) {
		info = [];
	}
	if (info.length > 0) {
		info = info.filter(function(i) { return ('url' in i) })
		info.sort(function(a, b) { return (b.url.length - a.url.length) })

		var r_keys = ['url', 'nextLink', 'insertBefore', 'pageElement']
		info = info.map(function(i) {
			var item = {};
			r_keys.forEach(function(key) {
				if (i[key]) {
					item[key] = i[key];
				}
			});
			return item;
		});
//		var cacheInfo = {};
//		cacheInfo[url] = {
//			url: url,
//			expire: new Date(new Date().getTime() + CACHE_EXPIRE),
//			info: info
//		};
		ns.SITEINFO = info;
		log('getCacheCallback:' + url);
	}
	else {
		getCacheErrorCallback(url);
	}
}

function getCacheErrorCallback(url) {
	log('getCacheErrorCallback:' + url);
}

function GM_xmlhttpRequest(obj, win) {
	if (typeof(obj) != 'object' || (typeof(obj.url) != 'string' && !(obj.url instanceof String))) return;
	if (!win || "@maone.net/noscript-service;1" in Cc) win = window;

	var req = new win.XMLHttpRequest();
	req.open(obj.method || 'GET',obj.url,true);

	if (typeof(obj.headers) == 'object')
		for(var i in obj.headers)
			req.setRequestHeader(i,obj.headers[i]);
	if (obj.overrideMimeType)
		req.overrideMimeType(obj.overrideMimeType);
	
	['onload','onerror','onreadystatechange'].forEach(function(k) {
		if (obj[k] && (typeof(obj[k]) == 'function' || obj[k] instanceof Function)) req[k] = function() {
			obj[k]({
				status          : (req.readyState == 4) ? req.status : 0,
				statusText      : (req.readyState == 4) ? req.statusText : '',
				responseHeaders : (req.readyState == 4) ? req.getAllResponseHeaders() : '',
				responseText    : req.responseText,
				responseXML     : req.responseXML,
				readyState      : req.readyState,
				finalUrl        : (req.readyState == 4) ? req.channel.URI.spec : '',
				URI             : req.channel.URI,
				originalURI     : req.channel.originalURI
			});
		};
	});

	req.send(null);
	return req;
}

function log(){ Application.console.log($A(arguments)); }

function debug(){ if (ns.DEBUG) Application.console.log('DEBUG: ' + $A(arguments)); };

function $(id, doc) (doc || document).getElementById(id);
function U(text) 1 < 'あ'.length ? decodeURIComponent(escape(text)) : text;
function $A(arr) Array.slice(arr);
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

function addStyle(css) {
	var pi = document.createProcessingInstruction(
		'xml-stylesheet',
		'type="text/css" href="data:text/css;utf-8,' + encodeURIComponent(css) + '"'
	);
	return document.insertBefore(pi, document.documentElement);
}

function loadFile(name) {
	var file = Cc['@mozilla.org/file/directory_service;1']
		.getService(Ci.nsIProperties)
		.get('UChrm', Ci.nsIFile);
	file.append(name);
	var fstream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
	var sstream = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(Ci.nsIScriptableInputStream);
	fstream.init(file, -1, 0, 0);
	sstream.init(fstream);

	var data = sstream.read(sstream.available());
	try {
		data = decodeURIComponent(escape(data));
	} catch(e) {  }
	sstream.close();
	fstream.close();
	return data;
}

function saveFile(name, data) {
	var file = Cc['@mozilla.org/file/directory_service;1']
		.getService(Ci.nsIProperties)
		.get('UChrm', Ci.nsIFile);
	file.append(name);

	var suConverter = Cc["@mozilla.org/intl/scriptableunicodeconverter"].createInstance(Ci.nsIScriptableUnicodeConverter);
	suConverter.charset = 'UTF-8';
	data = suConverter.ConvertFromUnicode(data);

	var foStream = Cc['@mozilla.org/network/file-output-stream;1'].createInstance(Ci.nsIFileOutputStream);
	foStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
	foStream.write(data, data.length);
	foStream.close();
};

})(<![CDATA[

#uAutoPagerize-icon,
#uAutoPagerize-context {
	list-style-image: url(
		data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAAAQCAYAAACBSfjBAAAA2klEQVRYhe
		2WwYmGMBhE390+0kCOwZLswQK82YAg2Ict2IBdeJ3/FHcW9oewnoRv4N0yGB4TECLPs22bHIBlWeQAzP
		Msp/a7q5MDkM4kB6DsRc7PDaTfQEqnHIBSdjm1fXWXHIAznXIA9rLLub+esxyA4zjkfDsXAkNgCHy/wM
		jDtK5tHEc5td+6tn7t5dz9xrX1/Sqn9lvXtvarnNpvXdtfLzUEhsAQ+H6BkYdpXdswDHJqv3Vtecpy7n
		7j2nKe5NR+69qmPMmp/da1ff2NCYEhMAS+WmDk//kA2XH2W9CWRjQAAAAASUVORK5CYII=
		);
}
#uAutoPagerize-icon[state="disable"],
#uAutoPagerize-context[state="disable"]    { -moz-image-region: rect(0px 16px 16px 0px ); }
#uAutoPagerize-icon[state="enable"],
#uAutoPagerize-context[state="enable"]     { -moz-image-region: rect(0px 32px 16px 16px); }
#uAutoPagerize-icon[state="terminated"],
#uAutoPagerize-context[state="terminated"] { -moz-image-region: rect(0px 48px 16px 32px); }
#uAutoPagerize-icon[state="error"],
#uAutoPagerize-context[state="error"]      { -moz-image-region: rect(0px 64px 16px 48px); }
#uAutoPagerize-icon[state="off"],
#uAutoPagerize-context[state="off"]        { -moz-image-region: rect(0px 80px 16px 64px); }


#uAutoPagerize-icon[state="loading"],
#uAutoPagerize-context[state="loading"] {
	list-style-image: url(data:image/gif;base64,
		R0lGODlhEAAQAKEDADC/vyHZ2QD//////yH/C05FVFNDQVBFMi4wAwEAAAAh+QQJCgADACwAAAAAEAAQ
		AAACIJyPacKi2txDcdJmsw086NF5WviR32kAKvCtrOa2K3oWACH5BAkKAAMALAAAAAAQABAAAAIinI9p
		wTEChRrNRanqi1PfCYLACIQHWZoDqq5kC8fyTNdGAQAh+QQJCgADACwAAAAAEAAQAAACIpyPacAwAcMQ
		VKz24qyXZbhRnRNJlaWk6sq27gvH8kzXQwEAIfkECQoAAwAsAAAAABAAEAAAAiKcj6kDDRNiWO7JqSqU
		1O24hCIilMJomCeqokPrxvJM12IBACH5BAkKAAMALAAAAAAQABAAAAIgnI+pCg2b3INH0uquXqGH7X1a
		CHrbeQiqsK2s5rYrehQAIfkECQoAAwAsAAAAABAAEAAAAiGcj6nL7Q+jNKACaO/L2E4mhMIQlMEijuap
		pKSJim/5DQUAIfkECQoAAwAsAAAAABAAEAAAAiKcj6nL7Q+jnLRaJbIYoYcBhIChbd4njkPJeaBIam33
		hlUBACH5BAEKAAMALAAAAAAQABAAAAIgnI+py+0PoxJUwGofvlXKAAYDQAJLKJamgo7lGbqktxQAOw==
		);
}

#uAutoPagerize-icon > .statusbarpanel-text {
	display: none !important;
}

]]>.toString().replace(/\n|\t/g, ''));

window.uAutoPagerize.init();
