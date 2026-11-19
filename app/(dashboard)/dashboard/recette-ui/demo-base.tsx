"use client";
// Recette du lot 3 : chaque composant de base et ses états. Données de démonstration locales.
import { useState } from "react";
import {
  Avatar, Badge, Banner, BottomSheet, Button, Card, CardSection, Checkbox, ContextualSaveBar, Divider, IconButton, KeyValue,
  Menu, Modal, PageHeader, Popover, Radio, ResourceList, Select, SettingsRow, SkeletonCard, SkeletonTable, SkeletonText,
  Tabs, TextField, Textarea, Thumbnail, Timeline, Toggle, Tooltip, admToast, badgeCommande, badgePaiement,
  type BadgeProgress, type BadgeTone, type ButtonVariant,
} from "@/components/ui/adm";

const VARIANTES: ButtonVariant[] = ["default", "primary", "plain", "ghost", "tint", "critical"];
const TONS: BadgeTone[] = ["success", "attention", "warning", "critical", "info", "neutral"];
const PROGRES: BadgeProgress[] = ["incomplete", "partial", "complete"];

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="m-0 text-xs font-[650] tracking-wide text-(--color-text-secondary) uppercase">{titre}</h3>
      {children}
    </section>
  );
}

export function DemoBase() {
  const [toggle, setToggle] = useState(true);
  const [modal, setModal] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [menu, setMenu] = useState(false);
  const [nom, setNom] = useState("Maison Awa");
  const dirty = nom !== "Maison Awa";

  return (
    <div className="space-y-10">
      <h2 className="m-0 text-base font-[650] text-(--color-text-strong)">Lot 3 — composants de base</h2>

      <Bloc titre="PageHeader">
        <Card padding="none">
          <div className="px-(--page-padding-x)">
            <PageHeader icon="orders" title="Commande #1205" backHref="/dashboard/recette-ui"
              titleMeta={<><Badge {...badgePaiement("pending", "whatsapp_cod")}>Paiement à la livraison</Badge><span>Aujourd&apos;hui à 14:48</span></>}
              primaryAction={{ content: "Marquer comme livrée" }}
              secondaryActions={[{ content: "Imprimer" }, { content: "Rembourser" }]}
              overflowActions={[{ content: "Dupliquer", icon: "doc" }, { content: "Annuler la commande", destructive: true }]} />
          </div>
        </Card>
      </Bloc>

      <Bloc titre="Button · IconButton">
        <div className="flex flex-wrap items-center gap-2">
          {VARIANTES.map((v) => <Button key={v} variant={v}>{v}</Button>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button icon="plus">Ajouter un produit</Button>
          <Button disclosure>Trier</Button>
          <Button size="sm">Petit</Button>
          <Button variant="primary" loading>Enregistrer</Button>
          <Button loading>Chargement</Button>
          <Button disabled>Désactivé</Button>
          <Button variant="primary" disabled>Désactivé</Button>
          <IconButton icon="dots" aria-label="Plus d'actions" />
          <IconButton icon="x" aria-label="Fermer" loading />
        </div>
      </Bloc>

      <Bloc titre="Badge">
        <div className="flex flex-wrap gap-2">{TONS.map((t) => <Badge key={t} tone={t}>{t}</Badge>)}</div>
        <div className="flex flex-wrap gap-2">{PROGRES.map((p) => <Badge key={p} tone="attention" progress={p}>{p}</Badge>)}<Badge size="sm" tone="info">sm</Badge></div>
        <div className="flex flex-wrap gap-2">
          {["en_attente", "confirmee", "en_preparation", "expediee", "tentative_echouee", "livree", "annulee"].map((s) => {
            const b = badgeCommande(s);
            return <Badge key={s} tone={b.tone} progress={b.progress}>{b.label}</Badge>;
          })}
          {["completed", "pending", "failed", "refunded", "refunding"].map((s) => {
            const b = badgePaiement(s);
            return <Badge key={s} tone={b.tone} progress={b.progress}>{b.label}</Badge>;
          })}
        </div>
      </Bloc>

      <Bloc titre="Card · CardSection · Divider · KeyValue">
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Récapitulatif" actions={<Button variant="plain">Modifier</Button>}>
            <KeyValue items={[{ label: "Sous-total", value: "24 000 FCFA" }, { label: "Livraison", value: "2 000 FCFA" }]} />
            <Divider />
            <KeyValue items={[{ label: "Total", value: "26 000 FCFA", strong: true }]} />
          </Card>
          <Card padding="none">
            <CardSection><strong>Client</strong><div className="text-(--color-text-secondary)">Awa Diallo · +237 6 90 00 00 00</div></CardSection>
            <CardSection><strong>Adresse</strong><div className="text-(--color-text-secondary)">Bonamoussadi, Douala</div></CardSection>
          </Card>
        </div>
        <Card>Une carte qui suit une carte prend 16 px de marge.</Card>
      </Bloc>

      <Bloc titre="SettingsRow · ResourceList">
        <ResourceList>
          <SettingsRow icon="store" title="Général" subtitle="Nom, coordonnées, devise" href="/dashboard/recette-ui" />
          <SettingsRow icon="card" title="Paiements" subtitle="Mobile Money" end={<Badge>Bientôt disponible</Badge>} />
          <SettingsRow icon="bell" title="Notifications" end={<Toggle checked={toggle} onChange={setToggle} label="Notifications" />} />
        </ResourceList>
      </Bloc>

      <Bloc titre="Formulaires">
        <Card>
          <div className="grid gap-3 md:grid-cols-2">
            <TextField label="Nom de la boutique" value={nom} onChange={(e) => setNom(e.target.value)} helpText="Modifiez-le pour voir la barre d'enregistrement." />
            <TextField label="Téléphone" error="Indiquez un numéro à 9 chiffres." defaultValue="6 90" />
            <TextField label="Désactivé" disabled defaultValue="Lecture seule" />
            <Select label="Pays" defaultValue="CM" options={[{ value: "CM", label: "Cameroun" }, { value: "CI", label: "Côte d'Ivoire" }, { value: "SN", label: "Sénégal" }]} />
            <Textarea label="Note interne" placeholder="Visible par votre équipe uniquement" />
          </div>
          <Divider />
          <div className="flex flex-wrap items-center gap-5">
            <Checkbox label="Coché" defaultChecked />
            <Checkbox label="Non coché" />
            <Checkbox label="Indéterminé" indeterminate readOnly />
            <Checkbox label="Désactivé" disabled />
            <Radio name="demo-radio" label="Livraison" defaultChecked />
            <Radio name="demo-radio" label="Retrait" />
            <Toggle checked={toggle} onChange={setToggle} label="Toggle avec libellé" labelHidden={false} />
            <Toggle checked={false} onChange={() => {}} label="Toggle désactivé" disabled />
          </div>
        </Card>
      </Bloc>

      <Bloc titre="ContextualSaveBar">
        <Card padding="none">
          <div className="px-(--page-padding-x) py-2">
            {dirty ? null : <p className="m-0 text-(--color-text-secondary)">Modifiez « Nom de la boutique » ci-dessus : la barre apparaît (et bloque les liens internes).</p>}
            <ContextualSaveBar dirty={dirty} onDiscard={() => setNom("Maison Awa")}
              onSave={() => { setNom("Maison Awa"); admToast("Boutique enregistrée"); }} />
          </div>
        </Card>
      </Bloc>

      <Bloc titre="Banner">
        <Banner tone="info" title="Mobile Money arrive bientôt">Le paiement à la livraison reste disponible. <a href="#">En savoir plus</a></Banner>
        <Banner tone="warning" action={{ content: "Ajouter", onAction: () => {} }}>Ajoutez vos politiques de retour avant de publier.</Banner>
        <Banner tone="critical" onDismiss={() => {}}>Trois livraisons ont échoué aujourd&apos;hui.</Banner>
        <Banner tone="success">Votre boutique est en ligne.</Banner>
      </Bloc>

      <Bloc titre="Overlays : Modal · BottomSheet · Popover/Menu · Tooltip · Toast">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setModal(true)}>Ouvrir la modale</Button>
          <Button onClick={() => setSheet(true)}>Ouvrir la feuille du bas</Button>
          <Popover open={menu} onClose={() => setMenu(false)}
            activator={<Button disclosure aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>Menu</Button>}>
            <Menu items={[{ content: "Renommer la vue", icon: "pen" }, { content: "Dupliquer la vue", icon: "doc" }, { content: "Supprimer la vue", destructive: true }]} onItem={() => setMenu(false)} />
          </Popover>
          <Tooltip content="Unités vendues / unités reçues sur la période"><Button variant="plain">Taux de vente</Button></Tooltip>
          <Button onClick={() => admToast("Commande #1205 marquée comme traitée")}>Toast</Button>
          <Button onClick={() => admToast("3 commandes archivées", { label: "Annuler", onClick: () => {} })}>Toast avec Annuler</Button>
        </div>
        <Modal open={modal} onClose={() => setModal(false)} title="Supprimer 3 produits ?"
          footer={<><Button onClick={() => setModal(false)}>Annuler</Button><Button variant="critical" onClick={() => setModal(false)}>Supprimer</Button></>}>
          <p className="m-0">Cette action est irréversible.</p>
        </Modal>
        <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Actions">
          <Menu items={[{ content: "Imprimer" }, { content: "Rembourser" }]} onItem={() => setSheet(false)} />
        </BottomSheet>
      </Bloc>

      <Bloc titre="Timeline · Avatar · Thumbnail · Tabs">
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Chronologie">
            <Timeline header={<TextField label="Commentaire" labelHidden placeholder="Laisser un commentaire…" />}
              items={[{ id: "3", content: "Commande livrée par Ibrahim", time: "14:48" }, { id: "2", content: "Confirmée par WhatsApp", time: "10:02" }, { id: "1", content: "Commande passée sur la boutique", time: "09:15" }]} />
          </Card>
          <Card title="Avatars et vignettes">
            <div className="flex items-center gap-2">{["Awa Diallo", "Jean Mbarga", "Fatou", "Koffi Mensah"].map((n) => <Avatar key={n} name={n} />)}</div>
            <div className="mt-3 flex items-end gap-2">{([24, 32, 40, 72] as const).map((s) => <Thumbnail key={s} size={s} alt="Produit sans image" />)}</div>
          </Card>
        </div>
        <Tabs selected="apercu" tabs={[{ id: "apercu", label: "Aperçu", href: "#" }, { id: "messages", label: "Messages", href: "#" }, { id: "diffusions", label: "Diffusions", href: "#" }, { id: "parametres", label: "Paramètres", href: "#" }]} />
      </Bloc>

      <Bloc titre="Skeleton">
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <Card><SkeletonText lines={4} /></Card>
        </div>
        <SkeletonTable rows={3} />
      </Bloc>
    </div>
  );
}
