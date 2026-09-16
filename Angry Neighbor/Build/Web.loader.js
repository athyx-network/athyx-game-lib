function createUnityInstance(r, n, l) {
  function s(e, r) {
    if (!s.aborted && n.showBanner) {
      if (r == "error") {
        s.aborted = true;
      }
      return n.showBanner(e, r);
    }
    switch (r) {
      case "error":
        console.error(e);
        break;
      case "warning":
        console.warn(e);
        break;
      default:
        console.log(e);
    }
  }
  function t(e) {
    var r = e.reason || e.error;
    var n = r ? r.toString() : e.message || e.reason || "";
    var t = r && r.stack ? r.stack.toString() : "";
    if ((n += "\n" + (t = t.startsWith(n) ? t.substring(n.length) : t).trim()) && c.stackTraceRegExp && c.stackTraceRegExp.test(n)) {
      h(n, e.filename || r && (r.fileName || r.sourceURL) || "", e.lineno || r && (r.lineNumber || r.line) || 0);
    }
  }
  function e(e, r, n) {
    var t = e[r];
    if (t === undefined || !t) {
      console.warn("Config option \"" + r + "\" is missing or empty. Falling back to default value: \"" + n + "\". Consider updating your WebGL template to include the missing config option.");
      e[r] = n;
    }
  }
  l = l || function () {};
  var o;
  var c = {
    canvas: r,
    webglContextAttributes: {
      preserveDrawingBuffer: false,
      powerPreference: 2
    },
    streamingAssetsUrl: "StreamingAssets",
    downloadProgress: {},
    deinitializers: [],
    intervals: {},
    setInterval: function (e, r) {
      e = window.setInterval(e, r);
      this.intervals[e] = true;
      return e;
    },
    clearInterval: function (e) {
      delete this.intervals[e];
      window.clearInterval(e);
    },
    preRun: [],
    postRun: [],
    print: function (e) {
      console.log(e);
    },
    printErr: function (e) {
      console.error(e);
      if (typeof e == "string" && e.indexOf("wasm streaming compile failed") != -1) {
        if (e.toLowerCase().indexOf("mime") != -1) {
          s("HTTP Response Header \"Content-Type\" configured incorrectly on the server for file " + c.codeUrl + " , should be \"application/wasm\". Startup time performance will suffer.", "warning");
        } else {
          s("WebAssembly streaming compilation failed! This can happen for example if \"Content-Encoding\" HTTP header is incorrectly enabled on the server for file " + c.codeUrl + ", but the file is not pre-compressed on disk (or vice versa). Check the Network tab in browser Devtools to debug server header configuration.", "warning");
        }
      }
    },
    locateFile: function (e) {
      if (e == "build.wasm") {
        return this.codeUrl;
      } else {
        return e;
      }
    },
    disabledCanvasEvents: ["contextmenu", "dragstart"]
  };
  e(n, "companyName", "Unity");
  e(n, "productName", "WebGL Player");
  e(n, "productVersion", "1.0");
  for (o in n) {
    c[o] = n[o];
  }
  c.streamingAssetsUrl = new URL(c.streamingAssetsUrl, document.URL).href;
  var a = c.disabledCanvasEvents.slice();
  function i(e) {
    e.preventDefault();
  }
  a.forEach(function (e) {
    r.addEventListener(e, i);
  });
  window.addEventListener("error", t);
  window.addEventListener("unhandledrejection", t);
  c.deinitializers.push(function () {
    c.disableAccessToMediaDevices();
    a.forEach(function (e) {
      r.removeEventListener(e, i);
    });
    window.removeEventListener("error", t);
    window.removeEventListener("unhandledrejection", t);
    for (var e in c.intervals) {
      window.clearInterval(e);
    }
    c.intervals = {};
  });
  c.QuitCleanup = function () {
    for (var e = 0; e < c.deinitializers.length; e++) {
      c.deinitializers[e]();
    }
    c.deinitializers = [];
    if (typeof c.onQuit == "function") {
      c.onQuit();
    }
  };
  var d = "";
  var u = "";
  document.addEventListener("webkitfullscreenchange", function (e) {
    if (document.webkitCurrentFullScreenElement === r) {
      if (r.style.width) {
        d = r.style.width;
        u = r.style.height;
        r.style.width = "100%";
        r.style.height = "100%";
      }
    } else if (d) {
      r.style.width = d;
      r.style.height = u;
      u = d = "";
    }
  });
  var f = {
    Module: c,
    SetFullscreen: function () {
      if (c.SetFullscreen) {
        return c.SetFullscreen.apply(c, arguments);
      }
      c.print("Failed to set Fullscreen mode: Player not loaded yet.");
    },
    SendMessage: function () {
      if (c.SendMessage) {
        return c.SendMessage.apply(c, arguments);
      }
      c.print("Failed to execute SendMessage: Player not loaded yet.");
    },
    Quit: function () {
      return new Promise(function (e, r) {
        c.shouldQuit = true;
        c.onQuit = e;
      });
    }
  };
  function h(e, r, n) {
    if (e.indexOf("fullscreen error") == -1) {
      if (c.startupErrorHandler) {
        c.startupErrorHandler(e, r, n);
      } else if (!c.errorHandler || !c.errorHandler(e, r, n)) {
        console.log("Invoking error handler due to\n" + e);
        if (typeof dump == "function") {
          dump("Invoking error handler due to\n" + e);
        }
        if (!h.didShowErrorMessage) {
          if ((e = "An error occurred running the Unity content on this page. See your browser JavaScript console for more info. The error was:\n" + e).indexOf("DISABLE_EXCEPTION_CATCHING") != -1) {
            e = "An exception has occurred, but exception handling has been disabled in this build. If you are the developer of this content, enable exceptions in your project WebGL player settings to be able to catch the exception or see the stack trace.";
          } else if (e.indexOf("Cannot enlarge memory arrays") != -1) {
            e = "Out of memory. If you are the developer of this content, try allocating more memory to your WebGL build in the WebGL player settings.";
          } else if (e.indexOf("Invalid array buffer length") != -1 || e.indexOf("Invalid typed array length") != -1 || e.indexOf("out of memory") != -1 || e.indexOf("could not allocate memory") != -1) {
            e = "The browser could not allocate enough memory for the WebGL content. If you are the developer of this content, try allocating less memory to your WebGL build in the WebGL player settings.";
          }
          alert(e);
          h.didShowErrorMessage = true;
        }
      }
    }
  }
  function g(e, r) {
    if (e != "symbolsUrl") {
      var n = c.downloadProgress[e];
      n = n || (c.downloadProgress[e] = {
        started: false,
        finished: false,
        lengthComputable: false,
        total: 0,
        loaded: 0
      });
      if (typeof r == "object" && (r.type == "progress" || r.type == "load")) {
        if (!n.started) {
          n.started = true;
          n.lengthComputable = r.lengthComputable;
        }
        n.total = r.total;
        n.loaded = r.loaded;
        if (r.type == "load") {
          n.finished = true;
        }
      }
      var t = 0;
      var o = 0;
      var a = 0;
      var i = 0;
      var s = 0;
      for (e in c.downloadProgress) {
        if (!(n = c.downloadProgress[e]).started) {
          return;
        }
        a++;
        if (n.lengthComputable) {
          t += n.loaded;
          o += n.total;
          i++;
        } else if (!n.finished) {
          s++;
        }
      }
      l((a ? (a - s - (o ? i * (o - t) / o : 0)) / a : 0) * 0.9);
    }
  }
  function p() {
    new Promise(function (a, e) {
      var i = document.createElement("script");
      i.src = c.frameworkUrl;
      i.onload = function () {
        if (typeof unityFramework == "undefined" || !unityFramework) {
          var e;
          var r = [["br", "br"], ["gz", "gzip"]];
          for (e in r) {
            var n;
            var t = r[e];
            if (c.frameworkUrl.endsWith("." + t[0])) {
              n = "Unable to parse " + c.frameworkUrl + "!";
              if (location.protocol == "file:") {
                s(n + " Loading pre-compressed (brotli or gzip) content via a file:// URL without a web server is not supported by this browser. Please use a local development web server to host compressed Unity content, or use the Unity Build and Run option.", "error");
                return;
              } else {
                n += " This can happen if build compression was enabled but web server hosting the content was misconfigured to not serve the file with HTTP Response Header \"Content-Encoding: " + t[1] + "\" present. Check browser Console and Devtools Network tab to debug.";
                if (t[0] == "br" && location.protocol == "http:") {
                  t = ["localhost", "127.0.0.1"].indexOf(location.hostname) != -1 ? "" : "Migrate your server to use HTTPS.";
                  n = /Firefox/.test(navigator.userAgent) ? "Unable to parse " + c.frameworkUrl + "!<br>If using custom web server, verify that web server is sending .br files with HTTP Response Header \"Content-Encoding: br\". Brotli compression may not be supported in Firefox over HTTP connections. " + t + " See <a href=\"https://bugzilla.mozilla.org/show_bug.cgi?id=1670675\">https://bugzilla.mozilla.org/show_bug.cgi?id=1670675</a> for more information." : "Unable to parse " + c.frameworkUrl + "!<br>If using custom web server, verify that web server is sending .br files with HTTP Response Header \"Content-Encoding: br\". Brotli compression may not be supported over HTTP connections. Migrate your server to use HTTPS.";
                }
                s(n, "error");
                return;
              }
            }
          }
          s("Unable to parse " + c.frameworkUrl + "! The file is corrupt, or compression was misconfigured? (check Content-Encoding HTTP Response Header on web server)", "error");
        }
        var o = unityFramework;
        unityFramework = null;
        i.onload = null;
        a(o);
      };
      i.onerror = function (e) {
        s("Unable to load file " + c.frameworkUrl + "! Check that the file exists on the remote server. (also check browser Console and Devtools Network tab to debug)", "error");
      };
      document.body.appendChild(i);
      c.deinitializers.push(function () {
        document.body.removeChild(i);
      });
    }).then(function (e) {
      e(c);
    });
    g(n = "dataUrl");
    e = c.fetchWithProgress;
    r = c[n];
    r = /file:\/\//.exec(r) ? "same-origin" : undefined;
    var n;
    var e;
    var r;
    var t = e(c[n], {
      method: "GET",
      companyName: c.companyName,
      productName: c.productName,
      control: "no-store",
      mode: r,
      onProgress: function (e) {
        g(n, e);
      }
    }).then(function (e) {
      return e.parsedBody;
    }).catch(function (e) {
      var r = "Failed to download file " + c[n];
      if (location.protocol == "file:") {
        s(r + ". Loading web pages via a file:// URL without a web server is not supported by this browser. Please use a local development web server to host Unity content, or use the Unity Build and Run option.", "error");
      } else {
        console.error(r);
      }
    });
    c.preRun.push(function () {
      c.addRunDependency("dataUrl");
      t.then(function (e) {
        var r = new DataView(e.buffer, e.byteOffset, e.byteLength);
        var n = 0;
        var t = "UnityWebData1.0\0";
        if (!String.fromCharCode.apply(null, e.subarray(n, n + t.length)) == t) {
          throw "unknown data format";
        }
        var o = r.getUint32(n += t.length, true);
        for (n += 4; n < o;) {
          var a = r.getUint32(n, true);
          n += 4;
          var i = r.getUint32(n, true);
          n += 4;
          var s = r.getUint32(n, true);
          n += 4;
          var l = String.fromCharCode.apply(null, e.subarray(n, n + s));
          n += s;
          for (var d = 0, u = l.indexOf("/", d) + 1; u > 0; d = u, u = l.indexOf("/", d) + 1) {
            c.FS_createPath(l.substring(0, d), l.substring(d, u - 1), true, true);
          }
          c.FS_createDataFile(l, null, e.subarray(a, a + i), true, true, true);
        }
        c.removeRunDependency("dataUrl");
      });
    });
  }
  c.SystemInfo = function () {
    var e;
    var r;
    var n;
    var t;
    var o = navigator.userAgent + " ";
    var a = [["Firefox", "Firefox"], ["OPR", "Opera"], ["Edg", "Edge"], ["SamsungBrowser", "Samsung Browser"], ["Trident", "Internet Explorer"], ["MSIE", "Internet Explorer"], ["Chrome", "Chrome"], ["CriOS", "Chrome on iOS Safari"], ["FxiOS", "Firefox on iOS Safari"], ["Safari", "Safari"]];
    function i(e, r, n) {
      return (e = RegExp(e, "i").exec(r)) && e[n];
    }
    for (var s = 0; s < a.length; ++s) {
      if (r = i(a[s][0] + "[/ ](.*?)[ \\)]", o, 1)) {
        e = a[s][1];
        break;
      }
    }
    if (e == "Safari") {
      r = i("Version/(.*?) ", o, 1);
    }
    if (e == "Internet Explorer") {
      r = i("rv:(.*?)\\)? ", o, 1) || r;
    }
    for (var l = [["Windows (.*?)[;)]", "Windows"], ["Android ([0-9_.]+)", "Android"], ["iPhone OS ([0-9_.]+)", "iPhoneOS"], ["iPad.*? OS ([0-9_.]+)", "iPadOS"], ["FreeBSD( )", "FreeBSD"], ["OpenBSD( )", "OpenBSD"], ["Linux|X11()", "Linux"], ["Mac OS X ([0-9_\\.]+)", "MacOS"], ["bot|google|baidu|bing|msn|teoma|slurp|yandex", "Search Bot"]], d = 0; d < l.length; ++d) {
      if (c = i(l[d][0], o, 1)) {
        n = l[d][1];
        c = c.replace(/_/g, ".");
        break;
      }
    }
    var u;
    var c = {
      "NT 5.0": "2000",
      "NT 5.1": "XP",
      "NT 5.2": "Server 2003",
      "NT 6.0": "Vista",
      "NT 6.1": "7",
      "NT 6.2": "8",
      "NT 6.3": "8.1",
      "NT 10.0": "10"
    }[c] || c;
    if (f = document.createElement("canvas")) {
      u = (h = f.getContext("webgl2")) ? 2 : 0;
      if (!h) {
        if (h = f && f.getContext("webgl")) {
          u = 1;
        }
      }
      if (h) {
        t = h.getExtension("WEBGL_debug_renderer_info") && h.getParameter(37446) || h.getParameter(7937);
      }
    }
    var f = typeof SharedArrayBuffer != "undefined";
    var h = typeof WebAssembly == "object" && typeof WebAssembly.compile == "function";
    return {
      width: screen.width,
      height: screen.height,
      userAgent: o.trim(),
      browser: e || "Unknown browser",
      browserVersion: r || "Unknown version",
      mobile: /Mobile|Android|iP(ad|hone)/.test(navigator.appVersion),
      os: n || "Unknown OS",
      osVersion: c || "Unknown OS Version",
      gpu: t || "Unknown GPU",
      language: navigator.userLanguage || navigator.language,
      hasWebGL: u,
      hasCursorLock: !!document.body.requestPointerLock,
      hasFullscreen: !!document.body.requestFullscreen || !!document.body.webkitRequestFullscreen,
      hasThreads: f,
      hasWasm: h,
      hasWasmThreads: false
    };
  }();
  c.abortHandler = function (e) {
    h(e, "", 0);
    return true;
  };
  Error.stackTraceLimit = Math.max(Error.stackTraceLimit || 0, 50);
  c.readBodyWithProgress = function (a, i, s) {
    var e = a.body ? a.body.getReader() : undefined;
    var l = a.headers.get("Content-Length") !== undefined;
    var d = function (e, r) {
      if (!r) {
        return 0;
      }
      var r = e.headers.get("Content-Encoding");
      var n = parseInt(e.headers.get("Content-Length"));
      switch (r) {
        case "br":
          return Math.round(n * 5);
        case "gzip":
          return Math.round(n * 4);
        default:
          return n;
      }
    }(a, l);
    var u = new Uint8Array(d);
    var c = [];
    var f = 0;
    var h = 0;
    if (!l) {
      console.warn("[UnityCache] Response is served without Content-Length header. Please reconfigure server to include valid Content-Length for better download performance.");
    }
    return function o() {
      if (e === undefined) {
        return a.arrayBuffer().then(function (e) {
          var r = new Uint8Array(e);
          i({
            type: "progress",
            response: a,
            total: e.length,
            loaded: 0,
            lengthComputable: l,
            chunk: s ? r : null
          });
          return r;
        });
      } else {
        return e.read().then(function (e) {
          if (e.done) {
            if (f === d) {
              return u;
            }
            if (f < d) {
              return u.slice(0, f);
            }
            var r = new Uint8Array(f);
            r.set(u, 0);
            var n = h;
            for (var t = 0; t < c.length; ++t) {
              r.set(c[t], n);
              n += c[t].length;
            }
            return r;
          }
          if (f + e.value.length <= u.length) {
            u.set(e.value, f);
            h = f + e.value.length;
          } else {
            c.push(e.value);
          }
          f += e.value.length;
          i({
            type: "progress",
            response: a,
            total: Math.max(d, f),
            loaded: f,
            lengthComputable: l,
            chunk: s ? e.value : null
          });
          return o();
        });
      }
    }().then(function (e) {
      i({
        type: "load",
        response: a,
        total: e.length,
        loaded: e.length,
        lengthComputable: l,
        chunk: null
      });
      a.parsedBody = e;
      return a;
    });
  };
  c.fetchWithProgress = function (e, r) {
    var n = function () {};
    if (r && r.onProgress) {
      n = r.onProgress;
    }
    return fetch(e, r).then(function (e) {
      return c.readBodyWithProgress(e, n, r.enableStreamingDownload);
    });
  };
  return new Promise(function (e, r) {
    if (c.SystemInfo.hasWebGL) {
      if (c.SystemInfo.hasWasm) {
        if (c.SystemInfo.hasWebGL == 1) {
          c.print("Warning: Your browser does not support \"WebGL 2\" Graphics API, switching to \"WebGL 1\"");
        }
        c.startupErrorHandler = r;
        l(0);
        c.postRun.push(function () {
          l(1);
          delete c.startupErrorHandler;
          e(f);
        });
        p();
      } else {
        r("Your browser does not support WebAssembly.");
      }
    } else {
      r("Your browser does not support WebGL.");
    }
  });
}