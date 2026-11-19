// Kit de l'admin marchand refondu (docs/refonte-admin, D26) — API du masterprompt §7.
// Documentation : docs/refonte-admin/COMPONENTS.md. À utiliser sous un ancêtre .adm (jetons).
export { Button, IconButton, Spinner, buttonClasses, type ButtonProps, type ButtonVariant } from "./Button";
export { Badge, type BadgeTone, type BadgeProgress } from "./Badge";
export { badgeCommande, badgePaiement, type StatutBadge } from "./statuts";
export { Card, CardSection, Divider, KeyValue } from "./Card";
export { SettingsRow, ResourceList, type SettingsRowProps } from "./SettingsRow";
export { Field, TextField, Textarea, Select, Checkbox, Radio, Toggle, type FieldProps } from "./Form";
export { Banner, type BannerProps, type BannerTone } from "./Banner";
export { Modal, BottomSheet, type ModalProps } from "./Overlays";
export { Popover, Menu, Tooltip, type Action } from "./Popover";
export { PageHeader, type PageHeaderProps } from "./PageHeader";
export { ContextualSaveBar, type ContextualSaveBarProps } from "./ContextualSaveBar";
export { admToast, ADM_TOAST_CLASS } from "./toast";
export { Timeline, Avatar, Thumbnail, Tabs, SkeletonText, SkeletonCard, SkeletonTable, SkeletonPage, avatarColor, initials, type TimelineItem, type Tab } from "./Divers";
export { IndexTable, type Column, type IndexTableProps, type Pagination } from "./IndexTable";
export { IndexFilters, useColonnesMasquees, type IndexFiltersProps, type Vue, type Filtre } from "./IndexFilters";
export { MetricsStrip, formatDelta, type Metric, type MetricsStripProps } from "./MetricsStrip";
export { EmptyState, type EmptyStateProps } from "./EmptyState";
export { etatSelection, basculer, basculerTout, lireTri, ecrireTri, trier, majRecherche, type EtatSelection, type Tri } from "./index-regles";
