/* Releasit COD AXSO : formulaire de commande en 1 écran, payé à la livraison.
   Script autonome (sans framework), chargé en différé sur la fiche produit. Lit sa configuration
   dans <script id="axso-ce" type="application/json">. Une clé d'idempotence par commande : un double
   toucher ou un réseau qui coupe ne crée jamais deux commandes. */
(function () {
  "use strict";
  var noeud = document.getElementById("axso-ce");
  if (!noeud || window.__axsoCE) return;
  window.__axsoCE = true;
  var C; try { C = JSON.parse(noeud.textContent || "{}"); } catch (e) { return; }
  if (!C || !C.produit || !C.slug) return;
  var P = C.produit, coul = C.couleur || "#0A1A33", L = C.textes || {};
  var t = function (k, d) { return L[k] || d; };

  // Source de la visite (UTM, identifiants de clic), gardée pour la session.
  var SRC = "axso_ce_src", src = {};
  try { src = JSON.parse(sessionStorage.getItem(SRC) || "{}"); } catch (e) {}
  var q = new URLSearchParams(location.search);
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "ttclid", "gclid"].forEach(function (k) { if (q.get(k)) src[k] = q.get(k); });
  if (!src.referent && document.referrer && document.referrer.indexOf(location.host) < 0) src.referent = document.referrer.slice(0, 300);
  try { sessionStorage.setItem(SRC, JSON.stringify(src)); } catch (e) {}

  var fmt = function (n) {
    var sansCentimes = C.devise === "XAF" || C.devise === "XOF";
    try { return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: sansCentimes ? 0 : 2 }).format(n) + " " + (sansCentimes ? "FCFA" : C.devise); } catch (e) { return n + " " + C.devise; }
  };
  var css = ".axce-barre{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:2147483000;display:flex;justify-content:center;pointer-events:none}" +
    ".axce-barre button{pointer-events:auto;width:100%;max-width:520px;height:54px;border:0;border-radius:16px;background:" + coul + ";color:#fff;font:700 16px/1 inherit;font-family:inherit;box-shadow:0 10px 30px rgba(0,0,0,.25);cursor:pointer;animation:axce-p 2.4s ease-in-out infinite}" +
    "@keyframes axce-p{50%{transform:scale(1.02)}}@media (prefers-reduced-motion:reduce){.axce-barre button{animation:none}}" +
    ".axce-voile{position:fixed;inset:0;z-index:2147483001;background:rgba(10,15,25,.55);display:flex;align-items:flex-end;justify-content:center}" +
    "@media (min-width:640px){.axce-voile{align-items:center}}" +
    ".axce-boite{background:#fff;color:#111;width:100%;max-width:480px;max-height:92vh;overflow:auto;border-radius:22px 22px 0 0;padding:20px 18px calc(18px + env(safe-area-inset-bottom));font-family:inherit;box-shadow:0 -10px 40px rgba(0,0,0,.25)}" +
    "@media (min-width:640px){.axce-boite{border-radius:22px}}" +
    ".axce-tete{display:flex;gap:12px;align-items:center;margin-bottom:14px}.axce-tete img{width:56px;height:56px;border-radius:12px;object-fit:cover;background:#f3f3f3}" +
    ".axce-tete b{display:block;font-size:15px;line-height:1.3}.axce-tete span{font-size:14px;color:#555}.axce-x{margin-left:auto;width:40px;height:40px;border:0;background:#f3f3f3;border-radius:12px;font-size:20px;cursor:pointer;color:#111}" +
    ".axce-boite label{display:block;font-size:13px;font-weight:600;margin:10px 0 5px}.axce-boite input,.axce-boite select{width:100%;box-sizing:border-box;height:48px;border:1.5px solid #e3e3e3;border-radius:12px;padding:0 12px;font:16px/1 inherit;font-family:inherit;background:#fff;color:#111}" +
    ".axce-boite input:focus,.axce-boite select:focus{outline:none;border-color:" + coul + "}.axce-ligne{display:flex;gap:8px}.axce-ligne>*{flex:1}" +
    ".axce-qte{display:flex;align-items:center;gap:10px}.axce-qte button{width:44px;height:44px;border-radius:12px;border:1.5px solid #e3e3e3;background:#fff;font-size:20px;cursor:pointer;color:#111}.axce-qte b{min-width:24px;text-align:center;font-size:17px}" +
    ".axce-pos{margin-top:10px;width:100%;height:44px;border-radius:12px;border:1.5px dashed #ccc;background:#fafafa;font:600 14px inherit;font-family:inherit;cursor:pointer;color:#333}" +
    ".axce-total{display:flex;justify-content:space-between;margin:16px 0 4px;font-size:15px}.axce-total b{font-size:17px}.axce-note{font-size:12.5px;color:#666;margin:0 0 12px}" +
    ".axce-envoi{width:100%;height:54px;border:0;border-radius:14px;background:" + coul + ";color:#fff;font:700 16px/1 inherit;font-family:inherit;cursor:pointer}.axce-envoi:disabled{opacity:.6}" +
    ".axce-err{color:#c62828;font-size:13.5px;margin:10px 0 0}.axce-ok{text-align:center;padding:10px 0}.axce-ok h3{margin:10px 0 6px;font-size:20px}.axce-ok p{color:#555;font-size:14.5px;margin:0 0 16px}" +
    ".axce-wa{display:flex;align-items:center;justify-content:center;gap:8px;height:52px;border-radius:14px;background:#1fa855;color:#fff;font-weight:700;text-decoration:none;margin-bottom:10px}.axce-suivi{display:block;color:#333;font-size:14px}" +
    ".axce-hp{position:absolute;left:-9999px;opacity:0}" +
    ".axce-pals{display:grid;gap:8px;margin-top:4px}.axce-pal{position:relative;display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:12px 14px;border:1.5px solid #e3e3e3;border-radius:14px;background:#fff;cursor:pointer;font:inherit;color:#111}" +
    ".axce-pal.on{border-color:" + coul + ";box-shadow:0 0 0 2px " + coul + "22}.axce-pal b{flex:1;font-size:15px}.axce-pal span{font-weight:700}.axce-pal s{color:#888;font-size:12.5px;margin-left:6px}" +
    ".axce-pal i{position:absolute;top:-9px;right:12px;font-style:normal;font-size:11px;font-weight:700;background:" + coul + ";color:#fff;padding:2px 8px;border-radius:99px}.axce-pal em{font-style:normal;font-size:12px;color:#1a7f37;display:block}" +
    ".axce-case{display:flex;align-items:center;gap:10px;margin:10px 0 0;padding:10px 12px;border:1.5px dashed #d6d6d6;border-radius:12px;font-size:14px;cursor:pointer}.axce-case input{width:20px;height:20px;flex:none}.axce-case img{width:40px;height:40px;border-radius:8px;object-fit:cover}" +
    ".axce-up{margin:4px 0 14px;padding:14px;border:1.5px solid " + coul + ";border-radius:16px;text-align:left}.axce-up b{display:block;font-size:15px;margin-bottom:4px}.axce-up p{margin:0 0 10px;font-size:13.5px;color:#555}" +
    ".axce-up button{width:100%;height:46px;border:0;border-radius:12px;background:" + coul + ";color:#fff;font:700 15px inherit;font-family:inherit;cursor:pointer}.axce-code{font-size:13px;color:#1a7f37;margin:8px 0 0}";
  // Modèle de design et animation du bouton choisis dans l'éditeur.
  var F = C.form || {}, M = F.modele;
  if (M) css += ".axce-boite{background:" + M.fond + ";color:" + M.texte + ";box-shadow:" + M.ombre + "}" +
    ".axce-boite input,.axce-boite select,.axce-boite textarea,.axce-qte button,.axce-pal,.axce-x{background:" + M.champ + ";color:" + M.texte + ";border-color:" + M.bordure + ";border-radius:" + M.rayon + "px}" +
    ".axce-envoi,.axce-up button{border-radius:" + M.rayon + "px}.axce-tete span,.axce-note,.axce-ok p,.axce-up p,.axce-suivi,.axce-sous{color:inherit;opacity:.75}.axce-case{border-color:" + M.bordure + "}";
  var anim = { pulse: "axce-p 2.4s ease-in-out infinite", shake: "axce-s 3s ease-in-out infinite", glow: "axce-g 2s ease-in-out infinite", aucune: "none" }[F.animation || "pulse"] || "none";
  css += "@keyframes axce-s{0%,88%,100%{transform:translateX(0)}90%,94%,98%{transform:translateX(-4px)}92%,96%{transform:translateX(4px)}}" +
    "@keyframes axce-g{50%{box-shadow:0 0 0 8px " + coul + "33,0 10px 30px rgba(0,0,0,.25)}}" +
    ".axce-barre button{animation:" + anim + "}@media (prefers-reduced-motion:reduce){.axce-barre button{animation:none}}" +
    ".axce-boite textarea{width:100%;box-sizing:border-box;min-height:80px;border:1.5px solid #e3e3e3;border-radius:12px;padding:10px 12px;font:16px/1.4 inherit;font-family:inherit}" +
    ".axce-sous{margin:-6px 0 10px;font-size:13.5px;color:#555}.axce-cons{font-size:11.5px;color:#888;margin:8px 0 0}.axce-chk{display:flex;gap:10px;align-items:center;font-weight:500!important}.axce-chk input{width:20px!important;height:20px!important}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  // Test A/B du texte du bouton : variante tirée une fois par visiteur, gardée sur cet appareil.
  var groupeAb = "A";
  if (C.ab) { try { groupeAb = localStorage.getItem("axso_ce_ab") || (Math.random() < 0.5 ? "A" : "B"); localStorage.setItem("axso_ce_ab", groupeAb); } catch (e) {} }
  var stat = function (type) {
    try { fetch("/api/commande-express/" + encodeURIComponent(C.slug) + "/vues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stat: type, variante: groupeAb }), keepalive: true }); } catch (e) {}
  };
  stat("affichage");

  var el = function (tag, attrs, html) { var e = document.createElement(tag); for (var k in attrs || {}) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; };
  var echap = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var piste = function (nom, params) {
    try { if (window.fbq) window.fbq("track", nom, params || {}, params && params.eventID ? { eventID: params.eventID } : undefined); } catch (e) {}
    try { if (window.ttq) window.ttq.track(nom === "Purchase" ? "CompletePayment" : nom, params || {}); } catch (e) {}
    try { (window.dataLayer = window.dataLayer || []).push({ event: "axso_" + nom, value: params && params.value, currency: C.devise }); } catch (e) {}
  };

  var qte = 1, variante = (P.variantes && P.variantes[0]) || null, position = null, ouvert = false, ouvertA = 0;
  var O = C.offres || {}, paliers = (O.quantite && O.quantite.paliers) || [], codeSortie = null, vuSortie = false, acceptees = [];
  var prixBase = function () { return variante && variante.prix != null ? variante.prix : P.prix; };
  // Estimation seulement : le serveur recalcule tout (paliers de quantité compris).
  var prixUnit = function () {
    var p = prixBase(), meilleur = null;
    paliers.forEach(function (x) { if (qte >= x.quantite && (!meilleur || x.quantite > meilleur.quantite)) meilleur = x; });
    return meilleur ? Math.min(meilleur.prix, p) : p;
  };
  var vues = function (ids) {
    ids = ids.filter(Boolean); if (!ids.length) return;
    try { fetch("/api/commande-express/" + encodeURIComponent(C.slug) + "/vues", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offres: ids }), keepalive: true }); } catch (e) {}
  };
  var cleStock = "axso_ce_cle_" + P.id;
  var cle = function () {
    var k = null; try { k = localStorage.getItem(cleStock); } catch (e) {}
    if (!k) { k = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g, ""); try { localStorage.setItem(cleStock, k); } catch (e) {} }
    return k;
  };

  var ATTENTE = "axso_ce_attente_" + C.slug;
  function renvoyerAttente() {
    var a = null; try { a = JSON.parse(localStorage.getItem(ATTENTE) || "null"); } catch (e) {}
    if (!a || !a.corps || Date.now() - a.at > 86400000) { try { localStorage.removeItem(ATTENTE); } catch (e) {} return; }
    fetch("/api/commande-express/" + encodeURIComponent(C.slug), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(a.corps) })
      .then(function (r) { if (r.ok || r.status === 403 || r.status === 400) { try { localStorage.removeItem(ATTENTE); localStorage.removeItem(cleStock); } catch (e) {} } })
      .catch(function () {});
  }
  renvoyerAttente(); window.addEventListener("online", renvoyerAttente);

  if (C.boutonCollant !== false) {
    var barre = el("div", { class: "axce-barre" });
    var bouton = el("button", { type: "button" }, echap(C.ab && groupeAb === "B" ? C.ab.texteB : C.texteBouton || t("commander", "Commander maintenant")));
    bouton.addEventListener("click", ouvrir);
    barre.appendChild(bouton); document.body.appendChild(barre);
  }
  // Tout élément marqué data-axso-commande ouvre aussi le formulaire (bloc du constructeur).
  document.addEventListener("click", function (e) { var c = e.target && e.target.closest && e.target.closest("[data-axso-commande]"); if (c) { e.preventDefault(); ouvrir(); } });

  // Champs du formulaire dans l'ordre et avec les libellés de l'éditeur (nom, téléphone, ville toujours présents).
  var CHAMPS = (F.champs && F.champs.length) ? F.champs : [
    { cle: "nom", visible: true }, { cle: "telephone", visible: true }, { cle: "email", visible: !!C.demanderEmail }, { cle: "ville", visible: true },
    { cle: "quartier", visible: true }, { cle: "repere", visible: true }, { cle: "position", visible: true }];
  var lib = function (c, cle, def) { return echap(c.libelle || t(cle, def)); };
  function champsHtml(zones) {
    return CHAMPS.filter(function (c) { return c.visible !== false; }).map(function (c) {
      var r = c.requis ? " required" : "";
      switch (c.cle) {
        case "nom": return "<label>" + lib(c, "nom", "Nom complet") + '</label><input name="nom" autocomplete="name" required>';
        case "telephone": return "<label>" + lib(c, "telephone", "Téléphone (WhatsApp de préférence)") + '</label><input name="telephone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="' + echap(C.exempleTelephone || "") + '">' +
          '<p class="axce-cons">' + t("consentement", "En indiquant votre numéro, vous acceptez que la boutique vous recontacte au sujet de cette commande.") + "</p>";
        case "email": return "<label>" + lib(c, "email", "E-mail (facultatif)") + '</label><input name="email" type="email" inputmode="email" autocomplete="email"' + r + ">";
        case "ville": return zones ? "<label>" + lib(c, "zone", "Ville ou zone de livraison") + '</label><select name="zone" required><option value="">' + t("choisir", "Choisir…") + "</option>" + zones + "</select>"
          : "<label>" + lib(c, "ville", "Ville") + '</label><input name="ville" autocomplete="address-level2" required>';
        case "quartier": return "<label>" + lib(c, "quartier", "Quartier") + '</label><input name="quartier"' + r + ">";
        case "repere": return "<label>" + lib(c, "repere", "Repère (facultatif)") + '</label><input name="repere" placeholder="' + t("repereEx", "Ex. face pharmacie") + '"' + r + ">";
        case "position": return '<button type="button" class="axce-pos">📍 ' + lib(c, "position", "Partager ma position (facultatif)") + "</button>";
      }
      return "";
    }).join("");
  }
  function persoHtml() {
    return (F.perso || []).map(function (c) {
      var n = "p_" + c.id, r = c.requis ? " required" : "";
      if (c.type === "case") return '<label class="axce-chk"><input type="checkbox" name="' + n + '"' + r + ">" + echap(c.libelle) + "</label>";
      if (c.type === "liste") return "<label>" + echap(c.libelle) + '</label><select name="' + n + '"' + r + '><option value="">' + t("choisir", "Choisir…") + "</option>" +
        (c.options || []).map(function (o) { return '<option value="' + echap(o) + '">' + echap(o) + "</option>"; }).join("") + "</select>";
      return "<label>" + echap(c.libelle) + '</label><input name="' + n + '"' + r + ">";
    }).join("");
  }

  function ouvrir() {
    if (ouvert) return; ouvert = true; ouvertA = Date.now();
    stat("ouverture");
    piste("InitiateCheckout", { content_ids: [P.id], value: prixUnit(), currency: C.devise });
    var voile = el("div", { class: "axce-voile", role: "dialog", "aria-modal": "true", "aria-label": t("titre", "Commander") });
    var boite = el("div", { class: "axce-boite" });
    var zones = (C.zones || []).map(function (z) { return '<option value="' + echap(z) + '">' + echap(z) + "</option>"; }).join("");
    var vars = (P.variantes || []).map(function (v, i) { return '<option value="' + i + '">' + echap(v.nom + ": " + v.valeur) + (v.prix != null ? " — " + fmt(v.prix) : "") + "</option>"; }).join("");
    // Offre de quantité : « 1 », puis chaque palier (« 2 pour… »), avec badge et économie.
    var pals = paliers.length ? '<div class="axce-pals">' + [{ quantite: 1, prix: prixBase() }].concat(paliers).map(function (x) {
      var unit = Math.min(x.prix, prixBase()), eco = (prixBase() - unit) * x.quantite;
      return '<button type="button" class="axce-pal" data-q="' + x.quantite + '">' + (x.badge ? "<i>" + echap(x.badge) + "</i>" : "") +
        "<b>" + echap(x.libelle || t("pour", "Pour {0}").replace("{0}", x.quantite)) + (eco > 0 ? "<em>" + t("economie", "Économisez {0}").replace("{0}", fmt(eco)) + "</em>" : "") + "</b>" +
        "<span>" + fmt(unit * x.quantite) + "</span>" + (eco > 0 ? "<s>" + fmt(prixBase() * x.quantite) + "</s>" : "") + "</button>";
    }).join("") + "</div>" : "";
    var cases = (O.cases || []).map(function (c) {
      return '<label class="axce-case"><input type="checkbox" data-offre="' + echap(c.id) + '" data-produit="' + echap(c.produit.id) + '" data-prix="' + c.produit.prix + '">' +
        (c.produit.image ? '<img src="' + echap(c.produit.image) + '" alt="">' : "") + "<span><b>" + echap(c.titre) + "</b> (+" + fmt(c.produit.prix) + ")" + (c.texte ? "<br><small>" + echap(c.texte) + "</small>" : "") + "</span></label>";
    }).join("");
    vues([O.quantite && O.quantite.id].concat((O.cases || []).map(function (c) { return c.id; })));
    boite.innerHTML =
      '<div class="axce-tete">' + (P.image ? '<img src="' + echap(P.image) + '" alt="">' : "") + "<div><b>" + echap(F.titre || P.nom) + '</b><span class="axce-pu"></span></div><button type="button" class="axce-x" aria-label="' + t("fermer", "Fermer") + '">×</button></div>' +
      (F.sousTitre ? '<p class="axce-sous">' + echap(F.sousTitre) + "</p>" : "") +
      '<form novalidate>' +
      (vars ? "<label>" + t("option", "Option") + '</label><select name="variante">' + vars + "</select>" : "") +
      "<label>" + echap(O.quantite && O.quantite.titre || t("quantite", "Quantité")) + "</label>" + (pals || '<div class="axce-qte"><button type="button" data-d="-1" aria-label="-">−</button><b class="axce-n">1</b><button type="button" data-d="1" aria-label="+">+</button></div>') +
      champsHtml(zones) + persoHtml() +
      cases +
      '<input class="axce-hp" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      (codeSortie ? '<p class="axce-code">✅ ' + t("codeApplique", "Code {0} appliqué à votre commande.").replace("{0}", echap(codeSortie)) + "</p>" : "") +
      '<div class="axce-total"><span>' + t("total", "Total") + '</span><b class="axce-tt"></b></div><p class="axce-note">' + t("note", "Paiement à la livraison. Frais de livraison selon votre zone.") + "</p>" +
      '<button type="submit" class="axce-envoi">' + (F.boutonEnvoi ? echap(F.boutonEnvoi) : t("valider", "Commander · paiement à la livraison")) + '</button><p class="axce-err" role="alert" hidden></p></form>';
    voile.appendChild(boite); document.body.appendChild(voile);
    var form = boite.querySelector("form"), err = boite.querySelector(".axce-err"), envoi = boite.querySelector(".axce-envoi");
    // Accessibilité : chaque libellé relié à son champ, erreurs annoncées, focus gardé dans la fenêtre.
    var avant = document.activeElement;
    boite.querySelectorAll("label").forEach(function (l, i) {
      var champ = l.querySelector("input,select") || (l.nextElementSibling && /^(INPUT|SELECT|TEXTAREA)$/.test(l.nextElementSibling.tagName) ? l.nextElementSibling : null);
      if (champ && !l.contains(champ)) { champ.id = champ.id || "axce-c" + i; l.setAttribute("for", champ.id); }
    });
    err.id = "axce-err"; form.setAttribute("aria-describedby", "axce-err");
    voile.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = Array.prototype.filter.call(boite.querySelectorAll("button,input,select,textarea,a[href]"), function (x) { return !x.disabled && x.offsetParent !== null && !x.classList.contains("axce-hp"); });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    var extras = function () { var s = 0; boite.querySelectorAll(".axce-case input:checked").forEach(function (c) { s += Number(c.getAttribute("data-prix")) || 0; }); return s; };
    var maj = function () {
      var n = boite.querySelector(".axce-n"); if (n) n.textContent = qte;
      boite.querySelectorAll(".axce-pal").forEach(function (b) { b.classList.toggle("on", Number(b.getAttribute("data-q")) === qte); });
      boite.querySelector(".axce-pu").textContent = fmt(prixUnit()); boite.querySelector(".axce-tt").textContent = fmt(prixUnit() * qte + extras());
    };
    maj();
    boite.querySelectorAll(".axce-pal").forEach(function (b) { b.addEventListener("click", function () { qte = Number(b.getAttribute("data-q")); maj(); }); });
    boite.querySelectorAll(".axce-case input").forEach(function (c) { c.addEventListener("change", maj); });
    var fait = false;
    var fermer = function (force) {
      // Offre à la fermeture (une fois par visite) : code promo proposé avant de partir.
      if (force !== true && !fait && O.sortie && !vuSortie) { vuSortie = true; return sortie(); }
      voile.remove(); ouvert = false; document.removeEventListener("keydown", clavier);
      try { if (avant && avant.focus) avant.focus(); } catch (e) {}
    };
    function sortie() {
      vues([O.sortie.id]);
      boite.innerHTML = '<div class="axce-ok"><div style="font-size:40px">🎁</div><h3>' + t("attendre", "Attendez !") + "</h3><p><b>" + echap(O.sortie.titre) + "</b>" + (O.sortie.texte ? "<br>" + echap(O.sortie.texte) : "") + "</p>" +
        '<div class="axce-up" style="border:0;padding:0"><button type="button" class="axce-oui">' + t("profiter", "Profiter de l'offre") + "</button></div>" +
        '<button type="button" class="axce-x" style="width:auto;padding:0 16px">' + t("nonMerci", "Non merci") + "</button></div>";
      boite.querySelector(".axce-oui").addEventListener("click", function () { codeSortie = O.sortie.code; acceptees.push(O.sortie.id); fermer(true); ouvrir(); });
      boite.querySelector(".axce-x").addEventListener("click", function () { fermer(true); });
    }
    var clavier = function (e) { if (e.key === "Escape") fermer(); };
    document.addEventListener("keydown", clavier);
    voile.addEventListener("click", function (e) { if (e.target === voile) fermer(); });
    boite.querySelector(".axce-x").addEventListener("click", fermer);
    boite.querySelectorAll(".axce-qte button").forEach(function (b) { b.addEventListener("click", function () { qte = Math.max(1, Math.min(99, qte + Number(b.getAttribute("data-d")))); maj(); }); });
    var sv = form.querySelector('[name="variante"]'); if (sv) sv.addEventListener("change", function () { variante = P.variantes[Number(sv.value)]; maj(); });
    var bPos = boite.querySelector(".axce-pos");
    if (bPos) bPos.addEventListener("click", function () {
      var b = this; if (!navigator.geolocation) return;
      b.textContent = t("positionEnCours", "Localisation…");
      navigator.geolocation.getCurrentPosition(function (p) { position = { lat: p.coords.latitude, lng: p.coords.longitude }; b.textContent = "✅ " + t("positionOk", "Position partagée"); }, function () { b.textContent = t("positionKo", "Position refusée : indiquez un repère"); }, { timeout: 10000 });
    });
    setTimeout(function () { var n = form.querySelector('[name="nom"]'); if (n) n.focus(); }, 50);
    var capture = null, captureEnvoyee = "";
    form.addEventListener("input", function () {
      clearTimeout(capture);
      capture = setTimeout(function () {
        var nom = (form.querySelector('[name="nom"]') || {}).value || "", tel = (form.querySelector('[name="telephone"]') || {}).value || "";
        if (nom.trim().length < 2 || tel.replace(/D/g, "").length < 8 || captureEnvoyee === tel + nom) return;
        captureEnvoyee = tel + nom;
        try { fetch("/api/commande-express/" + encodeURIComponent(C.slug) + "/abandon", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cle: cle(), nom: nom.trim(), telephone: tel, pays: C.pays, produitId: P.id, quantite: qte, montant: prixUnit() * qte }), keepalive: true }); } catch (e) {}
      }, 1500);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault(); err.hidden = true;
      var v = function (n) { var x = form.querySelector('[name="' + n + '"]'); return x ? x.value.trim() : ""; };
      if (v("site")) return; // champ piège : robot
      if (v("nom").length < 2) return erreur(t("errNom", "Indiquez votre nom."));
      if (v("telephone").replace(/\D/g, "").length < 8) return erreur(t("errTel", "Indiquez un numéro de téléphone valide."));
      if (!v("zone") && !v("ville")) return erreur(t("errZone", "Indiquez votre ville ou zone de livraison."));
      var manque = CHAMPS.filter(function (c) { return c.visible !== false && c.requis && ["email", "quartier", "repere"].indexOf(c.cle) >= 0 && !v(c.cle); })[0];
      if (manque) return erreur(t("errChamp", "Champ obligatoire : {0}").replace("{0}", manque.libelle || manque.cle));
      var reponses = {}, persoManque = null;
      (F.perso || []).forEach(function (c) {
        var x = form.querySelector('[name="p_' + c.id + '"]'); if (!x) return;
        var val = c.type === "case" ? x.checked : x.value.trim();
        if (c.requis && !val && !persoManque) persoManque = c;
        reponses[c.id] = val;
      });
      if (persoManque) return erreur(t("errChamp", "Champ obligatoire : {0}").replace("{0}", persoManque.libelle));
      envoi.disabled = true; envoi.textContent = t("envoi", "Envoi de la commande…");
      var corps = {
        cle: cle(), jeton: C.jeton, duree: Date.now() - ouvertA, site: v("site"), champs: reponses, variante: C.ab ? groupeAb : undefined, produitId: P.id, canal: C.canal || "direct", source: Object.assign({ page: location.href.slice(0, 300) }, src),
        client: { nom: v("nom"), telephone: v("telephone"), email: v("email") || undefined, ville: v("ville") || v("zone"), pays: C.pays },
        items: [{ produitId: P.id, quantite: qte, variante: variante ? variante.nom + ": " + variante.valeur : undefined }].concat(
          Array.prototype.map.call(boite.querySelectorAll(".axce-case input:checked"), function (c) { return { produitId: c.getAttribute("data-produit"), quantite: 1 }; })),
        codePromo: codeSortie || undefined,
        offres: acceptees.concat(Array.prototype.map.call(boite.querySelectorAll(".axce-case input:checked"), function (c) { return c.getAttribute("data-offre"); })).concat(paliers.length && qte > 1 && O.quantite ? [O.quantite.id] : []),
        zone: v("zone") || undefined, quartier: v("quartier") || undefined, repere: v("repere") || undefined, position: position || undefined,
      };
      var essai = 0;
      (function envoyer() {
        fetch("/api/commande-express/" + encodeURIComponent(C.slug), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, statut: r.status, d: d }; }); })
          .then(function (x) {
            if (x.statut === 409 && /cours/.test(x.d.error || "") && essai++ < 5) return setTimeout(envoyer, 1500);
            if (!x.ok) { envoi.disabled = false; envoi.textContent = (F.boutonEnvoi ? echap(F.boutonEnvoi) : t("valider", "Commander · paiement à la livraison")); return erreur(x.d.error || t("errServeur", "Commande impossible pour le moment.")); }
            try { localStorage.removeItem(cleStock); } catch (e) {}
            try { localStorage.removeItem(ATTENTE); } catch (e) {}
            piste(C.modePurchase === "confirmation" ? "Lead" : "Purchase", { content_ids: [P.id], value: x.d.montantTotal, currency: C.devise, eventID: x.d.numero });
            succes(x.d);
          })
          .catch(function () {
            // Réseau coupé : même clé, nouvel essai (jamais de doublon côté serveur).
            if (essai++ < 4) return setTimeout(envoyer, 2000 * essai);
            envoi.disabled = false; envoi.textContent = (F.boutonEnvoi ? echap(F.boutonEnvoi) : t("valider", "Commander · paiement à la livraison"));
            try { localStorage.setItem(ATTENTE, JSON.stringify({ at: Date.now(), corps: corps })); } catch (e) {}
            erreur(t("hors", "Pas de réseau : votre commande partira dès que la connexion revient."));
          });
      })();
    });
    function erreur(m) { err.textContent = m; err.hidden = false; }
    function succes(d) {
      fait = true;
      var up = O.apresAchat;
      boite.innerHTML = '<div class="axce-ok"><div style="font-size:44px">✅</div><h3>' + t("merci", "Commande reçue !") + '</h3><p class="axce-msg">' +
        (F.succes ? echap(F.succes) : t("merciTexte", "Commande n° {0}. La boutique vous contacte pour la livraison. Total à payer à la réception : {1}.")).replace("{0}", echap(d.numero)).replace("{1}", fmt(d.montantTotal)) + "</p>" +
        // Ajout en 1 clic : même commande, même livraison, sans rien ressaisir.
        (up && d.jetonAjout ? '<div class="axce-up">' + (up.produit.image ? '<img src="' + echap(up.produit.image) + '" alt="" style="width:100%;max-height:160px;object-fit:cover;border-radius:12px;margin-bottom:10px">' : "") +
          "<b>" + echap(up.titre) + "</b><p>" + echap(up.texte || up.produit.nom) + " · " + fmt(up.produit.prix) + '</p><button type="button" class="axce-ajout">' + t("ajoutUnClic", "Ajouter en 1 clic") + "</button></div>" : "") +
        (d.whatsappUrl ? '<a class="axce-wa" href="' + echap(d.whatsappUrl) + '" target="_blank" rel="noopener">' + t("whatsapp", "Envoyer ma commande sur WhatsApp") + "</a>" : "") +
        (d.trackingUrl ? '<a class="axce-suivi" href="' + echap(d.trackingUrl) + '">' + t("suivi", "Suivre ma commande") + "</a>" : "") +
        '<p style="margin-top:14px"><button type="button" class="axce-x" style="width:auto;padding:0 16px">' + t("fermer", "Fermer") + "</button></p></div>";
      boite.querySelector(".axce-x").addEventListener("click", fermer);
      var bAjout = boite.querySelector(".axce-ajout");
      if (bAjout) {
        vues([up.id]);
        bAjout.addEventListener("click", function () {
          bAjout.disabled = true; bAjout.textContent = t("envoi", "Envoi…");
          fetch("/api/commande-express/" + encodeURIComponent(C.slug) + "/ajout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commandeId: d.commandeId, jeton: d.jetonAjout, offreId: up.id }) })
            .then(function (r) { return r.json().then(function (x) { return { ok: r.ok, x: x }; }); })
            .then(function (r) {
              var bloc = bAjout.parentNode;
              if (!r.ok) { bloc.innerHTML = "<p>" + echap(r.x.error || t("errServeur", "Commande impossible pour le moment.")) + "</p>"; return; }
              piste("Purchase", { content_ids: [up.produit.id], value: up.produit.prix, currency: C.devise, eventID: d.numero + "-ajout" });
              bloc.innerHTML = "<b>✅ " + t("ajoutOk", "Ajouté à votre commande. Nouveau total : {0}.").replace("{0}", fmt(r.x.montantTotal)) + "</b>";
            })
            .catch(function () { bAjout.disabled = false; bAjout.textContent = t("ajoutUnClic", "Ajouter en 1 clic"); });
        });
      }
    }
  }
})();
