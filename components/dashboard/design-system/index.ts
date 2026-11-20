// Point d'entrée du design system de l'admin marchand (MASTERPROMPT §2).
export { Icon, AxiaMark, type IconName } from "./icons/Icon";
export { EmptyArt, FeedArt, type EmptyIllustration, type FeedIllustration } from "./illustrations/Illustration";
export { Button, IconButton, buttonClass, type ButtonProps, type ButtonVariant } from "./components/Button";
export { Badge, MappedBadge, paymentBadge, fulfillmentBadge, deliveryBadge, canalCommande, paiementCommande, productBadge, discountBadge, recoveryBadge, type BadgeProps } from "./components/Badge";
export { MetricsStrip, Sparkline, Delta, type Metric } from "./components/MetricsStrip";
export { IndexTable, IndexFilters, Checkbox, type IndexColumn, type IndexRow, type IndexView, type BulkAction } from "./components/IndexTable";
export { Modal } from "./components/Modal";
export { Page, PageHeader, Layout, type Action } from "./components/PageHeader";
export { Card, CardSection, Divider, Banner, EmptyState, Toggle, Field, Tabs, SettingsRow } from "./components/primitives";
export * as tokens from "./tokens/tokens";
