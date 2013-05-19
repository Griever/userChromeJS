// ==UserScript==
// @name           CrossFireModoki.uc.js
// @description    Opera の空間ナビゲーションのまねごと
// @namespace      http://d.hatena.ne.jp/Griever/
// @author         Griever
// @license        MIT License
// @compatibility  Firefox 16
// @charset        UTF-8
// @include        main
// @version        0.0.3
// @note           0.0.3 操作を Shift+Alt+カーソルに変更(Win8のショートカットキーとダブっていたため)
// @note           gist に放置していた物を移動
// ==/UserScript==
/*
Shift＋Alt＋カーソルキーで動く。


※対応未定
フレームまたぎ
img[onclick] などブラウザのフォーカスが当たらないもの

*/
(function(){
"use strict";

if (window.gCrossFireModoki) {
	window.gCrossFireModoki.destroy();
	delete window.gCrossFireModoki;
}

window.gCrossFireModoki = {
	DEBUG: false,
	SELECTOR: [
		':-moz-any-link'
		, 'textarea:enabled:not([readonly])'
		, 'input:enabled:not([readonly])'
		, 'button:enabled:not([readonly])'
		, 'select:enabled:not([readonly])'
		, ':-moz-any-link img'
	].join(","),
	
	_timer: null,
	timeout: function(func, time, win) {
		win || (win = window);
		win.clearTimeout(this._timer);
		return this._timer = win.setTimeout(func, time);
	},
	getFocusedWindow: function() {
		var win = document.commandDispatcher.focusedWindow;
		return (!win || win == window) ? window.content : win;
	},
	init: function() {
		gBrowser.mPanelContainer.addEventListener("keypress", this, true);
		window.addEventListener("unload", this, false);
	},
	uninit: function() {
		gBrowser.mPanelContainer.removeEventListener("keypress", this, true);
		window.removeEventListener("unload", this, false);
	},
	destroy: function() {
		this.uninit();
	},
	handleEvent: function(event) {
		switch(event.type){
			case "keypress":
				if (event.ctrlKey || !event.shiftKey || !event.altKey) return;

				var dir = null;
				switch(event.keyCode) {
					case event.DOM_VK_UP:
						dir = "up";
						break;
					case event.DOM_VK_RIGHT:
						dir = "right";
						break;
					case event.DOM_VK_DOWN:
						dir = "down";
						break;
					case event.DOM_VK_LEFT:
						dir = "left";
						break;
				}
				if (!dir) return;

				event.preventDefault();
				event.stopPropagation();
				this.find(dir, event.view);
				break;
			case "unload":
				this.uninit();
				break;
		}
	},
	find: function(aDir, aWin) {
		var win = aWin || this.getFocusedWindow();
		var doc = win.document;
		if (doc instanceof XULDocument) return;
		if (doc.body instanceof HTMLFrameSetElement) {
			win.frames[0].focus();
			return;
		}

		var isPrev = aDir === "up" || aDir === "left";
		var inWidth = win.innerWidth;
		var inHeight = win.innerHeight;
		var cRect = null;
		var currentNode = doc.activeElement;

		if (currentNode != doc.body) {
			cRect = getFirstLineRect(currentNode, isPrev);
		} else {
			var sel = win.getSelection();
			if (sel.rangeCount) {
				// selection-range を起点に使う
				var range = sel.getRangeAt(0);
				currentNode = range.startContainer;
				// 選択範囲が無く、node が画像
				if (range.collapsed && currentNode.localName === 'img')
					range = currentNode;
				cRect = getRect(range);
			}
		}
		if (!cRect || cRect.top > inHeight || cRect.right < 0 || cRect.bottom < 0 || cRect.left > inWidth) {
			cRect = this.createStartRect(win, aDir);
		}

		// ここから頭痛いゾーン
		var aX, aY, aT, aR, aB, aL;// nodesFromRect の引数用
		var _top, _right, _bottom, _left, _width, _height, _centerX, _centerY;// cRect を回した視点から見るための変数
		switch(aDir) {
			case "up":
				if (cRect.top < 5) {
					debug("nofind scroll.");
					return this.scrollHalf(win, aDir);
				}
				[aX, aY, aT, aR, aB, aL] = [0, 0, 0, inWidth, cRect.top - 1, 0];
				[_top, _right, _bottom, _left, _width, _height, _centerX, _centerY] = 
					["top", "right", "bottom", "left", "width", "height", "centerX", "centerY"];
				break;
			case "right":
				if (cRect.right > inWidth - 5) {
					debug("nofind scroll.");
					return this.scrollHalf(win, aDir);
				}
				[aX, aY, aT, aR, aB, aL] = [cRect.right + 1, 0, 0, inWidth - cRect.right, inHeight, 0];
				[_top, _right, _bottom, _left, _width, _height, _centerX, _centerY] = 
					["right", "bottom", "left", "top", "height", "width", "centerY", "centerX"];
				break;
			case "down":
				if (cRect.bottom > inHeight - 5) {
					debug("nofind scroll.");
					return this.scrollHalf(win, aDir);
				}
				[aX, aY, aT, aR, aB, aL] = [0, cRect.bottom + 1, 0, inWidth, inHeight - cRect.bottom, 0];
				[_top, _right, _bottom, _left, _width, _height, _centerX, _centerY] = 
					["bottom", "left", "top", "right", "width", "height", "centerX", "centerY"];
				break;
			case "left":
				if (cRect.left < 5) {
					debug("nofind scroll.");
					return this.scrollHalf(win, aDir);
				}
				[aX, aY, aT, aR, aB, aL] = [0, 0, 0, cRect.left - 1, inHeight, 0];
				[_top, _right, _bottom, _left, _width, _height, _centerX, _centerY] = 
					["left", "top", "right", "bottom", "height", "width", "centerY", "centerX"];
				break;
		}

//		debug(["top:" + cRect[_top], "right:" + cRect[_right], "bottom:" + cRect[_bottom], "left:" + cRect[_left],
//			"width:" + cRect[_width], "height:" + cRect[_height], "centerX:" + cRect[_centerX], "centerY:" + cRect[_centerY]].join('\n'));

		var nodelist = this.nodesFromRect(win, aX, aY, aT, aR, aB, aL);
		var data = [];
		var withCurrent = distance.bind(this, cRect[_centerX], cRect[_top]);
		nodelist.forEach(function(node){
			if (node === currentNode) return;
			var flag = node instanceof HTMLElement && node.mozMatchesSelector(this.SELECTOR);
			if (!flag) return;
			// 対象が祖先or子孫なら抜ける
			if (currentNode.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_CONTAINS) return;
			if (currentNode.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_CONTAINS_BY) return;

			var rect = getRect(node);
			if (rect.width <= 1 || rect.height <= 1) return;
			// 対象がほぼ真横なら探さない。 頭痛いよぉ...
			if (isPrev  && rect[_centerY] - rect[_height] / 4 > cRect[_centerY]) return;
			if (!isPrev && rect[_centerY] - rect[_height] / 4 < cRect[_centerY]) return;

			rect.element = node;
			var sa = Math.abs(cRect[_top] - rect[_bottom]);
			var ds = [];
			// ----   --   現在地の真上に対象がある場合
			//  --   ----  真上にリンクが複数並ぶとダブるで、中心との距離で差をつける
			if (rect[_left] >= cRect[_left] && rect[_right] <= cRect[_right] || 
			    rect[_left] <= cRect[_left] && rect[_right] >= cRect[_right])
			{
				ds.push(sa + withCurrent(rect[_centerX], rect[_bottom]) / 100);
			}
			//   ----  ----   現在地の真上に対象の左端か右端があるとき
			// ----      ---- 
			else if (isPrev && rect[_left]  > cRect[_left]  && rect[_left]  < cRect[_right] || 
			        !isPrev && rect[_right] > cRect[_right] && rect[_right] < cRect[_left]  || 
			         isPrev && rect[_right] > cRect[_left]  && rect[_right] < cRect[_right] || 
			        !isPrev && rect[_left]  > cRect[_right] && rect[_left]  < cRect[_left])
			{
				ds.push(sa + withCurrent(rect[_centerX], rect[_bottom]) / 100);
			}
			if (ds.length) {
				rect.distance = ds[0]; //Math.min.apply(null, ds);
				data.push(rect);
				return;
			}

			// 現在地から斜め45°開いた場所に対象がある場合
			// 左下が範囲内の場合
			if (rect[_left] > cRect[_left] - sa && rect[_left] < cRect[_right] + sa) {
				ds.push( withCurrent(rect[_left], rect[_bottom]) );
			}
			// 右下
			if (rect[_right] > cRect[_left] - sa && rect[_right] < cRect[_right] + sa) {
				ds.push( withCurrent(rect[_right], rect[_bottom]) );
			}
			sa = Math.abs(cRect[_top] - rect[_top]);
			// 左上
			if (rect[_left] > cRect[_left] - sa && rect[_left] < cRect[_right] + sa) {
				ds.push( withCurrent(rect[_left], rect[_top]) );
			}
			// 右上
			if (rect[_right] > cRect[_left] - sa && rect[_right] < cRect[_right] + sa) {
				ds.push( withCurrent(rect[_right], rect[_top]) );
			}

			if (ds.length) {
				rect.distance = Math.min.apply(null, ds) * 1.1; // 補正
				data.push(rect);
			}

		}, this);

		// 対象が見つからないので半画面スクロールして終了
		if (!data.length) {
			this.scrollHalf(win, aDir);
			return
		}

		// 一番近い要素を探す
		var nRect = null;
		data.forEach(function(rect){
			if (!nRect || nRect.distance > rect.distance) {
				nRect = rect;
			}
		}, this);
		if (nRect) {
			this.focus(nRect.element, win);
		}
	},
	focus: function(elem, aWin) {
		var win = aWin || elem.ownerDocument.defaultView;
		var sel = win.getSelection();
		var img;
		if (elem instanceof HTMLImageElement) {
			img = elem;
			elem = getAncestorLink(elem) || elem;
		} else if (elem instanceof HTMLAnchorElement) {
			img = elem.getElementsByTagName('img')[0];
		}
		sel.selectAllChildren(elem);

		try {
			// 画面外なら真ん中にする
			sel.QueryInterface(Ci.nsISelectionPrivate)
				.scrollIntoView(Ci.nsISelectionController.SELECTION_ANCHOR_REGION, true, 50, 50);
		} catch (e) {}
		elem.focus();
		// 強調の代わりに選択する
		sel.selectAllChildren(elem);

		if (img) {
			// 画像の選択状態は見栄えが悪いので選択解除
			this.timeout(function() {
				sel.collapseToStart();
			}, 300, win);
		}
	},
	scrollHalf: function(aWin, aDir) {
		// スムーススクロールを利用する為に nsIDOMWindowUtils を利用する
		// https://developer.mozilla.org/ja/docs/XPCOM_Interface_Reference/nsIDOMWindowUtils#sendWheelEvent%28%29
		var aDeltaX = 0, aDeltaY = 0;
		switch(aDir) {
			case "up"   : aDeltaY = -0.5; break;
			case "right": aDeltaX = +0.5; break;
			case "down" : aDeltaY = +0.5; break;
			case "left" : aDeltaX = -0.5; break;
			default: return;
		}
		aWin.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils)
			.sendWheelEvent(0, 0, aDeltaX, aDeltaY, 0, Ci.nsIDOMWheelEvent.DOM_DELTA_PAGE, 0, 0, 0, 0);
	},
	nodesFromRect: function(win, aX, aY, aTop, aRight, aBottom, aLeft) {
		// https://developer.mozilla.org/ja/docs/XPCOM_Interface_Reference/nsIDOMWindowUtils#nodesFromRect%28%29
		var nodelist = win.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils)
			.nodesFromRect(aX, aY, aTop, aRight, aBottom, aLeft, true, false);
		return $A(nodelist);
	},
	createStartRect: function(aWin, aDir) {
		var rect = { top: 0, right: 0, bottom: 0, left: 0 };
		switch(aDir) {
			case "up":
				rect.top    = aWin.innerHeight;
				rect.right  = aWin.innerWidth;
				rect.bottom = aWin.innerHeight;
				break;
			case "right":
				rect.bottom = aWin.innerHeight;
				break;
			case "down":
				rect.right = aWin.innerWidth;
				break;
			case "left":
				rect.right  = aWin.innerWidth;
				rect.bottom = aWin.innerHeight;
				rect.left   = aWin.innerWidth;
				break;
		}
		rect.width = rect.right - rect.left;
		rect.height = rect.bottom - rect.top;
		return parseRect(rect);
	},
	parseRect: parseRect,
	getRect: getRect,
	getFirstLineRect: getFirstLineRect,
	distance: distance,
	getAncestorLink: getAncestorLink,
};

window.gCrossFireModoki.init();


function distance(x1, y1, x2, y2) {
	return Math.sqrt( Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2) );
}

function getRect(elem) {
	var rect = parseRect(elem.getBoundingClientRect());
	if (elem instanceof HTMLAnchorElement && elem.href) {
		let images = elem.getElementsByTagName("img");
		if (images.length) {
			$A(images).forEach(function(img){
				let r = img.getBoundingClientRect();
				if (rect.top    > r.top)    rect.top    = r.top;
				if (rect.right  < r.right)  rect.right  = r.right;
				if (rect.bottom < r.bottom) rect.bottom = r.bottom;
				if (rect.left   > r.left)   rect.left   = r.left;
				rect.width  = rect.right  - rect.left;
				rect.height = rect.bottom - rect.top;
			}, this);
		}
	}
	return parseRect(rect);
}
function getFirstLineRect(elem, isLast) {
	if (elem instanceof HTMLAnchorElement && elem.href) {
		let img = elem.getElementsByTagName("img")[0];
		if (img)
			return getRect(elem);
	}

	var rects = $A(elem.getClientRects());
	if (!isLast)
		rects.reverse();
	for (var i = 0, len = rects.length; i < len; ++i) {
		if (rects[i].width < 1 || rects[i].height < 1)
			continue;
		return parseRect(rects[i]);
	};
	return null;
}
function parseRect(aRect) {
	return {
		top    : aRect.top,
		right  : aRect.right,
		bottom : aRect.bottom,
		left   : aRect.left,
		width  : aRect.width,
		height : aRect.height,
		centerX: aRect.left + (aRect.width / 2),
		centerY: aRect.top + (aRect.height / 2),
	};
}

function getAncestorLink(elem) {
	while(elem = elem.parentNode) {
		if (elem instanceof HTMLAnchorElement && elem.href ||
		    elem instanceof HTMLAreaElement && elem.href || 
		    elem instanceof HTMLLinkElement && elem.href)
		{
			return elem;
		}
	}
	return null;
}

function $(id) { return document.getElementById(id); }
function $$(exp, doc) { return Array.prototype.slice.call((doc || document).querySelectorAll(exp)); }
// http://gist.github.com/321205
function $A(args) { return Array.prototype.slice.call(args); }
function log() { Application.console.log($A(arguments).join(', ')); }
function debug() { if (gCrossFireModoki.DEBUG) log($A(arguments).join(', ')) }

})();
