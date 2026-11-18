/* App CLB Eleven Park – giai đoạn 1 (vote, check-in GPS, Sao đỏ, ví quỹ, hồ sơ) */
(function () {
  "use strict";
  var CFG = window.ELP_CONFIG || {};
  var S = { ten: store("elp_ten"), token: store("elp_token"), tab: store("elp_tab") || "tran", d: null, ds: null, team: "", tv: null };
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
    return api("tongQuan").then(function (d) { S.d = d; ve(); })
      .catch(function (e) { if (!S.token) moLogin(); else $app.innerHTML = '<div class="err">' + esc(e.message) + '</div><button class="btn" style="margin:14px;width:auto" onclick="location.reload()">Thử lại</button>'; });
  }
  var TIEU_DE = { tran: "Trận đấu", vi: "Ví quỹ", hoso: "Hồ sơ", bcs: "Ban Cán sự" };
  function ve() {
    var d = S.d, me = d.me;
    if (S.tab === "bcs" && !me.bcs) S.tab = "tran";
    var tabs = ["tran", "vi", "hoso"].concat(me.bcs ? ["bcs"] : []);
    $app.innerHTML = '<header class="top"><div class="brand">' + esc((CFG.TEN_DOI || "Eleven Park FC").toUpperCase()) + "</div><h1>" + TIEU_DE[S.tab] +
      '</h1><div class="sub">' + esc(me.nick) + (me.roles && me.roles[0] && me.roles[0] !== "Thành viên" ? " · " + esc(me.roles.join(", ")) : "") +
      '</div><button class="act" id="reload" aria-label="Tải lại">↻ Tải lại</button></header><main id="main"></main>' +
      '<nav class="bot">' + tabs.map(function (t) { return '<button data-t="' + t + '" class="' + (S.tab === t ? "on" : "") + '">' + svg(t) + "<span>" + TIEU_DE[t] + "</span></button>"; }).join("") + "</nav>";
    document.querySelector("nav.bot").onclick = function (e) { var b = e.target.closest("button"); if (b) { S.tab = b.dataset.t; store("elp_tab", S.tab); ve(); window.scrollTo(0, 0); } };
    document.getElementById("reload").onclick = function () { run(this, taiLai(), "Đã cập nhật"); };
    ({ tran: veTran, vi: veVi, hoso: veHoSo, bcs: veBcs })[S.tab](document.getElementById("main"));
  }

  // ---------- TRẬN ĐẤU ----------
  function veTran(el) {
    var x = S.d.tran, vi = S.d.vi, me = S.d.me;
    if (!x) { el.innerHTML = '<div class="card empty">Chưa có lịch thi đấu. Vote mở lúc 10h sáng thứ 3 hằng tuần.</div>'; return; }
    var t = x.tran, toi = x.toi || {}, lech = Date.now() - x.gioServer, now = function () { return Date.now() - lech; };
    var myTeam = me.Team || "";
    var st = t.trangThai === "Hủy" ? "Trận này đã hủy" : t.trangThai === "Đã chốt" ? "Đã chốt điểm danh" :
      t.trangThai === "Khóa" || now() > t.khoaMs ? "Đã khóa vote" : "Khóa vote sau <b id='cd'>" + demNguoc(t.khoaMs - now()) + "</b> (21h thứ 6)";
    var h = '<div class="hero"><div class="lbl" style="color:#C5A059">' + (t.homNay ? "HÔM NAY" : "TRẬN SẮP TỚI") + '</div><div class="when">' + esc(t.ngayVN) + " · " + esc(t.bongLan.replace(":", "h")) + '</div><div class="where">📍 ' + esc(t.san) + " · check-in trước " + esc(t.hanCheckin.slice(0, 5).replace(":", "h")) + "</div>" +
      '<div class="kits"><div class="kit' + (myTeam === "Team 1" ? " me" : "") + '"><b>Team 1</b> · áo ' + esc(t.ao1 || "chưa chốt") + '</div><div class="kit' + (myTeam === "Team 2" ? " me" : "") + '"><b>Team 2</b> · áo ' + esc(t.ao2 || "chưa chốt") + "</div></div>" +
      '<div class="st">' + st + "</div></div>";
    var hc = toi.hanChe;
    if (hc) h += '<div class="banner ' + (hc.muc === "CAM" ? "bad" : "warn") + '"><b>' + (hc.muc === "CAM" ? "⛔ Bạn đang bị cấm thi đấu" : "⚠️ Bạn chỉ được vào sân từ phút 46") + "</b>" + esc(hc.lyDo) + (hc.nhan && hc.muc !== "CAM" && hc.nhan !== "Phút 46" ? " · " + esc(hc.nhan.replace("Phút 46 · ", "")) : "") +
      ' · <a href="#" id="toVi">Đóng ngay</a></div>';

    // vote
    var khoa = t.trangThai !== "Mở" || now() > t.khoaMs, v = toi.vote || "";
    h += '<div class="card"><h2>Vote điểm danh' + (v ? '<span class="r">Đã vote</span>' : "") + '</h2><div class="votes">' +
      vbtn("DUNG_GIO", "Có mặt đúng giờ", "Có mặt trước " + t.hanCheckin.slice(0, 5)) + vbtn("DI_MUON", "Có mặt, đi muộn", "Ghi số phút dự kiến") + vbtn("NGHI", "Nghỉ có lý do", "Ghi lý do") + "</div>" +
      '<div id="vx"></div>' + (khoa ? "" : '<button class="btn" id="luuVote">' + (v ? "Cập nhật vote" : "Gửi vote") + "</button>") +
      (khoa && !v && t.trangThai !== "Hủy" ? '<div class="banner bad" style="margin:12px 0 0"><b>Bạn chưa vote</b>Vote đã khóa, Sao đỏ ghi lỗi Không vote (50k).</div>' : "") + "</div>";
    function vbtn(k, a, b) { return '<button class="vbtn' + (v === k ? " on" : "") + '" data-v="' + k + '"' + (khoa ? " disabled" : "") + '><span class="dot"></span><span>' + a + "<small>" + b + "</small></span></button>"; }

    // check-in
    if (t.trangThai !== "Hủy") {
      h += '<div class="card"><h2>Check-in tại sân</h2>';
      if (toi.checkin) h += '<div class="banner ' + (toi.muon ? "warn" : "ok") + '" style="margin:0"><b>' + (toi.muon ? "⏰ Đã check-in " + esc(toi.checkin) + " · đi muộn" : "✅ Đã check-in " + esc(toi.checkin) + " · đúng giờ") + "</b>" + (toi.hoBoi ? "Check-in hộ bởi " + esc(toi.hoBoi) : "Ghi nhận bằng GPS tại sân") + "</div>";
      else if (t.homNay && t.trangThai !== "Đã chốt") h += '<div class="muted">Đứng trong khu vực sân rồi bấm nút. Hạn đúng giờ: ' + esc(t.hanCheckin) + '.</div><button class="btn gold big" id="ci">📍 Check-in ngay</button>';
      else h += '<div class="muted">Nút check-in mở trong ngày thi đấu, từ 3 tiếng trước giờ bóng lăn.</div>';
      h += "</div>";
    }

    // danh sách
    var ds = x.ds, teams = ["Team 1", "Team 2"], coTeam = ds.some(function (r) { return r.team; });
    if (!S.team) S.team = myTeam || (coTeam ? "Team 1" : "Tất cả");
    var nhom = coTeam ? teams.concat(ds.some(function (r) { return !r.team; }) ? ["Chưa xếp"] : []) : ["Tất cả"];
    if (nhom.indexOf(S.team) === -1) S.team = nhom[0];
    var loc = ds.filter(function (r) { return S.team === "Tất cả" || (S.team === "Chưa xếp" ? !r.team : r.team === S.team); });
    var di = loc.filter(function (r) { return r.vote === "DUNG_GIO" || r.vote === "DI_MUON"; }).length, ci = loc.filter(function (r) { return r.checkin; }).length;
    var chua = loc.filter(function (r) { return !r.vote && r.batBuoc; }).length;
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
    var tv = document.getElementById("toVi"); if (tv) tv.onclick = function (e) { e.preventDefault(); S.tab = "vi"; ve(); };
    el.querySelectorAll("[data-tm]").forEach(function (b) { b.onclick = function () { S.team = b.dataset.tm; veTran(el); }; });
    var cd = document.getElementById("cd");
    if (cd) { clearInterval(veTran._i); veTran._i = setInterval(function () { var c = document.getElementById("cd"); if (!c) return clearInterval(veTran._i); c.textContent = demNguoc(t.khoaMs - now()); }, 30000); }
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

  // ---------- VÍ QUỸ ----------
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
  }

  // ---------- BAN CÁN SỰ ----------
  function veBcs(el) {
    var me = S.d.me, x = S.d.tran, ch = S.d.cauHinh;
    if (!x) { el.innerHTML = '<div class="card empty">Chưa có trận nào.</div>' + (me.admin ? adminTaoTran() : ""); ganAdmin(el); return; }
    var t = x.tran, tv = x.ds.slice().sort(function (a, b) { return a.nick.localeCompare(b.nick, "vi"); });
    var h = '<div class="card"><h2>Ghi vi phạm · ' + esc(t.ngayVN) + '</h2>' +
      '<div class="field"><label>Lỗi</label><select id="maLoi"><option value="">— Chọn lỗi —</option>' +
      ch.loi.map(function (l) { return '<option value="' + l.ma + '" data-team="' + (l.team ? 1 : 0) + '">' + esc(l.ten) + " · " + vnd(l.tien) + (l.tuDong ? " (app tự ghi)" : "") + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label>Người / team vi phạm</label><select id="doiTuong"></select></div>' +
      '<div class="field"><label>Ảnh bằng chứng (nếu có)</label><input type="file" id="anh" accept="image/*" capture="environment"><img id="prev" class="photo-prev" hidden alt="Ảnh vừa chụp"></div>' +
      '<div class="field"><label>Ghi chú</label><input type="text" id="ghiChu" maxlength="200" placeholder="VD: mặc áo đỏ, phút 30…"></div>' +
      '<button class="btn" id="ghi">Ghi lỗi</button><div class="muted" style="margin-top:8px">Lỗi chờ chốt đến 19h thứ 7 rồi tự vào sổ SAO ĐỎ. Thẻ vàng, thẻ đỏ ghi cho team, chia đều cuối mùa.</div></div>';
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
      selDt.innerHTML = team ? '<option>Team 1</option><option>Team 2</option>' : '<option value="">— Chọn thành viên —</option>' + tv.map(function (r) { return '<option value="' + esc(r.ten) + '">' + esc(r.nick) + (r.team ? " · " + esc(r.team) : "") + "</option>"; }).join("");
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
      '<div class="field"><label>Áo Team 1</label><input type="text" id="ao1" value="' + esc(t.ao1) + '" placeholder="Trắng"></div><div class="field"><label>Áo Team 2</label><input type="text" id="ao2" value="' + esc(t.ao2) + '" placeholder="Xanh"></div></div>' +
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
      '<div class="grid2">' + sel("Team", ["", "Team 1", "Team 2"], m.Team) + sel("Trạng thái", ["Active", "Inactive", "Left"], m.trangThai) + "</div>" +
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
