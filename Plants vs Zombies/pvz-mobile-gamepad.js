/**
 * Mobile: soft keyboard bridge. Gamepad → keyboard (RAF). No on-screen stick / face buttons.
 */
(function () {
	"use strict";

	const canvas = document.getElementById("canvas");
	if (!canvas) return;

	const isMobileDevice =
		(typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches) ||
		/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "") ||
		navigator.maxTouchPoints > 1;

	const heldVirtualKeys = new Set();
	const legacyKeyCodes = {
		ArrowLeft: 37,
		ArrowUp: 38,
		ArrowRight: 39,
		ArrowDown: 40,
		Space: 32,
		Enter: 13,
		KeyX: 88,
		KeyC: 67,
		Backspace: 8,
	};

	function dispatchKeyboardEvent(evtFactory) {
		const targets = [document, window, canvas];
		const active = document.activeElement;
		if (active && targets.indexOf(active) === -1) targets.push(active);
		for (const t of targets) t.dispatchEvent(evtFactory());
	}

	function emitKey(code, isDown, key) {
		const resolvedKey =
			key !== undefined && key !== null
				? key
				: code.indexOf("Arrow") === 0
					? code
					: code.replace(/^Key/, "").toLowerCase();
		const type = isDown ? "keydown" : "keyup";
		const keyCode = legacyKeyCodes[code] || 0;
		const makeEvt = function () {
			const evt = new KeyboardEvent(type, {
				code: code,
				key: resolvedKey,
				bubbles: true,
				cancelable: true,
			});
			try {
				Object.defineProperty(evt, "keyCode", { get: function () { return keyCode; } });
			} catch (e1) {}
			try {
				Object.defineProperty(evt, "which", { get: function () { return keyCode; } });
			} catch (e2) {}
			return evt;
		};
		dispatchKeyboardEvent(makeEvt);
	}

	function emitKeyPress(ch, code) {
		const keyCode = ch && ch.length ? ch.charCodeAt(0) : legacyKeyCodes[code] || 0;
		const makeEvt = function () {
			const evt = new KeyboardEvent("keypress", {
				code: code || "",
				key: ch || "",
				bubbles: true,
				cancelable: true,
			});
			try {
				Object.defineProperty(evt, "keyCode", { get: function () { return keyCode; } });
			} catch (e1) {}
			try {
				Object.defineProperty(evt, "which", { get: function () { return keyCode; } });
			} catch (e2) {}
			try {
				Object.defineProperty(evt, "charCode", { get: function () { return keyCode; } });
			} catch (e3) {}
			return evt;
		};
		dispatchKeyboardEvent(makeEvt);
	}

	function emitChar(ch) {
		const upper = ch.toUpperCase();
		let code = "";
		if (/^[A-Z]$/.test(upper)) code = "Key" + upper;
		else if (/^[0-9]$/.test(ch)) code = "Digit" + ch;
		if (!code) {
			// Fallback for non-latin/IME input: still forward key text.
			emitKey("Unidentified", true, ch);
			emitKeyPress(ch, "Unidentified");
			emitKey("Unidentified", false, ch);
			return;
		}
		emitKey(code, true, ch);
		emitKeyPress(ch, code);
		emitKey(code, false, ch);
	}

	function setVirtualKey(code, isDown, key) {
		if (isDown) {
			if (heldVirtualKeys.has(code)) return;
			heldVirtualKeys.add(code);
			emitKey(code, true, key);
			return;
		}
		if (!heldVirtualKeys.has(code)) return;
		heldVirtualKeys.delete(code);
		emitKey(code, false, key);
	}

	let mobileUiInstalled = false;

	function focusSoftKeyboard() {
		const ta = document.getElementById("pvz-soft-keyboard");
		if (ta) {
			ta.style.pointerEvents = "auto";
			ta.focus();
			try {
				if (navigator.virtualKeyboard && navigator.virtualKeyboard.show) navigator.virtualKeyboard.show();
			} catch (e) {}
		}
	}

	function installMobileControls() {
		if (mobileUiInstalled || !isMobileDevice) return;
		mobileUiInstalled = true;

		const style = document.createElement("style");
		style.textContent =
			"#pvz-mobile-root.pvz-mobile-controls{" +
			"position:fixed;inset:0;z-index:60;pointer-events:none;" +
			"user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;" +
			"}" +
			"#pvz-mobile-root .mobile-kbd{" +
			"position:absolute;left:calc(14px + env(safe-area-inset-left,0px));" +
			"top:calc(14px + env(safe-area-inset-top,0px));" +
			"width:38px;height:38px;border-radius:8px;" +
			"border:1px solid rgba(255,255,255,0.22);background:rgba(0,0,0,0.14);color:rgba(255,255,255,0.75);" +
			"font:700 17px/1 sans-serif;padding:0;line-height:38px;text-align:center;pointer-events:auto;" +
			"touch-action:none;" +
			"}" +
			"#pvz-mobile-root .mobile-kbd:active{transform:scale(0.96);}";
		document.head.appendChild(style);

		const root = document.createElement("div");
		root.id = "pvz-mobile-root";
		root.className = "pvz-mobile-controls";
		root.setAttribute("aria-hidden", "true");
		root.innerHTML =
			'<button type="button" class="mobile-kbd" id="pvz-m-kbd" aria-label="Open keyboard">\u2328</button>';

		document.body.appendChild(root);

		const kbdBtn = document.getElementById("pvz-m-kbd");
		const softTa = document.getElementById("pvz-soft-keyboard");
		if (!kbdBtn) return;

		kbdBtn.addEventListener(
			"touchstart",
			function (e) {
				focusSoftKeyboard();
				e.preventDefault();
			},
			{ passive: false }
		);
		kbdBtn.addEventListener("click", function () {
			focusSoftKeyboard();
		});

		function wireSoftInput(el) {
			if (!el) return;
			let skipNextInput = false;
			const emitText = function (text) {
				if (!text) return;
				for (const ch of text) emitChar(ch);
			};
			const handleInputType = function (inputType, data) {
				if (inputType === "insertText" && data) {
					emitText(data);
					return true;
				}
				if (inputType === "insertLineBreak") {
					emitKey("Enter", true, "Enter");
					emitKey("Enter", false, "Enter");
					return true;
				}
				if (inputType === "deleteContentBackward") {
					emitKey("Backspace", true, "Backspace");
					emitKey("Backspace", false, "Backspace");
					return true;
				}
				return false;
			};
			el.addEventListener("blur", function () {
				el.style.pointerEvents = "none";
			});
			el.addEventListener("beforeinput", function (e) {
				if (!e.inputType) return;
				skipNextInput = handleInputType(e.inputType, e.data);
			});
			el.addEventListener("compositionend", function (e) {
				// Some mobile IMEs commit text only via composition events.
				if (e && e.data) emitText(e.data);
			});
			el.addEventListener("input", function (e) {
				if (skipNextInput) {
					skipNextInput = false;
					el.value = "";
					return;
				}
				// Fallback path for browsers where beforeinput is partial/absent.
				if (!handleInputType(e && e.inputType, e && e.data) && el.value) {
					emitText(el.value);
				}
				el.value = "";
			});
		}

		wireSoftInput(softTa);
	}

	function installGamepadSupport() {
		const prev = {
			left: false,
			right: false,
			up: false,
			down: false,
			a: false,
			x: false,
		};

		function tickGamepad() {
			const pads = navigator.getGamepads ? navigator.getGamepads() : [];
			const gp = pads && Array.from(pads).find(Boolean);
			if (gp) {
				const axX = gp.axes[0] || 0;
				const axY = gp.axes[1] || 0;
				const dead = 0.25;
				const cur = {
					left: (gp.buttons[14] && gp.buttons[14].pressed) || axX < -dead,
					right: (gp.buttons[15] && gp.buttons[15].pressed) || axX > dead,
					up: (gp.buttons[12] && gp.buttons[12].pressed) || axY < -dead,
					down: (gp.buttons[13] && gp.buttons[13].pressed) || axY > dead,
					a: gp.buttons[0] && gp.buttons[0].pressed,
					x: gp.buttons[2] && gp.buttons[2].pressed,
				};
				if (cur.left !== prev.left) setVirtualKey("ArrowLeft", cur.left, "ArrowLeft");
				if (cur.right !== prev.right) setVirtualKey("ArrowRight", cur.right, "ArrowRight");
				if (cur.up !== prev.up) setVirtualKey("ArrowUp", cur.up, "ArrowUp");
				if (cur.down !== prev.down) setVirtualKey("ArrowDown", cur.down, "ArrowDown");
				if (cur.a !== prev.a) setVirtualKey("KeyC", cur.a, "c");
				if (cur.x !== prev.x) setVirtualKey("KeyX", cur.x, "x");
				Object.assign(prev, cur);
			}
			requestAnimationFrame(tickGamepad);
		}
		requestAnimationFrame(tickGamepad);
	}

	try {
		installGamepadSupport();
	} catch (e) {}

	function syncMobileVisibility() {
		const ingame = document.body.classList.contains("game-mode");
		const root = document.getElementById("pvz-mobile-root");
		if (ingame && isMobileDevice) {
			if (!mobileUiInstalled) installMobileControls();
			if (root) root.style.display = "";
		} else if (root) {
			root.style.display = "none";
		}
	}

	const mo = new MutationObserver(syncMobileVisibility);
	mo.observe(document.body, { attributes: true, attributeFilter: ["class"] });
	syncMobileVisibility();

	function onGameModeKeyNav(e) {
		if (!document.body.classList.contains("game-mode")) return;
		if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].indexOf(e.code) >= 0) {
			e.preventDefault();
		}
	}
	document.addEventListener("keydown", onGameModeKeyNav);

})();
