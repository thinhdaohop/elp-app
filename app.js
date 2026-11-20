/* App CLB Eleven Park – giai đoạn 1 (vote, check-in GPS, Sao đỏ, ví quỹ, hồ sơ) */
(function () {
  "use strict";
  var CFG = window.ELP_CONFIG || {};
  var S = { ten: store("elp_ten"), token: store("elp_token"), tab: store("elp_tab") || "tq", d: null, ds: null, team: "", tv: null, dash: null, sq: {}, sqM: 0, ts: null, quyTab: "vi", tranTab: "dd", kq: {}, kqMua: "", bxh: {}, bxhMua: "", kqMo: "" };
  if (["tq", "tran", "quy", "ts", "toi", "bcs"].indexOf(S.tab) === -1) S.tab = "tq";
  var $app = document.getElementById("app");

  // ---------- tiện ích ----------
  function store(k, v) {
    try { if (v === undefined) return localStorage.getItem(k) || ""; if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {}
    return "";
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function vnd(n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "đ"; }
  function viet(n) { var w = String(n || "").trim().split(/\s+/); return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : (w[0] || "?").slice(0, 2)).toUpperCase(); }
  function toast(msg, bad) {
    var t = document.getElementById("toast"); t.textContent = msg; t.className = "on" + (bad ? " bad" : "");
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.className = ""; }, 3200);
  }
  function api(name, data) {
    if (!CFG.API) return Promise.reject(new Error("App chưa được cấu hình đường dẫn API (config.js)."));
    var body = Object.assign({ api: name, ten: S.ten, token: S.token }, data || {});
    return fetch(CFG.API, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "text/plain;charset=utf-8" }, redirect: "follow" })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j.ok) {
          if (j.error === "PHIEN_HET_HAN") { dangXuat(); throw new Error("Phiên đăng nhập đã hết, đăng nhập lại nhé."); }
          throw new Error(j.error || "Có lỗi xảy ra");
        }
        return j.data;
      });
  }
  function busy(el, on) { if (el) { el.disabled = !!on; el.classList.toggle("loading", !!on); } }
  function run(btn, p, okMsg) {
    busy(btn, true);
    return p.then(function (x) { if (okMsg) toast(okMsg); return x; })
      .catch(function (e) { toast(e.message || String(e), true); throw e; })
      .finally(function () { busy(btn, false); });
  }
  function demNguoc(ms) {
    if (ms <= 0) return "đã qua";
    var p = Math.floor(ms / 60000), g = Math.floor(p / 60), n = Math.floor(g / 24);
    if (n >= 1) return n + " ngày " + (g % 24) + " giờ";
    if (g >= 1) return g + " giờ " + (p % 60) + " phút";
    return p + " phút";
  }
  var ICON = {
    tran: '<path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"/><path d="m12 7 3.5 2.5-1.3 4h-4.4l-1.3-4Z"/><path d="M12 3v4M20.5 9.5 15.5 9.5M17 19l-2.8-5.5M7 19l2.8-5.5M3.5 9.5h5"/>',
    vi: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',
    hoso: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    tq: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    ts: '<path d="M21 8 12 3 3 8v8l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    bcs: '<path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6Z"/><path d="m9 12 2 2 4-4"/>'
  };
  function svg(k) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + ICON[k] + "</svg>"; }

  // ---------- đăng nhập ----------
  function dangXuat() { store("elp_token", null); S.token = ""; S.d = null; }
  function moLogin() {
    $app.innerHTML = '<div class="login"><div class="brand" style="color:#C5A059">' + esc((CFG.TEN_DOI || "Eleven Park FC").toUpperCase()) +
      '</div><h1>Xin chào!</h1><div class="muted">Chọn tên của bạn để vào app</div>' +
      '<div class="field"><input type="search" id="q" placeholder="Tìm tên hoặc biệt danh…" autocomplete="off"></div><div class="names" id="names"><div class="spin" style="margin:30px auto"></div></div></div>';
    var q = document.getElementById("q");
    function ve() {
      var k = norm(q.value), box = document.getElementById("names");
      var ds = (S.ds || []).filter(function (x) { return !k || norm(x.ten + " " + x.nick).indexOf(k) !== -1; });
      box.innerHTML = ds.map(function (x, i) {
        return '<button class="name" data-i="' + S.ds.indexOf(x) + '"><span>' + esc(x.nick) + "<small>" + esc(x.ten) + "</small></span><span>" + (x.coPin ? "›" : '<span class="pill warn">Lần đầu</span>') + "</span></button>";
      }).join("") || '<div class="empty" style="color:#BFD8CC">Không thấy tên. Nhờ Thủ quỹ thêm vào danh sách.</div>';
    }
    q.oninput = ve;
    document.getElementById("names").onclick = function (e) { var b = e.target.closest(".name"); if (b) moPin(S.ds[+b.dataset.i]); };
    (S.ds ? Promise.resolve(S.ds) : api("danhSach")).then(function (ds) { S.ds = ds; ve(); })
      .catch(function (e) { document.getElementById("names").innerHTML = '<div class="err">' + esc(e.message) + "</div>"; });
  }
  function norm(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase(); }
  function moPin(x) {
    var moi = !x.coPin;
    $app.innerHTML = '<div class="login"><div class="brand" style="color:#C5A059">ĐĂNG NHẬP</div><h1>' + esc(x.nick) + '</h1><div class="muted">' + esc(x.ten) + "</div>" +
      '<div class="field" style="margin-top:22px"><label style="color:#BFD8CC">' + (moi ? "Tạo mã PIN 4 số (dùng cho các lần sau)" : "Nhập mã PIN 4 số") + "</label>" +
      '<input class="pin" id="pin" type="tel" inputmode="numeric" maxlength="4" autocomplete="one-time-code"></div>' +
      (moi ? '<div class="field"><label style="color:#BFD8CC">Nhập lại mã PIN</label><input class="pin" id="pin2" type="tel" inputmode="numeric" maxlength="4"></div>' : "") +
      '<button class="btn" id="go">' + (moi ? "Tạo PIN và vào app" : "Vào app") + '</button><button class="link" id="back">‹ Chọn tên khác</button>' +
      (moi ? "" : '<div class="muted" style="margin-top:10px;font-size:13px">Quên PIN? Nhờ Thủ quỹ hoặc Phụ trách Đội đặt lại.</div>') + "</div>";
    var pin = document.getElementById("pin"); pin.focus();
    document.getElementById("back").onclick = moLogin;
    function go() {
      var p2 = document.getElementById("pin2");
      run(document.getElementById("go"), api("dangNhap", { ten: x.ten, pin: pin.value, pin2: p2 ? p2.value : "" })).then(function (r) {
        S.ten = r.ten; S.token = r.token; store("elp_ten", r.ten); store("elp_token", r.token);
        if (S.ds) x.coPin = true;
        taiLai(true);
      }).catch(function () {});
    }
    document.getElementById("go").onclick = go;
    pin.onkeyup = function (e) { if (e.key === "Enter") go(); };
  }

  // ---------- khung chính ----------
  function taiLai(splash) {
    if (splash) $app.innerHTML = '<div class="splash"><div class="brand">ELEVEN PARK FC</div><div class="spin"></div></div>';
    S.dash = null; S.sq = {}; S.ts = null; S.tv = null; S.kq = {}; S.bxh = {};
    return api("tongQuan").then(function (d) { S.d = d; ve(); })
      .catch(function (e) { if (!S.token) moLogin(); else $app.innerHTML = '<div class="err">' + esc(e.message) + '</div><button class="btn" style="margin:14px;width:auto" onclick="location.reload()">Thử lại</button>'; });
  }
  var TIEU_DE = { tq: "Tổng quan", tran: "Trận đấu", quy: "Quỹ", ts: "Tài sản", toi: "Tôi", bcs: "Ban Cán sự" };
  var NAV_ICON = { tq: "tq", tran: "tran", quy: "vi", ts: "ts", toi: "hoso" };
  function ve() {
    var d = S.d, me = d.me;
    if (S.tab === "bcs" && !me.bcs) S.tab = "toi";
    var tabs = ["tq", "tran", "quy", "ts", "toi"], navOn = S.tab === "bcs" ? "toi" : S.tab;
    $app.innerHTML = '<header class="top"><div class="brand">' + esc((CFG.TEN_DOI || "Eleven Park FC").toUpperCase()) + "</div><h1>" + TIEU_DE[S.tab] +
      '</h1><div class="sub">' + esc(me.nick) + (me.roles && me.roles[0] && me.roles[0] !== "Thành viên" ? " · " + esc(me.roles.join(", ")) : "") +
      '</div><button class="act" id="reload" aria-label="Tải lại">↻ Tải lại</button></header><main id="main"></main>' +
      '<nav class="bot">' + tabs.map(function (t) { return '<button data-t="' + t + '" class="' + (navOn === t ? "on" : "") + '">' + svg(NAV_ICON[t]) + "<span>" + TIEU_DE[t] + "</span></button>"; }).join("") + "</nav>";
    document.querySelector("nav.bot").onclick = function (e) { var b = e.target.closest("button"); if (b) { S.tab = b.dataset.t; store("elp_tab", S.tab); ve(); window.scrollTo(0, 0); } };
    document.getElementById("reload").onclick = function () { run(this, taiLai(), "Đã cập nhật"); };
    ({ tq: veTq, tran: veTran, quy: veQuy, ts: veTs, toi: veHoSo, bcs: veBcs })[S.tab](document.getElementById("main"));
  }

  // ---------- TRẬN ĐẤU: điểm danh · kết quả · BXH ----------
  function veTran(el) {
    el.innerHTML = '<div class="tabs seg">' + [["dd", "Điểm danh"], ["kq", "Kết quả"], ["bxh", "BXH"]].map(function (x) {
      return '<button class="tab' + (S.tranTab === x[0] ? " on" : "") + '" data-tt="' + x[0] + '">' + x[1] + "</button>"; }).join("") + '</div><div id="tv"></div>';
    el.querySelectorAll("[data-tt]").forEach(function (b) { b.onclick = function () { S.tranTab = b.dataset.tt; veTran(el); }; });
    var box = document.getElementById("tv");
    ({ dd: veDiemDanh, kq: veKetQua, bxh: veBxh })[S.tranTab](box);
  }
  function teamTen() { return S.d.cauHinh.teams || ["Team 1", "Team 2"]; }
  function veKetQua(el) {
    var key = S.kqMua || "_";
    if (!S.kq[key]) { choTai(el); api("ketQua", { mua: S.kqMua }).then(function (r) { S.kq[key] = r; S.kq[r.mua] = r; if (S.tranTab === "kq") veKetQua(el); }).catch(function (e) { el.innerHTML = '<div class="err">' + esc(e.message) + "</div>"; }); return; }
    var K = S.kq[key], T = teamTen(), h = "";
    if (K.muaCo.length > 1) h += '<div class="tabs">' + K.muaCo.map(function (m) { return '<button class="tab' + (m.ma === K.mua ? " on" : "") + '" data-mua="' + m.ma + '">' + esc(m.ten) + "</button>"; }).join("") + "</div>";
    if (S.d.cauHinh.thuNghiem) h += '<div class="banner warn"><b>🧪 Giai đoạn thử nghiệm</b>Kết quả nhập lúc này để chạy thử, chưa tính vào bảng xếp hạng.</div>';
    if (!K.tran.length) h += '<div class="card empty">' + esc(K.tenMua) + ": chưa có trận nào diễn ra.</div>";
    K.tran.forEach(function (t) {
      var ban = function (i) { return t.ev.filter(function (e) { return (e.loai === "BAN" || e.loai === "PHAN_LUOI") && e.team === T[i]; }).length; };
      h += '<div class="card"><div class="row"><b style="color:#0B3D2E">' + esc(t.ngayVN) + '</b><span class="sp"></span>' + (t.kq ? (t.kq.tinh ? "" : '<span class="pill warn">Chưa tính BXH</span>') : '<span class="pill">Chưa có kết quả</span>') + "</div>" +
        '<div class="score"><div class="st"><b>' + esc(T[0]) + "</b><small>" + esc(t.ao1 ? "áo " + t.ao1 : "") + '</small></div><div class="sc">' + (t.kq ? t.kq.b1 + " – " + t.kq.b2 : "– : –") + '</div><div class="st r"><b>' + esc(T[1]) + "</b><small>" + esc(t.ao2 ? "áo " + t.ao2 : "") + "</small></div></div>";
      if (t.ev.length) h += '<div class="evs">' + [0, 1].map(function (i) {
        return '<div class="evc' + (i ? " r" : "") + '">' + t.ev.filter(function (e) { return e.team === T[i]; }).map(function (e) {
          var ic = { BAN: "⚽", PHAN_LUOI: "⚽", VANG: "🟨", DO: "🟥" }[e.loai];
          return '<div class="ev">' + ic + " " + esc(e.nick) + (e.loai === "PHAN_LUOI" ? " (phản lưới)" : "") + (e.phut ? " " + esc(e.phut) + "′" : "") + (e.ktNick ? '<small>kiến tạo: ' + esc(e.ktNick) + "</small>" : "") +
            (K.sua && S.kqMo === t.ma ? ' <button class="x" data-xsk="' + esc(e.ma) + '" aria-label="Xóa">×</button>' : "") + "</div>";
        }).join("") + "</div>";
      }).join("") + "</div>";
      if (t.kq && (ban(0) !== t.kq.b1 || ban(1) !== t.kq.b2) && t.ev.some(function (e) { return e.loai === "BAN" || e.loai === "PHAN_LUOI"; }))
        h += '<div class="muted" style="font-size:12.5px;margin-top:6px">ℹ️ Đã ghi ' + ban(0) + " – " + ban(1) + " bàn có tên người ghi, tỉ số là " + t.kq.b1 + " – " + t.kq.b2 + ".</div>";
      if (K.sua) {
        if (S.kqMo === t.ma) {
          var opt = function (team, rong) { return (rong ? '<option value="">— Không có —</option>' : '<option value="">— Chọn cầu thủ —</option>') + T.map(function (tm) {
            return '<optgroup label="' + esc(tm) + '">' + K.nguoi.filter(function (n) { return n.team === tm; }).map(function (n) { return '<option value="' + esc(n.ten) + '">' + esc(n.nick) + "</option>"; }).join("") + "</optgroup>"; }).join("") +
            (K.nguoi.some(function (n) { return !n.team; }) ? '<optgroup label="Chưa xếp team">' + K.nguoi.filter(function (n) { return !n.team; }).map(function (n) { return '<option value="' + esc(n.ten) + '">' + esc(n.nick) + "</option>"; }).join("") + "</optgroup>" : ""); };
          h += '<hr class="s"><div class="lbl">Tỉ số</div><div class="grid2"><div class="field"><label>' + esc(T[0]) + '</label><input type="number" min="0" id="b1" value="' + (t.kq ? t.kq.b1 : "") + '"></div><div class="field"><label>' + esc(T[1]) + '</label><input type="number" min="0" id="b2" value="' + (t.kq ? t.kq.b2 : "") + '"></div></div>' +
            '<button class="btn" data-luukq="' + t.ma + '">Lưu tỉ số</button>' +
            '<hr class="s"><div class="lbl">Thêm bàn thắng / thẻ</div><div class="grid2"><div class="field"><label>Loại</label><select id="skLoai"><option value="BAN">⚽ Bàn thắng</option><option value="PHAN_LUOI">⚽ Phản lưới nhà</option><option value="VANG">🟨 Thẻ vàng</option><option value="DO">🟥 Thẻ đỏ</option></select></div>' +
            '<div class="field"><label>Phút (nếu nhớ)</label><input type="number" min="1" max="130" id="skPhut"></div></div>' +
            '<div class="field"><label>Cầu thủ</label><select id="skCt">' + opt() + '</select></div><div class="field" id="ktBox"><label>Kiến tạo</label><select id="skKt">' + opt(null, true) + "</select></div>" +
            '<button class="btn gold" data-themsk="' + t.ma + '">Thêm</button><div class="muted" style="font-size:12.5px;margin-top:8px">Thẻ vàng 50k, thẻ đỏ 100k tự ghi vào quỹ phạt của team (chia đều cuối mùa).</div>' +
            '<button class="btn ghost" data-dong="1">Xong</button>';
        } else h += '<button class="btn ghost" data-mo="' + t.ma + '" style="margin-top:12px">' + (t.kq ? "✏️ Sửa kết quả" : "＋ Nhập kết quả") + "</button>";
      }
      h += "</div>";
    });
    el.innerHTML = h;
    var reload = function (r) { S.kq = {}; S.bxh = {}; S.kq[r.mua] = r; S.kq[S.kqMua || "_"] = r; veKetQua(el); };
    el.querySelectorAll("[data-mua]").forEach(function (b) { b.onclick = function () { S.kqMua = b.dataset.mua; veKetQua(el); }; });
    el.querySelectorAll("[data-mo]").forEach(function (b) { b.onclick = function () { S.kqMo = b.dataset.mo; veKetQua(el); }; });
    el.querySelectorAll("[data-dong]").forEach(function (b) { b.onclick = function () { S.kqMo = ""; veKetQua(el); }; });
    var lo = document.getElementById("skLoai"); if (lo) lo.onchange = function () { document.getElementById("ktBox").hidden = lo.value !== "BAN"; };
    el.querySelectorAll("[data-luukq]").forEach(function (b) { b.onclick = function () {
      run(b, api("luuKetQua", { maTran: b.dataset.luukq, b1: document.getElementById("b1").value, b2: document.getElementById("b2").value }), "Đã lưu tỉ số ✅").then(reload).catch(function () {}); }; });
    el.querySelectorAll("[data-themsk]").forEach(function (b) { b.onclick = function () {
      var ct = document.getElementById("skCt").value; if (!ct) return toast("Chọn cầu thủ", true);
      run(b, api("themSuKien", { maTran: b.dataset.themsk, loai: lo.value, cauThu: ct, kienTao: lo.value === "BAN" ? document.getElementById("skKt").value : "", phut: document.getElementById("skPhut").value }), "Đã thêm ✅").then(reload).catch(function () {}); }; });
    el.querySelectorAll("[data-xsk]").forEach(function (b) { b.onclick = function () { run(b, api("xoaSuKien", { ma: b.dataset.xsk }), "Đã xóa").then(reload).catch(function () {}); }; });
  }
  var MAU_TEAM = ["#2A6CB0", "#D97A2B"], MAU_KHAC = "#8C938F";
  function veBxh(el) {
    var key = S.bxhMua || "_";
    if (!S.bxh[key]) { choTai(el); api("bxh", { mua: S.bxhMua }).then(function (r) { S.bxh[key] = r; S.bxh[r.mua] = r; if (S.tranTab === "bxh") veBxh(el); }).catch(function (e) { el.innerHTML = '<div class="err">' + esc(e.message) + "</div>"; }); return; }
    var B = S.bxh[key], T = B.teams || teamTen(), h = "";
    var mau = function (tm) { var i = T.indexOf(tm); return i === -1 ? MAU_KHAC : MAU_TEAM[i]; };
    var tk = {}; B.team.forEach(function (t) { tk[t.team] = t; });
    var A = tk[T[0]], C = tk[T[1]];
    if (B.muaCo.length > 1) h += '<div class="tabs">' + B.muaCo.map(function (m) { return '<button class="tab' + (m.ma === B.mua ? " on" : "") + '" data-mua="' + m.ma + '">' + esc(m.ten) + "</button>"; }).join("") + "</div>";
    var legend = '<div class="lg">' + T.map(function (tm) { return '<span><i style="background:' + mau(tm) + '"></i>' + esc(tm) + "</span>"; }).join("") + "</div>";

    // 1. Đối đầu 2 team
    var hoa = A.h, tong = Math.max(B.soTran, 1);
    h += '<div class="card duel"><div class="row"><span class="lbl">🏆 ' + esc(B.tenMua) + '</span><span class="sp"></span><span class="muted" style="font-size:13px">' + B.soTran + ' trận</span></div>' +
      '<div class="dl"><div class="dt"><i style="background:' + mau(T[0]) + '"></i><b>' + esc(T[0]) + '</b></div><div class="dp">' + A.d + '<small>điểm</small></div><div class="dvs">–</div><div class="dp">' + C.d + '<small>điểm</small></div><div class="dt r"><b>' + esc(T[1]) + '</b><i style="background:' + mau(T[1]) + '"></i></div></div>';
    if (B.soTran) {
      h += '<div class="split" role="img" aria-label="' + esc(T[0]) + " thắng " + A.th + ", hòa " + hoa + ", " + esc(T[1]) + " thắng " + C.th + '">' +
        (A.th ? '<i style="flex:' + A.th + ";background:" + mau(T[0]) + '"></i>' : "") + (hoa ? '<i style="flex:' + hoa + ';background:#C9CCC4"></i>' : "") + (C.th ? '<i style="flex:' + C.th + ";background:" + mau(T[1]) + '"></i>' : "") + "</div>" +
        '<div class="row split-l"><span><b>' + A.th + "</b> thắng</span><span class=\"sp\"></span><span><b>" + hoa + "</b> hòa</span><span class=\"sp\"></span><span><b>" + C.th + "</b> thắng</span></div>";
      var mx = Math.max(A.bt, C.bt, 1);
      h += mirror("Bàn thắng", A.bt, C.bt, mx) + mirror("Bàn thua", A.bb, C.bb, Math.max(A.bb, C.bb, 1));
      h += '<div class="row" style="margin-top:12px"><div class="form">' + A.form.map(function (f) { return '<i class="f' + f + '">' + f + "</i>"; }).join("") + '</div><span class="sp"></span><span class="muted" style="font-size:12px">5 trận gần nhất</span><span class="sp"></span><div class="form">' + C.form.map(function (f) { return '<i class="f' + f + '">' + f + "</i>"; }).join("") + "</div></div>";
    } else h += '<div class="empty">Chưa có trận nào tính vào bảng xếp hạng' + (S.d.cauHinh.thuNghiem ? " (giai đoạn thử nghiệm chưa tính)" : "") + ".</div>";
    h += '<details class="tbl"><summary>Xem dạng bảng</summary><table class="bxh"><tr><th>#</th><th class="l">Team</th><th>Tr</th><th>T-H-B</th><th>BT-BB</th><th>Đ</th></tr>' + B.team.map(function (t, i) {
      return "<tr><td>" + (i + 1) + '</td><td class="l">' + esc(t.team) + "</td><td>" + t.tr + "</td><td>" + t.th + "-" + t.h + "-" + t.b + "</td><td>" + t.bt + "-" + t.bb + "</td><td><b>" + t.d + "</b></td></tr>"; }).join("") + "</table></details></div>";

    // 2. Điểm tích lũy theo vòng
    if (B.tienTrinh.length >= 2) h += '<div class="card"><h2>📈 Điểm tích lũy theo vòng</h2>' + legend + lineChart(B.tienTrinh) + '<div class="tip" id="tip" hidden></div></div>';

    // 3. Vua phá lưới: bục + thanh
    h += '<div class="card"><h2>⚽ Vua phá lưới</h2>' + (B.ghiBan.length ? legend + podium(B.ghiBan, "bàn") + hbars(B.ghiBan.slice(3), function (x) { return x.so + " bàn"; }, null, B.ghiBan[0].so) : '<div class="empty">Chưa có bàn thắng nào</div>') + "</div>";
    h += '<div class="card"><h2>🎯 Kiến tạo</h2>' + (B.kienTao.length ? hbars(B.kienTao, function (x) { return x.so + " lần"; }) : '<div class="empty">Chưa có kiến tạo nào</div>') + "</div>";
    h += '<div class="card"><h2>🟨 Thẻ phạt</h2>' + (B.the.length ? '<ul class="list">' + B.the.map(function (x) {
      return '<li><span class="dot" style="background:' + mau(x.team) + '"></span><div class="who"><b>' + esc(x.nick) + "</b></div>" + '<span class="cards">' + new Array(x.vang + 1).join('<i class="cy" aria-hidden="true"></i>') + new Array(x.doo + 1).join('<i class="cr" aria-hidden="true"></i>') + "</span>" +
        '<span class="muted" style="font-size:13px;min-width:62px;text-align:right">' + [x.vang ? x.vang + " vàng" : "", x.doo ? x.doo + " đỏ" : ""].filter(String).join(" · ") + "</span></li>"; }).join("") + "</ul>" : '<div class="empty">Chưa có thẻ nào, fair-play! 👏</div>') + "</div>";
    h += '<div class="card"><h2>✅ Chuyên cần<span class="r">' + B.soChot + " trận đã chốt</span></h2>" + (B.chuyenCan.length ? hbars(B.chuyenCan, function (x) { return x.tyLe + "%"; }, function () { return "#3E7A62"; }, 100, function (x) { return x.tyLe; }) : '<div class="empty">Chưa có trận nào chốt điểm danh</div>') + "</div>";
    el.innerHTML = h;
    el.querySelectorAll("[data-mua]").forEach(function (b) { b.onclick = function () { S.bxhMua = b.dataset.mua; veBxh(el); }; });
    var svgEl = el.querySelector("svg.lc"), tip = document.getElementById("tip");
    if (svgEl) svgEl.querySelectorAll("[data-v]").forEach(function (r) {
      var show = function () { var x = B.tienTrinh[+r.dataset.v]; tip.hidden = false; tip.innerHTML = "<b>Vòng " + (+r.dataset.v + 1) + " · " + esc(x.ngay) + "</b> · tỉ số " + x.b1 + "–" + x.b2 + "<br>" + esc(T[0]) + ": " + x.d1 + " điểm · " + esc(T[1]) + ": " + x.d2 + " điểm";
        svgEl.querySelectorAll(".cx").forEach(function (c) { c.setAttribute("opacity", c.dataset.i === r.dataset.v ? 1 : 0); }); };
      r.addEventListener("mouseenter", show); r.addEventListener("click", show);
    });

    function mirror(ten, a, c, m) {
      return '<div class="mir"><span class="mv">' + a + '</span><div class="mb l"><i style="width:' + Math.round(a / m * 100) + "%;background:" + mau(T[0]) + '"></i></div><span class="mt">' + ten + '</span><div class="mb"><i style="width:' + Math.round(c / m * 100) + "%;background:" + mau(T[1]) + '"></i></div><span class="mv">' + c + "</span></div>";
    }
    function podium(ds, dv) {
      var ord = [ds[1], ds[0], ds[2]], cls = ["p2", "p1", "p3"], md = ["🥈", "🥇", "🥉"];
      return '<div class="podium">' + ord.map(function (x, i) {
        if (!x) return '<div class="pd ' + cls[i] + ' e"></div>';
        return '<div class="pd ' + cls[i] + '"><div class="pav" style="box-shadow:0 0 0 3px ' + mau(x.team) + '">' + esc(viet(x.nick)) + '</div><div class="pn">' + esc(x.nick) + '</div><div class="pb"><span class="pm">' + md[i] + "</span><b>" + x.so + "</b><small>" + dv + "</small></div></div>";
      }).join("") + "</div>";
    }
    function hbars(ds, nhan, mauFn, max, valFn) {
      if (!ds.length) return "";
      valFn = valFn || function (x) { return x.so; };
      var m = max || Math.max.apply(null, ds.map(valFn).concat([1]));
      return '<div class="hb">' + ds.map(function (x) {
        return '<div class="hbr"><span class="hn">' + esc(x.nick) + '</span><div class="ht"><i style="width:' + Math.max(3, Math.round(valFn(x) / m * 100)) + "%;background:" + (mauFn ? mauFn(x) : mau(x.team)) + '"></i></div><span class="hv">' + esc(nhan(x)) + "</span></div>";
      }).join("") + "</div>";
    }
    function lineChart(tt) {
      var W = 320, H = 170, L = 26, R = 12, Tp = 14, Bt = 26, n = tt.length;
      var my = Math.max.apply(null, tt.map(function (x) { return Math.max(x.d1, x.d2); }).concat([3]));
      var X = function (i) { return L + (n === 1 ? 0 : i * (W - L - R) / (n - 1)); }, Y = function (v) { return Tp + (H - Tp - Bt) * (1 - v / my); };
      var g = "", step = Math.max(1, Math.ceil(my / 4));
      for (var v = 0; v <= my; v += step) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="#E2DED0" stroke-width="1"/><text x="' + (L - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end" class="ax">' + v + "</text>";
      tt.forEach(function (x, i) { if (n <= 8 || i % Math.ceil(n / 8) === 0 || i === n - 1) g += '<text x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle" class="ax">V' + (i + 1) + "</text>"; });
      var line = function (k, c) {
        var pts = tt.map(function (x, i) { return X(i) + "," + Y(x[k]); }).join(" ");
        return '<polyline points="' + pts + '" fill="none" stroke="' + c + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
          tt.map(function (x, i) { return '<circle cx="' + X(i) + '" cy="' + Y(x[k]) + '" r="4" fill="' + c + '" stroke="#FFFFFA" stroke-width="2"/>'; }).join("");
      };
      var cross = tt.map(function (x, i) { return '<line class="cx" data-i="' + i + '" x1="' + X(i) + '" x2="' + X(i) + '" y1="' + Tp + '" y2="' + (H - Bt) + '" stroke="#5A625E" stroke-width="1" stroke-dasharray="3 3" opacity="0"/>'; }).join("");
      var hit = tt.map(function (x, i) { var w = (W - L - R) / Math.max(n - 1, 1); return '<rect data-v="' + i + '" x="' + (X(i) - w / 2) + '" y="0" width="' + w + '" height="' + H + '" fill="transparent"/>'; }).join("");
      return '<svg class="lc" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Điểm tích lũy hai team qua ' + n + ' vòng">' + g + cross + line("d2", mau(T[1])) + line("d1", mau(T[0])) + hit + "</svg>";
    }
  }

  function veDiemDanh(el) {
    var x = S.d.tran, vi = S.d.vi, me = S.d.me;
    if (!x) { el.innerHTML = '<div class="card empty">Chưa có lịch thi đấu. Vote mở lúc 10h sáng thứ 3 hằng tuần.</div>'; return; }
    var t = x.tran, toi = x.toi || {}, lech = Date.now() - x.gioServer, now = function () { return Date.now() - lech; };
    var myTeam = me.Team || "", TEAMS = S.d.cauHinh.teams || ["Team 1", "Team 2"];
    var st = t.trangThai === "Hủy" ? "Trận này đã hủy" : t.trangThai === "Đã chốt" ? "Đã chốt điểm danh" :
      t.trangThai === "Khóa" || now() > t.khoaMs ? "Đã khóa vote" : "Khóa vote sau <b id='cd'>" + demNguoc(t.khoaMs - now()) + "</b> (21h thứ 6)";
    var h = '<div class="hero"><div class="lbl" style="color:#C5A059">' + (t.homNay ? "HÔM NAY" : "TRẬN SẮP TỚI") + '</div><div class="when">' + esc(t.ngayVN) + " · " + esc(t.bongLan.replace(":", "h")) + '</div><div class="where">📍 ' + esc(t.san) + " · check-in trước " + esc(t.hanCheckin.slice(0, 5).replace(":", "h")) + "</div>" +
      '<div class="kits">' + TEAMS.map(function (tm, i) { return '<div class="kit' + (myTeam === tm ? " me" : "") + '"><b>' + esc(tm) + "</b> · áo " + esc((i ? t.ao2 : t.ao1) || "chưa chốt") + "</div>"; }).join("") + "</div>" +
      '<div class="st">' + st + "</div></div>";
    var TN = S.d.cauHinh.thuNghiem;
    if (TN) h += '<div class="banner warn"><b>🧪 Giai đoạn thử nghiệm</b>Vote, check-in và lỗi Sao đỏ chỉ để chạy thử quy trình, chưa tính phạt, chưa ghi vào sổ.</div>';
    var hc = toi.hanChe;
    if (hc) h += '<div class="banner ' + (hc.muc === "CAM" ? "bad" : "warn") + '"><b>' + (hc.muc === "CAM" ? "⛔ Bạn đang bị cấm thi đấu" : "⚠️ Bạn chỉ được vào sân từ phút 46") + "</b>" + esc(hc.lyDo) + (hc.nhan && hc.muc !== "CAM" && hc.nhan !== "Phút 46" ? " · " + esc(hc.nhan.replace("Phút 46 · ", "")) : "") +
      ' · <a href="#" id="toVi">Đóng ngay</a></div>';

    // vote
    var khoa = t.trangThai !== "Mở" || now() > t.khoaMs, v = toi.vote || "";
    h += '<div class="card"><h2>Vote điểm danh' + (v ? '<span class="r">Đã vote</span>' : "") + '</h2><div class="votes">' +
      vbtn("DUNG_GIO", "Có mặt đúng giờ", "Có mặt trước " + t.hanCheckin.slice(0, 5)) + vbtn("DI_MUON", "Có mặt, đi muộn", "Ghi số phút dự kiến") + vbtn("NGHI", "Nghỉ có lý do", "Ghi lý do") + "</div>" +
      '<div id="vx"></div>' + (khoa ? "" : '<button class="btn" id="luuVote">' + (v ? "Cập nhật vote" : "Gửi vote") + "</button>") +
      (khoa && !v && t.trangThai !== "Hủy" ? '<div class="banner bad" style="margin:12px 0 0"><b>Bạn chưa vote</b>' + (TN ? "Vote đã khóa. Đang chạy thử nên chưa tính lỗi Không vote." : "Vote đã khóa, Sao đỏ ghi lỗi Không vote (50k).") + "</div>" : "") + "</div>";
    function vbtn(k, a, b) { return '<button class="vbtn' + (v === k ? " on" : "") + '" data-v="' + k + '"' + (khoa ? " disabled" : "") + '><span class="dot"></span><span>' + a + "<small>" + b + "</small></span></button>"; }

    // check-in
    if (t.trangThai !== "Hủy") {
      h += '<div class="card"><h2>Check-in tại sân</h2>';
      if (toi.checkin) h += '<div class="banner ' + (toi.muon ? "warn" : "ok") + '" style="margin:0"><b>' + (toi.muon ? "⏰ Đã check-in " + esc(toi.checkin) + " · đi muộn" : "✅ Đã check-in " + esc(toi.checkin) + " · đúng giờ") + "</b>" + (toi.hoBoi ? "Check-in hộ bởi " + esc(toi.hoBoi) : "Ghi nhận bằng GPS tại sân") + "</div>";
      else if (t.homNay && t.trangThai !== "Đã chốt" && now() >= t.moCiMs && now() <= t.dongCiMs) h += '<div class="muted">Đứng trong khu vực sân rồi bấm nút. Đúng giờ: trước ' + esc(t.hanCheckin) + " · đóng lúc " + esc(t.dongCi) + '.</div><button class="btn gold big" id="ci">📍 Check-in ngay</button>';
      else if (t.homNay && now() > t.dongCiMs) h += '<div class="muted">Đã hết giờ check-in (' + esc(t.moCi) + "–" + esc(t.dongCi) + "). Có mặt mà chưa check-in thì báo Sao đỏ check-in hộ.</div>";
      else h += '<div class="muted">Nút check-in chỉ mở từ <b>' + esc(t.moCi) + " đến " + esc(t.dongCi) + "</b> ngày thi đấu, khi bạn ở sân (bán kính " + esc(t.banKinh) + " m). Đúng giờ: trước " + esc(t.hanCheckin.slice(0, 5)) + ".</div>";
      h += "</div>";
    }

    // danh sách
    var ds = x.ds, teams = TEAMS, coTeam = ds.some(function (r) { return r.team; });
    if (!S.team) S.team = myTeam || (coTeam ? TEAMS[0] : "Tất cả");
    var nhom = coTeam ? teams.concat(ds.some(function (r) { return !r.team; }) ? ["Chưa xếp"] : []) : ["Tất cả"];
    if (nhom.indexOf(S.team) === -1) S.team = nhom[0];
    var loc = ds.filter(function (r) { return S.team === "Tất cả" || (S.team === "Chưa xếp" ? !r.team : r.team === S.team); });
    var di = loc.filter(function (r) { return r.vote === "DUNG_GIO" || r.vote === "DI_MUON"; }).length, ci = loc.filter(function (r) { return r.checkin; }).length;
    var chua = loc.filter(function (r) { return !r.vote && r.batBuoc; }).length;
    if (me.bcs && t.trangThai !== "Hủy") h += '<button class="btn ghost" id="toBcs" style="margin:0 0 12px">🛡️ Ghi vi phạm / check-in hộ (Ban Cán sự)</button>';
    h += '<div class="card"><h2>Danh sách</h2>' + (nhom.length > 1 ? '<div class="tabs">' + nhom.map(function (n) { return '<button class="tab' + (n === S.team ? " on" : "") + '" data-tm="' + n + '">' + n + "</button>"; }).join("") + "</div>" : "") +
      '<div class="count"><div><b>' + di + "</b><span>Đăng ký đá</span></div><div><b>" + ci + "</b><span>Đã check-in</span></div><div><b>" + chua + "</b><span>Chưa vote</span></div></div>" +
      '<ul class="list">' + loc.sort(sapXep).map(dongTv).join("") + "</ul>" + (loc.length ? "" : '<div class="empty">Chưa có ai</div>') + "</div>";
    el.innerHTML = h;

    // sự kiện
    var chon = v;
    function veVx() {
      var vx = document.getElementById("vx"); if (!vx) return;
      vx.innerHTML = chon === "DI_MUON" ? '<div class="field"><label>Đến muộn khoảng bao nhiêu phút?</label><input type="number" id="phut" min="1" max="120" value="' + esc(toi.vote === "DI_MUON" ? toi.phut : "") + '"></div>' :
        chon === "NGHI" ? '<div class="field"><label>Lý do nghỉ</label><input type="text" id="lyDo" maxlength="200" value="' + esc(toi.vote === "NGHI" ? toi.lyDo : "") + '" placeholder="Bận việc gia đình, công tác…"></div>' : "";
    }
    veVx();
    el.querySelectorAll(".vbtn").forEach(function (b) {
      b.onclick = function () { chon = b.dataset.v; el.querySelectorAll(".vbtn").forEach(function (o) { o.classList.toggle("on", o === b); }); veVx(); };
    });
    var lv = document.getElementById("luuVote");
    if (lv) lv.onclick = function () {
      if (!chon) return toast("Chọn một lựa chọn trước nhé", true);
      var p = document.getElementById("phut"), l = document.getElementById("lyDo");
      run(lv, api("vote", { maTran: t.ma, vote: chon, phut: p ? p.value : "", lyDo: l ? l.value : "" }), "Đã lưu vote ✅").then(function (r) { S.d.tran = r; ve(); }).catch(function () {});
    };
    var cib = document.getElementById("ci");
    if (cib) cib.onclick = function () { checkin(cib, t); };
    var tv = document.getElementById("toVi"); if (tv) tv.onclick = function (e) { e.preventDefault(); S.tab = "quy"; S.quyTab = "vi"; ve(); };
    var gb = document.getElementById("toBcs"); if (gb) gb.onclick = function () { S.tab = "bcs"; ve(); window.scrollTo(0, 0); };
    el.querySelectorAll("[data-tm]").forEach(function (b) { b.onclick = function () { S.team = b.dataset.tm; veDiemDanh(el); }; });
    if (t.homNay && !toi.checkin && t.trangThai !== "Đã chốt" && now() < t.dongCiMs) { clearTimeout(veDiemDanh._r); veDiemDanh._r = setTimeout(function () { if (S.tab === "tran" && S.tranTab === "dd") veDiemDanh(el); }, Math.min(Math.max((now() < t.moCiMs ? t.moCiMs : t.dongCiMs) - now() + 1000, 5000), 3600000)); }
    var cd = document.getElementById("cd");
    if (cd) { clearInterval(veDiemDanh._i); veDiemDanh._i = setInterval(function () { var c = document.getElementById("cd"); if (!c) return clearInterval(veDiemDanh._i); c.textContent = demNguoc(t.khoaMs - now()); }, 30000); }
  }
  function sapXep(a, b) {
    var w = function (r) { return r.checkin ? 0 : r.vote === "DUNG_GIO" ? 1 : r.vote === "DI_MUON" ? 2 : !r.vote ? 3 : 4; };
    return w(a) - w(b) || a.nick.localeCompare(b.nick, "vi");
  }
  function dongTv(r) {
    var vt = { DUNG_GIO: "Đúng giờ", DI_MUON: "Muộn " + (r.phut || "?") + "′", NGHI: "Nghỉ" }[r.vote] || (r.batBuoc ? "Chưa vote" : "");
    var sub = [vt];
    if (r.vote === "NGHI" && r.lyDo) sub.push(r.lyDo);
    if (r.checkin) sub.push("✓ " + r.checkin.slice(0, 5) + (r.muon ? " muộn" : "") + (r.hoBoi ? " (hộ)" : ""));
    var badge = r.hanChe ? '<span class="pill ' + (r.hanChe.muc === "CAM" ? "bad" : "warn") + '" title="' + esc(r.hanChe.lyDo) + '">' + (r.hanChe.muc === "CAM" ? "Cấm" : "Phút 46") + "</span>" : "";
    return '<li><div class="av' + (r.checkin ? " ok" : "") + '">' + esc(viet(r.nick)) + '</div><div class="who"><b>' + esc(r.nick) + "</b><span>" + esc(sub.join(" · ")) + "</span></div>" + badge + "</li>";
  }
  function checkin(btn, t) {
    if (!navigator.geolocation) return toast("Điện thoại không hỗ trợ định vị", true);
    busy(btn, true); btn.textContent = "Đang lấy vị trí…";
    navigator.geolocation.getCurrentPosition(function (pos) {
      run(btn, api("checkin", { maTran: t.ma, lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy }), "Check-in thành công ✅")
        .then(function (r) { S.d.tran = r; ve(); })
        .catch(function () { btn.textContent = "📍 Check-in ngay"; });
    }, function (err) {
      busy(btn, false); btn.textContent = "📍 Check-in ngay";
      toast(err.code === 1 ? "Bạn cần cho phép app dùng vị trí (Cài đặt › Quyền vị trí)" : "Chưa lấy được vị trí, bật GPS rồi thử lại", true);
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  }

  // ---------- QUỸ: ví của tôi + sổ quỹ đội ----------
  function veQuy(el) {
    el.innerHTML = '<div class="tabs seg"><button class="tab' + (S.quyTab === "vi" ? " on" : "") + '" data-q="vi">Ví của tôi</button><button class="tab' + (S.quyTab === "so" ? " on" : "") + '" data-q="so">Sổ quỹ đội</button></div><div id="qv"></div>';
    el.querySelectorAll("[data-q]").forEach(function (b) { b.onclick = function () { S.quyTab = b.dataset.q; veQuy(el); }; });
    (S.quyTab === "so" ? veSoQuy : veVi)(document.getElementById("qv"));
  }
  function choTai(el) { el.innerHTML = '<div class="card empty"><div class="spin" style="margin:10px auto;border-color:#E2DED0;border-top-color:#0B3D2E"></div>Đang tải…</div>'; }
  function veSoQuy(el) {
    var m = S.sqM || (S.d.vi ? S.d.vi.m : 0) || new Date().getMonth() + 1;
    if (!S.sq[m]) { choTai(el); api("soQuy", { m: m }).then(function (r) { S.sq[r.m || m] = r; S.sq[m] = r; S.sqM = r.m || m; veSoQuy(el); }).catch(function (e) { el.innerHTML = '<div class="err">' + esc(e.message) + "</div>"; }); return; }
    var q = S.sq[m];
    if (!q.thu && !q.thuRows) { el.innerHTML = '<div class="card empty">Chưa có sổ quỹ.</div>'; return; }
    var h = '<div class="tabs">' + q.thangCo.map(function (k) { return '<button class="tab' + (k === q.m ? " on" : "") + '" data-m="' + k + '">T' + k + "</button>"; }).join("") + "</div>" +
      '<div class="kpis"><div><span>Tồn đầu T' + q.m + "</span><b>" + tr(q.ton) + '</b></div><div><span>Thu</span><b class="pos">+' + tr(q.thu) + '</b></div><div><span>Chi</span><b class="neg">−' + tr(q.chi) + '</b></div></div>' +
      '<div class="hero" style="padding:14px 18px"><div class="lbl" style="color:#C5A059">SỐ DƯ CUỐI T' + q.m + '</div><div class="when">' + vnd(q.du) + "</div></div>" +
      bang("Thu", q.thuRows, q.thu, "pos") + bang("Chi", q.chiRows, q.chi, "neg") +
      '<div class="muted" style="text-align:center;font-size:12.5px">Số liệu lấy trực tiếp từ tab T' + q.m + "-THU CHI, bot cập nhật khi tiền vào ra.</div>";
    el.innerHTML = h;
    el.querySelectorAll("[data-m]").forEach(function (b) { b.onclick = function () { S.sqM = +b.dataset.m; veSoQuy(el); }; });
    function bang(ten, rows, tong, cls) {
      return '<div class="card"><h2>' + ten + '<span class="r">' + vnd(tong) + '</span></h2><ul class="list">' + rows.map(function (r) {
        return '<li><div class="who"><b style="white-space:normal">' + esc(r.lab) + "</b>" + (r.dg || r.sl ? "<span>" + esc([r.sl && r.gia ? r.sl + " × " + vnd(r.gia) : "", r.dg].filter(String).join(" · ")) + "</span>" : "") + '</div><b class="' + cls + '">' + vnd(r.tien) + "</b></li>";
      }).join("") + "</ul>" + (rows.length ? "" : '<div class="empty">Chưa có khoản nào</div>') + "</div>";
    }
  }
  function tr(n) { n = n || 0; return Math.abs(n) >= 1e6 ? (Math.round(n / 1e5) / 10).toString().replace(".", ",") + "tr" : Math.abs(n) >= 1000 ? Math.round(n / 1000) + "k" : vnd(n); }

  // ---------- TỔNG QUAN ----------
  function veTq(el) {
    if (!S.dash) { choTai(el); api("dashboard").then(function (r) { S.dash = r; if (S.tab === "tq") veTq(el); }).catch(function (e) { el.innerHTML = '<div class="err">' + esc(e.message) + "</div>"; }); return; }
    var D = S.dash, sd = D.soDu, t = D.thang, g = D.gop, h = "";
    var soDu = sd.bank != null ? sd.bank : sd.so;
    h += '<div class="hero"><div class="lbl" style="color:#C5A059">QUỸ ĐANG CÓ</div><div class="when" style="font-size:34px">' + vnd(soDu) + '</div><div class="where">' +
      (sd.bank != null ? (sd.khop ? "✅ Khớp từng đồng với ngân hàng" : "Sổ ghi " + vnd(sd.so) + " · thủ quỹ đang đối chiếu") + (sd.luc ? " · cập nhật " + esc(sd.luc) : "") : "Theo sổ quỹ T" + D.m) + "</div></div>";
    if (t) {
      var lech = t.thu - t.chi;
      h += '<div class="kpis"><div><span>Thu T' + D.m + '</span><b class="pos">+' + tr(t.thu) + '</b></div><div><span>Chi T' + D.m + '</span><b class="neg">−' + tr(t.chi) + '</b></div>' +
        '<div><span>Chênh lệch</span><b class="' + (lech >= 0 ? "pos" : "neg") + '">' + (lech >= 0 ? "+" : "−") + tr(Math.abs(lech)) + "</b></div></div>";
    }
    var pct = g.phaiDong ? Math.round(g.daDong * 100 / g.phaiDong) : 0;
    h += '<div class="card"><h2>Đóng quỹ T' + D.m + '<span class="r">' + g.daDong + "/" + g.phaiDong + ' ae</span></h2><div class="prog"><i style="width:' + pct + '%"></i></div>' +
      '<div class="row" style="margin-top:8px"><span class="muted">' + (g.chua ? "Còn " + g.chua + " ae chưa đóng" + (g.ten.length ? ": " + esc(g.ten.join(", ")) : D.day <= 10 ? " · hạn hết ngày 10" : "") : "Đủ 100%, đỉnh! 👏") + '</span><span class="sp"></span><b style="color:#0B3D2E">' + pct + "%</b></div></div>";
    h += '<div class="kpis two"><div><span>Nợ phạt Sao đỏ</span><b>' + (D.phat.tong ? tr(D.phat.tong) : "0") + "</b><small>" + (D.phat.nguoi ? D.phat.nguoi + " ae" : "không ai nợ") + "</small></div><div><span>Tạm ứng chưa hoàn</span><b>" + (D.tamUng ? tr(D.tamUng) : "0") + "</b><small>&nbsp;</small></div></div>";
    if (D.tran) h += '<div class="card" id="goTran" style="cursor:pointer"><h2>Trận sắp tới<span class="r">' + esc(D.tran.trangThai) + ' ›</span></h2><div class="row"><div class="big" style="font-size:22px">' + esc(D.tran.ngayVN) + " · " + esc(D.tran.bongLan.replace(":", "h")) +
      '</div><span class="sp"></span><div style="text-align:right"><b style="font-size:20px;color:#0B3D2E">' + D.tran.dangKy + "/" + D.tran.tong + '</b><div class="muted" style="font-size:12px">đăng ký đá</div></div></div></div>';
    if (t && t.chiNhom.length) h += bars("Chi T" + D.m + " theo khoản", t.chiNhom, "#0B3D2E");
    if (t && t.thuNhom.length) h += bars("Thu T" + D.m + " theo nguồn", t.thuNhom, "#C5A059");
    if (D.lich.length > 1) {
      var mx = Math.max.apply(null, D.lich.map(function (x) { return Math.abs(x.du); }).concat([1]));
      h += '<div class="card"><h2>Số dư cuối tháng</h2><div class="vbars">' + D.lich.map(function (x) {
        return '<div><small>' + tr(x.du) + '</small><i style="height:' + Math.max(4, Math.round(Math.abs(x.du) / mx * 120)) + 'px"></i><span>T' + x.m + "</span></div>";
      }).join("") + "</div></div>";
    }
    if (D.giaoDich.length) h += '<div class="card"><h2>Giao dịch gần đây</h2><ul class="list">' + D.giaoDich.map(function (x) {
      return '<li><div class="av' + (x.vao ? " ok" : "") + '" style="font-size:16px">' + (x.vao ? "↓" : "↑") + '</div><div class="who"><b>' + esc(x.ten) + "</b><span>" + esc(x.loai) + " · " + esc(x.ngay) + " " + esc(x.gio || "") + '</span></div><b class="' + (x.vao ? "pos" : "neg") + '">' + (x.vao ? "+" : "−") + tr(x.tien) + "</b></li>";
    }).join("") + "</ul></div>";
    if (D.sinhNhat.length) h += '<div class="card"><h2>🎂 Sinh nhật T' + D.m + '</h2><div class="muted">' + D.sinhNhat.map(function (x) { return esc(x.nick) + " (" + x.ngay + ")"; }).join(" · ") + '</div><div class="muted" style="font-size:12.5px;margin-top:6px">Chúc mừng gộp tại Gala cuối quý · quà 200k/người.</div></div>';
    el.innerHTML = h;
    var gt = document.getElementById("goTran"); if (gt) gt.onclick = function () { S.tab = "tran"; ve(); window.scrollTo(0, 0); };
    function bars(ten, rows, mau) {
      var mx = Math.max.apply(null, rows.map(function (r) { return r.tien; }).concat([1]));
      return '<div class="card"><h2>' + ten + '</h2>' + rows.map(function (r) {
        return '<div class="hbar"><div class="row"><span>' + esc(r.lab) + '</span><span class="sp"></span><b>' + vnd(r.tien) + '</b></div><div class="track"><i style="width:' + Math.max(2, Math.round(r.tien / mx * 100)) + "%;background:" + mau + '"></i></div></div>';
      }).join("") + "</div>";
    }
  }

  // ---------- TÀI SẢN ----------
  function veTs(el) {
    if (!S.ts) { choTai(el); api("taiSan").then(function (r) { S.ts = r; if (S.tab === "ts") veTs(el); }).catch(function (e) { el.innerHTML = '<div class="err">' + esc(e.message) + "</div>"; }); return; }
    var T = S.ts, me = S.d.me, con = T.ds.filter(function (x) { return x.tinhTrang !== "Mất" && x.tinhTrang !== "Thanh lý"; });
    var cuaToi = con.filter(function (x) { return x.giu === me.ten; }), h = "";
    var dem = {}; con.forEach(function (x) { dem[x.loai] = (dem[x.loai] || 0) + x.sl; });
    h += '<div class="kpis">' + (Object.keys(dem).length ? Object.keys(dem).slice(0, 3).map(function (k) { return "<div><span>" + esc(k) + "</span><b>" + dem[k] + "</b></div>"; }).join("") : '<div><span>Tài sản</span><b>0</b></div>') + "</div>";
    if (cuaToi.length) h += '<div class="banner warn"><b>📦 Bạn đang giữ ' + cuaToi.length + " món</b>" + esc(cuaToi.map(function (x) { return x.ten + " ×" + x.sl; }).join(", ")) + "</div>";
    if (T.sua) h += '<button class="btn" id="tsMoi" style="margin:0 0 12px">＋ Thêm tài sản</button><div id="tsForm"></div>';
    var nhom = {}; T.ds.forEach(function (x) { (nhom[x.loai] = nhom[x.loai] || []).push(x); });
    Object.keys(nhom).forEach(function (loai) {
      h += '<div class="card"><h2>' + esc(loai) + '<span class="r">' + nhom[loai].length + " món</span></h2><ul class='list'>" + nhom[loai].map(function (x) {
        var cls = { "Tốt": "ok", "Cũ": "", "Hỏng": "warn", "Mất": "bad", "Thanh lý": "bad" }[x.tinhTrang] || "";
        var duocGiao = T.sua || x.giu === me.ten;
        return '<li><div class="who"><b style="white-space:normal">' + esc(x.ten) + " ×" + x.sl + "</b><span>" + esc([x.giuNick ? "👤 " + x.giuNick : "Trong kho", x.noiDe, x.gia ? vnd(x.gia) : "", x.ngayMua].filter(String).join(" · ")) + "</span></div>" +
          '<div style="text-align:right"><span class="pill ' + cls + '">' + esc(x.tinhTrang) + "</span>" +
          (duocGiao ? '<div style="margin-top:6px"><button class="btn sm ghost" data-bg="' + esc(x.ma) + '">Bàn giao</button>' + (T.sua ? ' <button class="btn sm ghost" data-sua="' + esc(x.ma) + '">Sửa</button>' : "") + "</div>" : "") + "</div></li>";
      }).join("") + "</ul></div>";
    });
    if (!T.ds.length) h += '<div class="card empty">Chưa có tài sản nào.' + (T.sua ? " Bấm “Thêm tài sản” để nhập bóng, áo, túi y tế…" : " Ban Cán sự (Hậu cần) sẽ nhập danh sách.") + "</div>";
    if (T.gn.length) h += '<div class="card"><h2>Giao nhận gần đây</h2><ul class="list">' + T.gn.map(function (g) {
      return '<li><div class="who"><b style="white-space:normal">' + esc(g.ten) + (g.sl ? " ×" + esc(g.sl) : "") + "</b><span>" + esc((g.tu || "Kho") + " → " + (g.den || "Kho")) + " · " + esc(g.luc) + (g.ghiChu ? " · " + esc(g.ghiChu) : "") + "</span></div></li>";
    }).join("") + "</ul></div>";
    if (T.mua.length) h += '<div class="card"><h2>Lịch sử mua dụng cụ (sổ chi)</h2><ul class="list">' + T.mua.map(function (x) {
      return '<li><div class="who"><b style="white-space:normal">' + esc(x.dg || "Mua sắm dụng cụ") + "</b><span>Tháng " + x.m + '</span></div><b class="neg">' + vnd(x.tien) + "</b></li>";
    }).join("") + "</ul></div>";
    el.innerHTML = h;
    var opts = function (val) { return '<option value="">— Trong kho —</option>' + T.nguoi.map(function (n) { return '<option value="' + esc(n.ten) + '"' + (n.ten === val ? " selected" : "") + ">" + esc(n.nick) + "</option>"; }).join(""); };
    function form(x) {
      x = x || { loai: "Bóng", sl: 1, tinhTrang: "Tốt" };
      var box = document.getElementById("tsForm");
      box.innerHTML = '<div class="card"><h2>' + (x.ma ? "Sửa · " + esc(x.ten) : "Thêm tài sản") + '</h2><div class="field"><label>Tên</label><input type="text" id="fTen" value="' + esc(x.ten || "") + '" placeholder="VD: Bóng Trionda"></div>' +
        '<div class="grid2"><div class="field"><label>Loại</label><select id="fLoai">' + T.loai.map(function (l) { return "<option" + (l === x.loai ? " selected" : "") + ">" + l + "</option>"; }).join("") + '</select></div><div class="field"><label>Số lượng</label><input type="number" id="fSl" min="0" value="' + esc(x.sl) + '"></div></div>' +
        '<div class="grid2"><div class="field"><label>Tình trạng</label><select id="fTt">' + T.tinhTrang.map(function (l) { return "<option" + (l === x.tinhTrang ? " selected" : "") + ">" + l + "</option>"; }).join("") + '</select></div><div class="field"><label>Người giữ</label><select id="fGiu">' + opts(x.giu) + "</select></div></div>" +
        '<div class="field"><label>Nơi để</label><input type="text" id="fNoi" value="' + esc(x.noiDe || "") + '" placeholder="VD: cốp xe, nhà Hậu cần"></div>' +
        '<div class="grid2"><div class="field"><label>Ngày mua</label><input type="date" id="fNgay" value="' + esc(x.ngayMua || "") + '"></div><div class="field"><label>Giá mua (đ)</label><input type="number" id="fGia" value="' + esc(x.gia || "") + '"></div></div>' +
        '<div class="field"><label>Ghi chú</label><input type="text" id="fGc" value="' + esc(x.ghiChu || "") + '"></div><button class="btn" id="fLuu">Lưu</button><button class="btn ghost" id="fHuy">Đóng</button></div>';
      box.scrollIntoView({ behavior: "smooth" });
      document.getElementById("fHuy").onclick = function () { box.innerHTML = ""; };
      document.getElementById("fLuu").onclick = function () {
        var v = function (id) { return document.getElementById(id).value; };
        run(this, api("luuTaiSan", { ma: x.ma || "", tenTs: v("fTen"), loai: v("fLoai"), sl: v("fSl"), tinhTrang: v("fTt"), giu: v("fGiu"), noiDe: v("fNoi"), ngayMua: v("fNgay"), gia: v("fGia"), ghiChu: v("fGc") }), "Đã lưu ✅")
          .then(function (r) { S.ts = r; veTs(el); }).catch(function () {});
      };
    }
    var nm = document.getElementById("tsMoi"); if (nm) nm.onclick = function () { form(); };
    el.querySelectorAll("[data-sua]").forEach(function (b) { b.onclick = function () { form(T.ds.filter(function (x) { return x.ma === b.dataset.sua; })[0]); }; });
    el.querySelectorAll("[data-bg]").forEach(function (b) {
      b.onclick = function () {
        var x = T.ds.filter(function (y) { return y.ma === b.dataset.bg; })[0], li = b.closest("li");
        if (li.nextElementSibling && li.nextElementSibling.classList.contains("bgf")) { li.nextElementSibling.remove(); return; }
        var f = document.createElement("li"); f.className = "bgf"; f.style.display = "block";
        f.innerHTML = '<div class="field" style="margin:0"><label>Bàn giao ' + esc(x.ten) + " cho</label><select>" + opts("") + '</select></div><div class="field"><input type="text" placeholder="Ghi chú (VD: sau trận 28/11)"></div><button class="btn">Xác nhận bàn giao</button>';
        li.after(f);
        f.querySelector("button").onclick = function () {
          run(this, api("banGiao", { ma: x.ma, den: f.querySelector("select").value, ghiChu: f.querySelector("input").value }), "Đã bàn giao ✅").then(function (r) { S.ts = r; veTs(el); }).catch(function () {});
        };
      };
    });
  }

  function veVi(el) {
    var v = S.d.vi;
    if (!v) { el.innerHTML = '<div class="card empty">Bạn chưa có trong sổ quỹ tab 2026. Nhờ Thủ quỹ kiểm tra.</div>'; return; }
    var h = "";
    if (v.hanChe) h += '<div class="banner ' + (v.hanChe.muc === "CAM" ? "bad" : "warn") + '"><b>' + (v.hanChe.muc === "CAM" ? "⛔ Đang bị cấm thi đấu" : "⚠️ Đang bị hạn chế: vào sân từ phút 46") + "</b>" + esc(v.hanChe.lyDo) + ". Đóng xong là tự gỡ.</div>";
    else if (!v.quy && !v.phat) h += '<div class="banner ok"><b>✅ Bạn không nợ gì</b>Quỹ T' + v.m + " đã đóng, không nợ phạt. Uy tín!</div>";
    h += '<div class="card"><h2>Quỹ năm 2026<span class="r">' + vnd(v.rate) + '/tháng</span></h2><div class="months">';
    for (var k = 1; k <= 12; k++) {
      var cls = v.thang[k - 1] ? "paid" : (v.noCu.indexOf(k) !== -1 || (k === v.m && v.nay)) ? "owe" : "";
      h += '<div class="mo ' + cls + (k === v.m ? " now" : "") + '">T' + k + "</div>";
    }
    h += '</div><div class="legend"><span><i style="background:#0B3D2E"></i>Đã đóng</span><span><i style="background:#FBF3DF;outline:1px solid #C5A059"></i>Cần đóng</span><span><i style="background:#EFEDE2"></i>Chưa tới / miễn</span></div>' +
      (v.nay && v.day <= 10 ? '<div class="muted" style="margin-top:10px">Hạn đóng quỹ T' + v.m + ": hết ngày 10.</div>" : "") + "</div>";
    if (v.quy || v.phat || v.tamUng) {
      h += '<div class="card"><h2>Đang nợ</h2>' + (v.quy ? '<div class="debt"><span>Quỹ T' + v.quy.thang.join(", T") + "</span><b>" + vnd(v.quy.tien) + "</b></div>" : "") +
        (v.phat ? '<div class="debt"><span>Phạt Sao đỏ</span><b>' + vnd(v.phat) + "</b></div>" : "") +
        (v.tamUng ? '<div class="debt"><span>Tạm ứng chưa hoàn</span><b>' + vnd(v.tamUng) + "</b></div>" : "") + "</div>";
    }
    if (v.quy) h += qrCard("Đóng quỹ T" + v.quy.thang.join(", T"), v.quy.tien, v.quy.nd, v);
    if (v.phatQr) h += qrCard("Nộp phạt Sao đỏ", v.phatQr.tien, v.phatQr.nd, v);
    h += '<div class="card"><h2>Tài khoản quỹ</h2><div class="debt"><span>Ngân hàng</span><b>' + esc(v.nganHang) + '</b></div><div class="debt"><span>Số tài khoản</span><b>' + esc(v.stk) + '</b></div><div class="debt"><span>Chủ tài khoản</span><b>' + esc(v.chuTk) + "</b></div>" +
      '<div class="muted" style="margin-top:8px">Bot tự ghi sổ khi tiền về và báo vào nhóm Zalo.</div></div>';
    el.innerHTML = h;
    el.querySelectorAll("[data-copy]").forEach(function (b) {
      b.onclick = function () { var s = b.dataset.copy; (navigator.clipboard ? navigator.clipboard.writeText(s) : Promise.reject()).then(function () { toast("Đã sao chép nội dung CK"); }, function () { toast(s); }); };
    });
  }
  function qrCard(tieuDe, tien, nd, v) {
    var url = "https://img.vietqr.io/image/" + v.nganHang + "-" + v.stk + "-compact2.png?amount=" + tien + "&addInfo=" + encodeURIComponent(nd) + "&accountName=" + encodeURIComponent(v.chuTk);
    return '<div class="card qr"><h2 style="text-align:left">' + esc(tieuDe) + '<span class="r">' + vnd(tien) + '</span></h2><img src="' + esc(url) + '" alt="Mã QR chuyển khoản ' + esc(tieuDe) + '" loading="lazy">' +
      '<div class="nd"><span class="sp">' + esc(nd) + '</span><button class="btn sm ghost" data-copy="' + esc(nd) + '">Chép</button></div>' +
      '<div class="muted" style="margin-top:8px">Mở app ngân hàng › Quét QR. Số tiền và nội dung đã điền sẵn, giữ nguyên để bot nhận diện.</div></div>';
  }

  // ---------- HỒ SƠ ----------
  function veHoSo(el) {
    var me = S.d.me, cc = me.chuyenCan || {};
    var h = '<div class="card"><div class="prof"><div class="av">' + esc(viet(me.nick)) + '</div><div><div class="big" style="font-size:22px">' + esc(me.nick) + '</div><div class="muted">' + esc(me.ten) + "</div>" +
      '<div style="margin-top:6px">' + (me.roles || []).map(function (r) { return '<span class="pill dark">' + esc(r) + "</span> "; }).join("") + (me.Team ? '<span class="pill">' + esc(me.Team) + "</span>" : "") + "</div></div></div>" +
      '<div class="kv"><div><span>Vị trí</span><b>' + esc(me.viTri || "—") + '</b></div><div><span>Số áo</span><b>' + esc(me["Số áo"] || "—") + "</b></div>" +
      '<div><span>Chuyên cần</span><b>' + (cc.tyLe == null ? "—" : cc.tyLe + "%") + '</b></div><div><span>Số trận có mặt</span><b>' + (cc.tong ? cc.coMat + "/" + cc.tong : "—") + "</b></div></div></div>";
    h += '<div class="card"><h2>Thông tin cá nhân</h2>' +
      f("Biệt danh", "text", me["Biệt danh"]) + '<div class="grid2">' + f("Số áo", "tel", me["Số áo"]) + f("Size áo", "text", me["Size áo"], "S, M, L, XL…") + "</div>" +
      f("SĐT", "tel", me["SĐT"]) + f("Ngày sinh", "date", me["Ngày sinh"]) +
      '<button class="btn" id="luuHs">Lưu thông tin</button></div>';
    h += '<div class="card"><h2>Đổi mã PIN</h2><div class="grid2">' + f("PIN hiện tại", "tel", "", "", "pinCu") + f("PIN mới", "tel", "", "", "pinMoi") + '</div><button class="btn ghost" id="doiPin">Đổi PIN</button></div>' +
      (me.bcs ? '<button class="btn" id="toBcs2" style="margin:0 0 12px">🛡️ Mục Ban Cán sự' + (me.admin ? " · quản trị" : "") + "</button>" : "") +
      '<button class="btn ghost" id="out" style="margin-bottom:12px">Đăng xuất</button>' +
      '<div class="muted" style="text-align:center;font-size:12px">Trạng thái: ' + esc(me.trangThai || "—") + (me["Ngày vào"] ? " · Vào đội " + esc(me["Ngày vào"]) : "") + "</div>";
    el.innerHTML = h;
    function f(lab, type, val, ph, id) {
      return '<div class="field"><label>' + lab + '</label><input type="' + type + '" data-k="' + (id || lab) + '" value="' + esc(val || "") + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : "") + (type === "tel" && /PIN/.test(lab) ? ' inputmode="numeric" maxlength="4"' : "") + "></div>";
    }
    document.getElementById("luuHs").onclick = function () {
      var o = {}; ["Biệt danh", "Số áo", "Size áo", "SĐT", "Ngày sinh"].forEach(function (k) { o[k] = el.querySelector('[data-k="' + k + '"]').value; });
      run(this, api("luuHoSo", o), "Đã lưu ✅").then(function (r) { Object.assign(S.d.me, r); }).catch(function () {});
    };
    document.getElementById("doiPin").onclick = function () {
      run(this, api("doiPin", { pinCu: el.querySelector('[data-k="pinCu"]').value, pinMoi: el.querySelector('[data-k="pinMoi"]').value }), "Đã đổi PIN ✅")
        .then(function (r) { S.token = r.token; store("elp_token", r.token); }).catch(function () {});
    };
    document.getElementById("out").onclick = function () { dangXuat(); S.ds = null; moLogin(); };
    var b2 = document.getElementById("toBcs2"); if (b2) b2.onclick = function () { S.tab = "bcs"; ve(); window.scrollTo(0, 0); };
  }

  // ---------- BAN CÁN SỰ ----------
  function veBcs(el) {
    var me = S.d.me, x = S.d.tran, ch = S.d.cauHinh;
    if (!x) { el.innerHTML = '<div class="card empty">Chưa có trận nào.</div>' + (me.admin ? adminTaoTran() : ""); ganAdmin(el); return; }
    var t = x.tran, tv = x.ds.slice().sort(function (a, b) { return a.nick.localeCompare(b.nick, "vi"); });
    var h = '<div class="card"><h2>Ghi vi phạm · ' + esc(t.ngayVN) + '</h2>' +
      '<div class="field"><label>Lỗi</label><select id="maLoi"><option value="">— Chọn lỗi —</option>' +
      ch.loi.filter(function (l) { return !l.team; }).map(function (l) { return '<option value="' + l.ma + '" data-team="' + (l.team ? 1 : 0) + '">' + esc(l.ten) + " · " + vnd(l.tien) + (l.tuDong ? " (app tự ghi)" : "") + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label>Người / team vi phạm</label><select id="doiTuong"></select></div>' +
      '<div class="field"><label>Ảnh bằng chứng (nếu có)</label><input type="file" id="anh" accept="image/*" capture="environment"><img id="prev" class="photo-prev" hidden alt="Ảnh vừa chụp"></div>' +
      '<div class="field"><label>Ghi chú</label><input type="text" id="ghiChu" maxlength="200" placeholder="VD: mặc áo đỏ, phút 30…"></div>' +
      '<button class="btn" id="ghi">Ghi lỗi</button><div class="muted" style="margin-top:8px">' + (ch.thuNghiem ? "🧪 Đang chạy thử: lỗi chỉ lưu ở tab VI PHẠM, không vào sổ SAO ĐỎ, không tính phạt." : "Lỗi chờ chốt đến 19h thứ 7 rồi tự vào sổ SAO ĐỎ. Thẻ vàng, thẻ đỏ ghi cho team, chia đều cuối mùa.") + "</div></div>";
    h += '<div class="card"><h2>Vi phạm trận này<span class="r">' + (x.loi || []).filter(function (l) { return l.trangThai !== "Hủy"; }).length + " lỗi</span></h2><ul class=\"list\">" +
      (x.loi || []).map(function (l) {
        var huy = l.trangThai === "Chờ chốt" || l.trangThai === "Team – chia cuối mùa";
        return '<li><div class="who"><b>' + esc(l.nick) + " · " + vnd(l.tien) + "</b><span>" + esc(l.loi) + " · " + esc(l.trangThai) + (l.anh ? ' · <a href="' + esc(l.anh) + '" target="_blank" rel="noopener">ảnh</a>' : "") + (l.ghiChu ? " · " + esc(l.ghiChu) : "") + "</span></div>" +
          (huy ? '<button class="btn sm ghost" data-huy="' + esc(l.ma) + '">Hủy</button>' : "") + "</li>";
      }).join("") + "</ul>" + ((x.loi || []).length ? "" : '<div class="empty">Chưa có lỗi nào</div>') + "</div>";
    if (t.homNay && t.trangThai !== "Đã chốt") {
      var chuaCi = tv.filter(function (r) { return !r.checkin; });
      h += '<div class="card"><h2>Check-in hộ</h2><div class="muted">Cho người có mặt mà điện thoại hết pin, không bật được GPS.</div><div class="field"><select id="ciTen"><option value="">— Chọn thành viên —</option>' +
        chuaCi.map(function (r) { return '<option value="' + esc(r.ten) + '">' + esc(r.nick) + "</option>"; }).join("") + '</select></div><button class="btn ghost" id="ciHo">Check-in hộ lúc này</button></div>';
    }
    if (me.admin) h += adminTran(t) + adminTaoTran() + adminTv();
    el.innerHTML = h;

    var selLoi = document.getElementById("maLoi"), selDt = document.getElementById("doiTuong");
    function veDt() {
      var team = selLoi.selectedOptions[0] && selLoi.selectedOptions[0].dataset.team === "1";
      selDt.innerHTML = team ? S.d.cauHinh.teams.map(function (tm) { return "<option>" + esc(tm) + "</option>"; }).join("") : '<option value="">— Chọn thành viên —</option>' + tv.map(function (r) { return '<option value="' + esc(r.ten) + '">' + esc(r.nick) + (r.team ? " · " + esc(r.team) : "") + "</option>"; }).join("");
    }
    selLoi.onchange = veDt; veDt();
    var anhB64 = "";
    document.getElementById("anh").onchange = function (e) {
      var file = e.target.files[0]; if (!file) return;
      nenAnh(file, 1280, 0.72).then(function (b64) { anhB64 = b64; var p = document.getElementById("prev"); p.src = b64; p.hidden = false; }).catch(function () { toast("Không đọc được ảnh", true); });
    };
    document.getElementById("ghi").onclick = function () {
      if (!selLoi.value) return toast("Chọn lỗi trước nhé", true);
      if (!selDt.value) return toast("Chọn người vi phạm", true);
      var b = this;
      run(b, api("ghiLoi", { maTran: t.ma, maLoi: selLoi.value, doiTuong: selDt.value, ghiChu: document.getElementById("ghiChu").value, anh: anhB64 }), "Đã ghi lỗi ✅")
        .then(function (loi) { x.loi = loi; anhB64 = ""; veBcs(el); }).catch(function () {});
    };
    el.querySelectorAll("[data-huy]").forEach(function (b) {
      b.onclick = function () { run(b, api("huyLoi", { ma: b.dataset.huy }), "Đã hủy lỗi").then(function (loi) { x.loi = loi; veBcs(el); }).catch(function () {}); };
    });
    var ciHo = document.getElementById("ciHo");
    if (ciHo) ciHo.onclick = function () {
      var n = document.getElementById("ciTen").value; if (!n) return toast("Chọn thành viên", true);
      run(ciHo, api("checkinHo", { maTran: t.ma, ten2: n }), "Đã check-in hộ ✅").then(function (r) { S.d.tran = r; veBcs(el); }).catch(function () {});
    };
    ganAdmin(el, t);
  }
  function adminTran(t) {
    return '<div class="card"><h2>Quản lý trận · ' + esc(t.ngayVN) + '<span class="r">' + esc(t.trangThai) + '</span></h2><div class="grid2">' +
      '<div class="field"><label>Áo ' + esc(S.d.cauHinh.teams[0]) + '</label><input type="text" id="ao1" value="' + esc(t.ao1) + '" placeholder="Trắng"></div><div class="field"><label>Áo ' + esc(S.d.cauHinh.teams[1]) + '</label><input type="text" id="ao2" value="' + esc(t.ao2) + '" placeholder="Xanh"></div></div>' +
      '<label class="row muted" style="margin-top:8px"><input type="checkbox" id="macDinh"> Dùng làm màu áo mặc định cho các tuần sau</label>' +
      '<button class="btn" id="luuTran">Lưu màu áo</button>' +
      (t.trangThai === "Hủy" ? '<button class="btn ghost" id="moLai">Mở lại trận</button>' : t.trangThai !== "Đã chốt" ? '<button class="btn ghost" id="huyTran">Hủy trận (nghỉ tuần này)</button><button class="btn gold" id="chot">Chốt trận ngay (ghi lỗi vào SAO ĐỎ)</button>' : "") + "</div>";
  }
  function adminTaoTran() {
    return '<div class="card"><h2>Tạo trận khác</h2><div class="muted">Bình thường app tự tạo trận thứ 7 lúc 10h thứ 3. Dùng mục này cho trận bù, giao hữu.</div><div class="field"><input type="date" id="ngayMoi"></div><button class="btn ghost" id="taoTran">Tạo trận</button></div>';
  }
  function adminTv() {
    return '<div class="card"><h2>Thành viên</h2><div class="field"><select id="tvSel"><option value="">— Chọn thành viên để sửa —</option></select></div><div id="tvForm"></div></div>';
  }
  function ganAdmin(el, t) {
    function o(id) { return document.getElementById(id); }
    if (o("luuTran")) o("luuTran").onclick = function () {
      run(this, api("suaTran", { maTran: t.ma, ao1: o("ao1").value, ao2: o("ao2").value, macDinh: o("macDinh").checked }), "Đã lưu").then(function (r) { S.d.tran = r; veBcs(el); }).catch(function () {});
    };
    if (o("huyTran")) o("huyTran").onclick = function () {
      if (!confirm("Hủy trận " + t.ngayVN + "? Không ai bị ghi lỗi vote/check-in cho trận này.")) return;
      run(this, api("suaTran", { maTran: t.ma, trangThai: "Hủy" }), "Đã hủy trận").then(function (r) { S.d.tran = r; veBcs(el); }).catch(function () {});
    };
    if (o("moLai")) o("moLai").onclick = function () { run(this, api("suaTran", { maTran: t.ma, trangThai: "Mở" }), "Đã mở lại").then(function (r) { S.d.tran = r; veBcs(el); }).catch(function () {}); };
    if (o("chot")) o("chot").onclick = function () {
      if (!confirm("Chốt trận " + t.ngayVN + " ngay? App sẽ ghi lỗi vào SAO ĐỎ và báo nhóm Zalo.")) return;
      run(this, api("chotTran", { maTran: t.ma }), "Đã chốt trận ✅").then(function (r) { S.d.tran = r; veBcs(el); }).catch(function () {});
    };
    if (o("taoTran")) o("taoTran").onclick = function () {
      run(this, api("taoTran", { ngay: o("ngayMoi").value }), "Đã tạo trận").then(function () { return taiLai(); }).catch(function () {});
    };
    var sel = o("tvSel"); if (!sel) return;
    (S.tv ? Promise.resolve(S.tv) : api("thanhVien")).then(function (ds) {
      S.tv = ds;
      sel.innerHTML = '<option value="">— Chọn thành viên để sửa —</option>' + ds.map(function (m, i) { return '<option value="' + i + '">' + esc(m.nick) + " · " + esc(m.ten) + (m.trangThai ? " (" + esc(m.trangThai) + ")" : "") + "</option>"; }).join("");
    }).catch(function (e) { toast(e.message, true); });
    sel.onchange = function () { veTvForm(S.tv[+sel.value]); };
  }
  function veTvForm(m) {
    var box = document.getElementById("tvForm"); if (!m) { box.innerHTML = ""; return; }
    function inp(k, type, ph) { return '<div class="field"><label>' + k + '</label><input type="' + (type || "text") + '" data-f="' + k + '" value="' + esc(m[k] || "") + '"' + (ph ? ' placeholder="' + ph + '"' : "") + "></div>"; }
    function sel(k, opts, val) { return '<div class="field"><label>' + k + '</label><select data-f="' + k + '">' + opts.map(function (x) { return "<option" + (x === val ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select></div>"; }
    box.innerHTML = inp("Vai trò", "text", "Thành viên / Sao đỏ / Đội trưởng…") +
      '<div class="muted" style="font-size:12.5px">Nhiều vai trò cách nhau dấu phẩy. Có: ' + esc(S.d.cauHinh.vaiTro.join(", ")) + "</div>" +
      '<div class="grid2">' + sel("Team", [""].concat(S.d.cauHinh.teams), m.Team) + sel("Trạng thái", ["Active", "Inactive", "Left"], m.trangThai) + "</div>" +
      '<div class="grid2">' + sel("Loại", ["Chính thức", "Thử việc", "Danh dự", "Khách mời"], m["Loại"] || "Chính thức") + inp("Số áo", "tel") + "</div>" +
      '<div class="grid2">' + inp("Nghỉ từ", "date") + inp("Nghỉ đến", "date") + "</div>" +
      '<div class="grid2">' + inp("Ngày vào", "date") + inp("Ngày rời", "date") + "</div>" + inp("Ghi chú") +
      '<label class="row muted" style="margin-top:10px"><input type="checkbox" id="resetPin"> Đặt lại PIN (' + (m.coPin ? "đã có PIN" : "chưa tạo PIN") + ")</label>" +
      '<button class="btn" id="luuTv">Lưu thành viên</button>';
    document.getElementById("luuTv").onclick = function () {
      var o = { ten2: m.ten, datLaiPin: document.getElementById("resetPin").checked };
      box.querySelectorAll("[data-f]").forEach(function (e) { if (e.dataset.f === "Trạng thái") o.trangThai = e.value; else o[e.dataset.f] = e.value; });
      run(this, api("suaThanhVien", o), "Đã lưu " + m.nick).then(function (r) { var i = S.tv.indexOf(m); S.tv[i] = r; veTvForm(r); }).catch(function () {});
    };
  }
  function nenAnh(file, max, q) {
    return new Promise(function (ok, no) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        ok(c.toDataURL("image/jpeg", q));
      };
      img.onerror = no; img.src = url;
    });
  }

  // ---------- khởi động ----------
  if (!CFG.API) { $app.innerHTML = '<div class="err">Chưa cấu hình API. Mở file config.js, dán URL web app Apps Script vào mục API.</div>'; return; }
  if (S.token && S.ten) taiLai(true); else moLogin();
})();
