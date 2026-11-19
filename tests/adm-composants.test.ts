// Rendu des composants de l'admin refondu (components/ui/adm) : attributs d'accessibilité et variantes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement as h } from "react";
import { renderToStaticMarkup as html } from "react-dom/server";
import {
  Button, IconButton, Badge, badgeCommande, badgePaiement, Card, CardSection, Divider, KeyValue, SettingsRow, ResourceList,
  TextField, Textarea, Select, Checkbox, Radio, Toggle, Banner, Modal, BottomSheet, Menu, Tooltip, Popover, PageHeader,
  ContextualSaveBar, Timeline, Avatar, Thumbnail, Tabs, SkeletonText, SkeletonTable, SkeletonPage, avatarColor, initials,
} from "@/components/ui/adm";

const noop = () => {};

test("Button : variantes, chargement, lien, désactivé", () => {
  assert.match(html(h(Button, { variant: "primary" }, "Créer")), /bg-\(--color-primary\)/);
  const l = html(h(Button, { loading: true }, "Enregistrer"));
  assert.match(l, /aria-busy="true"/);
  assert.match(l, /disabled=""/);
  assert.match(l, /animate-spin/);
  assert.match(html(h(Button, { href: "/dashboard/commandes" }, "Voir")), /<a [^>]*href="\/dashboard\/commandes"/);
  assert.doesNotMatch(html(h(Button, { href: "/x", disabled: true }, "Voir")), /<a /);
  assert.match(html(h(Button, { disclosure: true }, "Trier")), /<svg/);
});

test("IconButton : nom accessible obligatoire", () => {
  const s = html(h(IconButton, { icon: "x", "aria-label": "Fermer" }));
  assert.match(s, /aria-label="Fermer"/);
  assert.match(s, /size-7/);
});

test("Badge : ton et pastille de progression", () => {
  const s = html(h(Badge, { tone: "attention", progress: "partial", children: "À la livraison" }));
  assert.match(s, /data-tone="attention"/);
  assert.match(s, /data-progress="partial"/);
  assert.doesNotMatch(html(h(Badge, null, "Brouillon")), /data-progress/);
});

test("statuts Axso → badges (§7.2, D22)", () => {
  assert.deepEqual(badgeCommande("tentative_echouee"), { label: "Livraison échouée", tone: "critical", progress: "none" });
  assert.deepEqual(badgeCommande("livree"), { label: "Livrée", tone: "success", progress: "complete" });
  assert.equal(badgeCommande("inconnu").tone, "neutral");
  assert.equal(badgePaiement("pending", "whatsapp_cod").label, "Paiement à la livraison");
  assert.deepEqual(badgePaiement("completed"), { label: "Payé", tone: "success", progress: "complete" });
  assert.equal(badgePaiement("refunding").tone, "warning");
});

test("Card, CardSection, Divider, KeyValue", () => {
  const s = html(h(Card, { title: "Résumé", actions: h(Button, { variant: "plain" }, "Modifier") }, h(KeyValue, { items: [{ label: "Sous-total", value: "10 000 FCFA" }, { label: "Total", value: "12 000 FCFA", strong: true }] })));
  assert.match(s, /<h2[^>]*>Résumé<\/h2>/);
  assert.match(s, /<dt[^>]*>Total<\/dt>/);
  assert.match(html(h(Card, { padding: "none" }, h(CardSection, null, "a"), h(CardSection, null, "b"))), /not-first:border-t/);
  assert.match(html(h(Divider)), /<hr/);
});

test("SettingsRow : lien cliquable avec chevron, ligne statique sans", () => {
  const lien = html(h(ResourceList, null, h(SettingsRow, { icon: "gear", title: "Général", subtitle: "Coordonnées", href: "/dashboard/parametres" })));
  assert.match(lien, /<a [^>]*href="\/dashboard\/parametres"/);
  assert.equal((html(h(SettingsRow, { title: "Fixe", end: "valeur" })).match(/<svg/g) ?? []).length, 0);
});

test("Champs : libellé relié, erreur et aide décrites", () => {
  const s = html(h(TextField, { label: "Nom", error: "Indiquez un nom.", helpText: "Visible par les clients" }));
  const id = s.match(/<label for="([^"]+)"/)![1];
  assert.match(s, new RegExp(`<input[^>]*id="${id}"`));
  assert.match(s, /aria-invalid="true"/);
  assert.match(s, /aria-describedby="[^"]*-err [^"]*-aide"/);
  assert.match(html(h(Textarea, { label: "Note" })), /min-h-\[72px\]/);
  assert.match(html(h(Select, { label: "Pays", options: [{ value: "CM", label: "Cameroun" }] })), /<option value="CM">Cameroun<\/option>/);
});

test("Checkbox (indéterminée), Radio, Toggle", () => {
  assert.match(html(h(Checkbox, { label: "Tout sélectionner", indeterminate: true, readOnly: true })), /aria-checked="mixed"/);
  assert.match(html(h(Radio, { label: "Oui", name: "r" })), /type="radio"/);
  const on = html(h(Toggle, { checked: true, onChange: noop, label: "Activer" }));
  assert.match(on, /role="switch"/);
  assert.match(on, /aria-checked="true"/);
  assert.match(on, /aria-label="Activer"/);
  assert.match(html(h(Toggle, { checked: false, onChange: noop, label: "Activer" })), /aria-checked="false"/);
});

test("Banner : rôle selon le ton, action et fermeture", () => {
  assert.match(html(h(Banner, { tone: "critical", title: "Paiement refusé" })), /role="alert"/);
  const s = html(h(Banner, { tone: "info", action: { content: "Voir", href: "/x" }, onDismiss: noop, dismissLabel: "Fermer" }, "Texte"));
  assert.match(s, /role="status"/);
  assert.match(s, /aria-label="Fermer"/);
});

test("Modal et BottomSheet : <dialog> titré, contenu monté seulement ouvert", () => {
  const ouvert = html(h(Modal, { open: true, onClose: noop, title: "Supprimer ?", footer: h(Button, { variant: "critical" }, "Supprimer") }, "Corps"));
  assert.match(ouvert, /<dialog[^>]*aria-labelledby="[^"]+"/);
  assert.match(ouvert, /Corps/);
  assert.doesNotMatch(html(h(Modal, { open: false, onClose: noop, title: "T", children: "Corps" })), /Corps/);
  assert.match(html(h(BottomSheet, { open: true, onClose: noop, title: "Actions", children: "x" })), /cursor-grab/);
});

test("Menu, Popover, Tooltip", () => {
  const m = html(h(Menu, { items: [{ content: "Dupliquer" }, { content: "Supprimer", destructive: true }, { content: "Archiver", disabled: true }] }));
  assert.match(m, /role="menu"/);
  assert.equal((m.match(/role="menuitem"/g) ?? []).length, 3);
  assert.match(m, /aria-disabled="true"/);
  assert.doesNotMatch(html(h(Popover, { open: false, onClose: noop, activator: h("button", null, "Ouvrir"), children: "Contenu" })), /Contenu/);
  assert.doesNotMatch(html(h(Tooltip, { content: "Aide", children: h("span", null, "?") })), /role="tooltip"/); // délai de 300 ms
});

test("PageHeader : titre, retour, action principale, menu mobile", () => {
  const s = html(h(PageHeader, { icon: "orders", title: "Commandes", backHref: "/dashboard", primaryAction: { content: "Créer une commande" }, secondaryActions: [{ content: "Exporter" }] }));
  assert.match(s, /<h1/);
  assert.match(s, /aria-label="Retour"/);
  assert.match(s, /Créer une commande/);
  assert.match(s, /aria-label="Plus d&#x27;actions"/);
});

test("ContextualSaveBar : visible seulement si modifié", () => {
  assert.match(html(h(ContextualSaveBar, { dirty: true, onSave: noop, onDiscard: noop })), /Modifications non enregistrées/);
  assert.doesNotMatch(html(h(ContextualSaveBar, { dirty: false, onSave: noop, onDiscard: noop })), /role="region"/);
});

test("Timeline, Avatar, Thumbnail, Tabs, Skeleton", () => {
  const t = html(h(Timeline, { items: [{ id: "1", content: "Commande livrée", time: "14:48" }, { id: "2", content: "Commande créée" }] }));
  assert.equal((t.match(/<li/g) ?? []).length, 2);
  assert.match(t, /bg-\(--color-live\)/);
  assert.equal(initials("Awa Diallo Ndiaye"), "AN");
  assert.equal(avatarColor("Awa"), avatarColor("Awa"));
  assert.match(html(h(Avatar, { name: "Awa Diallo" })), /aria-label="Awa Diallo"[^>]*>AD</);
  assert.match(html(h(Thumbnail, { alt: "Robe wax", size: 32 })), /width:32px/);
  const tabs = html(h(Tabs, { tabs: [{ id: "a", label: "Aperçu", href: "?onglet=apercu" }, { id: "m", label: "Messages", href: "?onglet=messages" }], selected: "a" }));
  assert.match(tabs, /aria-current="page"[^>]*>Aperçu/);
  assert.match(html(h(Tabs, { tabs: [{ id: "a", label: "A" }], selected: "a", onSelect: noop })), /aria-selected="true"/);
  assert.equal((html(h(SkeletonTable, {})).match(/border-t/g) ?? []).length, 8);
  assert.equal((html(h(SkeletonText, { lines: 2 })).match(/h-3/g) ?? []).length, 2);
  assert.match(html(h(SkeletonPage, { label: "Chargement" })), /aria-busy="true"/);
});
