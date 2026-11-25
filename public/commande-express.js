/* Commande Express AXSO : formulaire de commande en 1 écran, payé à la livraison.
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
    ".axce-hp{position:absolute;left:-9999px;opacity:0}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var el = function (tag, attrs, html) { var e = document.createElement(tag); for (var k in attrs || {}) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; };
  var echap = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var piste = function (nom, params) {
    try { if (window.fbq) window.fbq("track", nom, params || {}, params && params.eventID ? { eventID: params.eventID } : undefined); } catch (e) {}
    try { if (window.ttq) window.ttq.track(nom === "Purchase" ? "CompletePayment" : nom, params || {}); } catch (e) {}
    try { (window.dataLayer = window.dataLayer || []).push({ event: "axso_" + nom, value: params && params.value, currency: C.devise }); } catch (e) {}
  };

  var qte = 1, variante = (P.variantes && P.variantes[0]) || null, position = null, ouvert = false;
  var prixUnit = function () { return variante && variante.prix != null ? variante.prix : P.prix; };
  var cleStock = "axso_ce_cle_" + P.id;
  var cle = function () {
    var k = null; try { k = localStorage.getItem(cleStock); } catch (e) {}
    if (!k) { k = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g, ""); try { localStorage.setItem(cleStock, k); } catch (e) {} }
    return k;
  };

  if (C.boutonCollant !== false) {
    var barre = el("div", { class: "axce-barre" });
    var bouton = el("button", { type: "button" }, echap(C.texteBouton || t("commander", "Commander maintenant")));
    bouton.addEventListener("click", ouvrir);
    barre.appendChild(bouton); document.body.appendChild(barre);
  }
  // Tout élément marqué data-axso-commande ouvre aussi le formulaire (bloc du constructeur).
  document.addEventListener("click", function (e) { var c = e.target && e.target.closest && e.target.closest("[data-axso-commande]"); if (c) { e.preventDefault(); ouvrir(); } });

  function ouvrir() {
    if (ouvert) return; ouvert = true;
    piste("InitiateCheckout", { content_ids: [P.id], value: prixUnit(), currency: C.devise });
    var voile = el("div", { class: "axce-voile", role: "dialog", "aria-modal": "true", "aria-label": t("titre", "Commander") });
    var boite = el("div", { class: "axce-boite" });
    var zones = (C.zones || []).map(function (z) { return '<option value="' + echap(z) + '">' + echap(z) + "</option>"; }).join("");
    var vars = (P.variantes || []).map(function (v, i) { return '<option value="' + i + '">' + echap(v.nom + ": " + v.valeur) + (v.prix != null ? " — " + fmt(v.prix) : "") + "</option>"; }).join("");
    boite.innerHTML =
      '<div class="axce-tete">' + (P.image ? '<img src="' + echap(P.image) + '" alt="">' : "") + "<div><b>" + echap(P.nom) + '</b><span class="axce-pu"></span></div><button type="button" class="axce-x" aria-label="' + t("fermer", "Fermer") + '">×</button></div>' +
      '<form novalidate>' +
      (vars ? "<label>" + t("option", "Option") + '</label><select name="variante">' + vars + "</select>" : "") +
      "<label>" + t("quantite", "Quantité") + '</label><div class="axce-qte"><button type="button" data-d="-1" aria-label="-">−</button><b class="axce-n">1</b><button type="button" data-d="1" aria-label="+">+</button></div>' +
      "<label>" + t("nom", "Nom complet") + '</label><input name="nom" autocomplete="name" required>' +
      "<label>" + t("telephone", "Téléphone (WhatsApp de préférence)") + '</label><input name="telephone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="' + echap(C.exempleTelephone || "") + '">' +
      (C.demanderEmail ? "<label>" + t("email", "E-mail (facultatif)") + '</label><input name="email" type="email" inputmode="email" autocomplete="email">' : "") +
      (zones ? "<label>" + t("zone", "Ville ou zone de livraison") + '</label><select name="zone" required><option value="">' + t("choisir", "Choisir…") + "</option>" + zones + "</select>"
             : "<label>" + t("ville", "Ville") + '</label><input name="ville" autocomplete="address-level2" required>') +
      '<div class="axce-ligne"><div><label>' + t("quartier", "Quartier") + '</label><input name="quartier"></div><div><label>' + t("repere", "Repère (facultatif)") + '</label><input name="repere" placeholder="' + t("repereEx", "Ex. face pharmacie") + '"></div></div>' +
      '<button type="button" class="axce-pos">📍 ' + t("position", "Partager ma position (facultatif)") + "</button>" +
      '<input class="axce-hp" name="site" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="axce-total"><span>' + t("total", "Total") + '</span><b class="axce-tt"></b></div><p class="axce-note">' + t("note", "Paiement à la livraison. Frais de livraison selon votre zone.") + "</p>" +
      '<button type="submit" class="axce-envoi">' + t("valider", "Commander · paiement à la livraison") + '</button><p class="axce-err" role="alert" hidden></p></form>';
    voile.appendChild(boite); document.body.appendChild(voile);
    var form = boite.querySelector("form"), err = boite.querySelector(".axce-err"), envoi = boite.querySelector(".axce-envoi");
    var maj = function () { boite.querySelector(".axce-n").textContent = qte; boite.querySelector(".axce-pu").textContent = fmt(prixUnit()); boite.querySelector(".axce-tt").textContent = fmt(prixUnit() * qte); };
    maj();
    var fermer = function () { voile.remove(); ouvert = false; document.removeEventListener("keydown", clavier); };
    var clavier = function (e) { if (e.key === "Escape") fermer(); };
    document.addEventListener("keydown", clavier);
    voile.addEventListener("click", function (e) { if (e.target === voile) fermer(); });
    boite.querySelector(".axce-x").addEventListener("click", fermer);
    boite.querySelectorAll(".axce-qte button").forEach(function (b) { b.addEventListener("click", function () { qte = Math.max(1, Math.min(99, qte + Number(b.getAttribute("data-d")))); maj(); }); });
    var sv = form.querySelector('[name="variante"]'); if (sv) sv.addEventListener("change", function () { variante = P.variantes[Number(sv.value)]; maj(); });
    boite.querySelector(".axce-pos").addEventListener("click", function () {
      var b = this; if (!navigator.geolocation) return;
      b.textContent = t("positionEnCours", "Localisation…");
      navigator.geolocation.getCurrentPosition(function (p) { position = { lat: p.coords.latitude, lng: p.coords.longitude }; b.textContent = "✅ " + t("positionOk", "Position partagée"); }, function () { b.textContent = t("positionKo", "Position refusée : indiquez un repère"); }, { timeout: 10000 });
    });
    setTimeout(function () { var n = form.querySelector('[name="nom"]'); if (n) n.focus(); }, 50);

    form.addEventListener("submit", function (e) {
      e.preventDefault(); err.hidden = true;
      var v = function (n) { var x = form.querySelector('[name="' + n + '"]'); return x ? x.value.trim() : ""; };
      if (v("site")) return; // champ piège : robot
      if (v("nom").length < 2) return erreur(t("errNom", "Indiquez votre nom."));
      if (v("telephone").replace(/\D/g, "").length < 8) return erreur(t("errTel", "Indiquez un numéro de téléphone valide."));
      if (!v("zone") && !v("ville")) return erreur(t("errZone", "Indiquez votre ville ou zone de livraison."));
      envoi.disabled = true; envoi.textContent = t("envoi", "Envoi de la commande…");
      var corps = {
        cle: cle(), produitId: P.id, canal: C.canal || "direct", source: Object.assign({ page: location.href.slice(0, 300) }, src),
        client: { nom: v("nom"), telephone: v("telephone"), email: v("email") || undefined, ville: v("ville") || v("zone"), pays: C.pays },
        items: [{ produitId: P.id, quantite: qte, variante: variante ? variante.nom + ": " + variante.valeur : undefined }],
        zone: v("zone") || undefined, quartier: v("quartier") || undefined, repere: v("repere") || undefined, position: position || undefined,
      };
      var essai = 0;
      (function envoyer() {
        fetch("/api/commande-express/" + encodeURIComponent(C.slug), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps) })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, statut: r.status, d: d }; }); })
          .then(function (x) {
            if (x.statut === 409 && /cours/.test(x.d.error || "") && essai++ < 5) return setTimeout(envoyer, 1500);
            if (!x.ok) { envoi.disabled = false; envoi.textContent = t("valider", "Commander · paiement à la livraison"); return erreur(x.d.error || t("errServeur", "Commande impossible pour le moment.")); }
            try { localStorage.removeItem(cleStock); } catch (e) {}
            piste("Purchase", { content_ids: [P.id], value: x.d.montantTotal, currency: C.devise, eventID: x.d.numero });
            succes(x.d);
          })
          .catch(function () {
            // Réseau coupé : même clé, nouvel essai (jamais de doublon côté serveur).
            if (essai++ < 4) return setTimeout(envoyer, 2000 * essai);
            envoi.disabled = false; envoi.textContent = t("valider", "Commander · paiement à la livraison");
            erreur(t("errReseau", "Connexion interrompue. Vérifiez votre réseau et touchez à nouveau « Commander » : vous ne serez pas débité deux fois."));
          });
      })();
    });
    function erreur(m) { err.textContent = m; err.hidden = false; }
    function succes(d) {
      boite.innerHTML = '<div class="axce-ok"><div style="font-size:44px">✅</div><h3>' + t("merci", "Commande reçue !") + "</h3><p>" +
        t("merciTexte", "Commande n° {0}. La boutique vous contacte pour la livraison. Total à payer à la réception : {1}.").replace("{0}", echap(d.numero)).replace("{1}", fmt(d.montantTotal)) + "</p>" +
        (d.whatsappUrl ? '<a class="axce-wa" href="' + echap(d.whatsappUrl) + '" target="_blank" rel="noopener">' + t("whatsapp", "Envoyer ma commande sur WhatsApp") + "</a>" : "") +
        (d.trackingUrl ? '<a class="axce-suivi" href="' + echap(d.trackingUrl) + '">' + t("suivi", "Suivre ma commande") + "</a>" : "") +
        '<p style="margin-top:14px"><button type="button" class="axce-x" style="width:auto;padding:0 16px">' + t("fermer", "Fermer") + "</button></p></div>";
      boite.querySelector(".axce-x").addEventListener("click", fermer);
    }
  }
})();
