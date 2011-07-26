// ==UserScript==
// @name           OperaStyle_linkDragSelection.uc.js
// @author         Griever
// @include        main
// @include        chrome://global/content/viewSource.xul
// @include        chrome://global/content/viewPartialSource.xul
// @version        0.0.4
// @note           複数選択時の手抜きを修正
// @note           リンクの mousedown イベントが起きない問題を修正
// @note           その他微修正
// ==/UserScript==

window.linkDragSelection = function(event){
	if (event.button != 0 || event.shiftKey || event.altKey)
		return;

	var node = event.explicitOriginalTarget;
	if (node.nodeType != node.TEXT_NODE)
		return;
	
	var link = event.target
	do {
		if (link instanceof HTMLAnchorElement)
			 break;
	} while (link = link.parentNode);
	if (!link)
		return;

	var current = event.currentTarget;
	var win = node.ownerDocument.defaultView;
	var inSelection = inRange(event.rangeParent, event.rangeOffset);
	var linkStyle = link.style.cssText;

	var CANCELDRAG_TIME = 500;
	var sleep = true;
	var timer = null;
	var hoken = setTimeout(clearTimer, 8000);// んー、保険？

	if (CANCELDRAG_TIME)
		timer = setTimeout(function() {
			var statusTextField = document.getElementById("statusbar-display")
			if (statusTextField)
				statusTextField.label = "";
			link.style.cursor = 'crosshair';
			timer = null;
		}, CANCELDRAG_TIME);

	//event.stopPropagation();
	current.addEventListener('mousemove', mousemove, true);
	current.addEventListener('mouseup', mouseup, true);

	// mousedown の処理を終わらせない
	var thread = Cc['@mozilla.org/thread-manager;1'].getService().mainThread;
	while (sleep)
		thread.processNextEvent(true);


	function mousemove(e) {
		current.removeEventListener('mousemove', mousemove, true);
		clearTimer();
		if (Math.abs(e.screenX - event.screenX) > Math.abs(e.screenY - event.screenY) && 
		    e.timeStamp - event.timeStamp > CANCELDRAG_TIME) {
			draggable(false);
		} else {
			current.removeEventListener('mouseup', mouseup, true);
			draggable(true);
		}
	}

	function mouseup(e) {
		current.removeEventListener('mouseup', mouseup, true);
		current.removeEventListener('mousemove', mousemove, true);
		clearTimer();
		draggable(true);

		// mousedown/up が同じノード &&
		// mousedown が選択範囲外 &&
		// mouseup が選択範囲内 ならクリックを無効化
		if (e.button == 0 &&
		    node == e.explicitOriginalTarget && 
		    !inSelection && 
		    inRange(e.rangeParent, e.rangeOffset))
			current.addEventListener('click', click, true);
	}

	function click(e) {
		current.removeEventListener('click', click, true);
		e.preventDefault();
		e.stopPropagation();
	}

	function draggable(bool){
		if (!link)
			return;
		if (bool) {
			link.removeAttribute('draggable');
			if (linkStyle)
				link.style.cssText = linkStyle;
			else 
				link.removeAttribute('style');
		} else {
			link.setAttribute('draggable', false);
			link.style.cursor = 'text';
		}
	}

	function clearTimer() {
		sleep = false;
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		if (hoken) {
			clearTimeout(hoken);
			hoken = null;
		}
	}
	
	function inRange(rParent, rOffset) {
		var sel = win.getSelection();
		if (sel.isCollapsed)
			return false;
		for (var i = 0, l = sel.rangeCount; i < l; i++ ){
			var range = sel.getRangeAt(i);
			if (range.comparePoint(rParent, rOffset) === 0)
				return true;
		}
		return false;
	}
};


(gBrowser && gBrowser.mPanelContainer? gBrowser.mPanelContainer : document)
	.addEventListener('mousedown', function(e){ window.linkDragSelection(e) }, false);
