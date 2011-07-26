// ==UserScript==
// @name           FindAfterScroller.uc.js
// @namespace      http://d.hatena.ne.jp/Griever
// @description    ページ内検索をで適度にスクロールする
// @compatibility  Firefox 3.6, 4.0b6
// @include        main
// @note           検索結果を 3.6 では真ん中に、4.0 では画面端にならないようにスクロールする
// ==/UserScript==

gFindBar._findAgain_org = gFindBar._findAgain;
gFindBar._find_org = gFindBar._find;

if ('getBoundingClientRect' in document.createRange()) {
	// Fx 4.0
	let replaced = <![CDATA[

if (gFindBar._currentWindow) {
	var controller = gFindBar._getSelectionController(gFindBar._currentWindow);
	var selection = controller.getSelection(controller.SELECTION_NORMAL);
	var margin = gFindBar._currentWindow.innerHeight / 10 * 3;
	try {
		var rect = selection.getRangeAt(0).getBoundingClientRect();
		if (rect.top < margin) {
			selection.QueryInterface(Components.interfaces.nsISelection2)
			         .scrollIntoView(Components.interfaces.nsISelectionController.SELECTION_ANCHOR_REGION,
			                         true, 30, 50);
		}
		else if (rect.bottom > gFindBar._currentWindow.innerHeight - margin) {
			selection.QueryInterface(Components.interfaces.nsISelection2)
			         .scrollIntoView(Components.interfaces.nsISelectionController.SELECTION_ANCHOR_REGION,
			                         true, 70, 50);
		}
	} catch (e) {  }
}
return res;

	]]>.toString();

	eval("gFindBar._findAgain = " + gFindBar._findAgain_org.toString().replace('return res;', replaced));
	eval("gFindBar._find = " + gFindBar._find_org.toString().replace('return res;', replaced));

} else {
// Fx 3.6
	let replaced = <![CDATA[

if (gFindBar._currentWindow && (res === 0 || res === 2)) {
	var controller = gFindBar._getSelectionController(gFindBar._currentWindow);
	var selection = controller.getSelection(controller.SELECTION_NORMAL);
	selection.QueryInterface(Ci.nsISelection2)
	         .scrollIntoView(controller.SELECTION_ANCHOR_REGION, true, 50, 50);
}
return res;

	]]>.toString();

	eval("gFindBar._findAgain = " + gFindBar._findAgain_org.toString().replace('return res;', replaced));
	eval("gFindBar._find = " + gFindBar._find_org.toString().replace('return res;', replaced));

}
