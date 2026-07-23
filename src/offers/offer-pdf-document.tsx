import React from "react";
import path from "path";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import parse, { domToReact, type DOMNode, Element } from "html-react-parser";
import type { OfferPdfRequest, OfferPositionDto } from "./dto/offer-pdf-request.dto";
import { PDF_PRODUCER } from "./build-info";

// Local TTF fonts — no network dependency, no CDN hang on first render.
// process.cwd() == project root both in dev (bun src/main.ts) and prod (bun dist/main.js).
const FONT_DIR = path.join(process.cwd(), "assets", "fonts");

Font.register({
  family: "Roboto",
  fonts: [
    { src: path.join(FONT_DIR, "Roboto-Regular.ttf"), fontWeight: 400 },
    { src: path.join(FONT_DIR, "Roboto-Italic.ttf"),  fontWeight: 400, fontStyle: "italic" },
    { src: path.join(FONT_DIR, "Roboto-Medium.ttf"),  fontWeight: 700 },
    // bold-italic maps to bold — prevents "could not resolve" when html has <strong><em>
    { src: path.join(FONT_DIR, "Roboto-Medium.ttf"),  fontWeight: 700, fontStyle: "italic" },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const BLUE = "#134F78";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Roboto", color: "#000" },
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    width: "100%",
  },
  logoBox: { width: 150, height: 60, alignItems: "flex-end", justifyContent: "flex-start" },
  logoImage: { maxWidth: 250, maxHeight: 100, objectFit: "contain", objectPosition: "right" },
  companyNameFallback: { fontSize: 16, fontWeight: 700, color: BLUE, textAlign: "right" },
  senderAddress: { fontSize: 7, width: "100%", marginTop: 10, paddingLeft: 25 },
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingLeft: 25,
    marginBottom: 20,
    width: "100%",
  },
  customerCol: { width: "50%" },
  customerName: { fontSize: 11, fontWeight: 700, marginBottom: 2 },
  customerDetail: { fontSize: 10, marginBottom: 1 },
  metaCol: { width: "50%", marginLeft: 120 },
  metaRow: { flexDirection: "row", marginBottom: 2, fontSize: 9, alignItems: "flex-start" },
  metaLabel: { width: 60 },
  metaValue: { flex: 1, fontSize: 9 },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    borderBottom: "0.5pt solid #eee",
    paddingBottom: 10,
  },
  titleLabel: { fontSize: 14, fontWeight: 700 },
  titleNumber: { fontSize: 14, marginLeft: 5, fontWeight: 700 },
  vortextStyle: { marginBottom: 15, lineHeight: 0.8 },
  nachtextStyle: { marginTop: 20, lineHeight: 0.8 },
  table: { marginTop: 5, width: "100%" },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1pt solid #000",
    paddingBottom: 3,
    fontWeight: 700,
    fontSize: 9,
  },
  positionMainRow: { flexDirection: "row", paddingTop: 5, alignItems: "flex-start", fontSize: 9 },
  // Column (block) container — NOT flexDirection:row — so long descriptions/lists
  // paginate across pages instead of being clipped. Indent via padding, not a spacer.
  descriptionBlock: { paddingLeft: 105, paddingRight: 140, paddingBottom: 1, borderBottom: "0.5pt solid #eee" },
  colNr: { width: 30 },
  colMe: { width: 30 },
  colEinheit: { width: 45 },
  colDesc: { flex: 1, paddingRight: 10 },
  colPrice: { width: 70, textAlign: "right" },
  colTotal: { width: 70, textAlign: "right" },
  articleName: { fontWeight: 700, marginBottom: 2 },
  titleRow: { marginTop: 5, flexDirection: "row" },
  titleNr: { fontSize: 10, fontWeight: 700, width: 30 },
  titleContent: { fontSize: 10, fontWeight: 700, marginLeft: 75 },
  titleTotalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: "4 5",
    marginBottom: 5,
    borderBottom: "0.5pt solid #eee",
  },
  titleTotalText: { fontSize: 9, fontWeight: 700, fontStyle: "italic" },
  summarySection: { marginTop: 20, paddingTop: 10, borderTop: "1pt solid #000", paddingLeft: 200 },
  summaryRow: { flexDirection: "row", marginBottom: 5, fontSize: 10 },
  summaryNr: { width: 30 },
  summaryName: { flex: 1 },
  summaryAmount: { width: 100, textAlign: "right" },
  summaryLine: { borderBottom: "0.5pt solid #000", marginBottom: 10, marginTop: 5 },
  totalsSection: { marginTop: 15, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", width: 180, justifyContent: "flex-end", paddingVertical: 2 },
  totalLabel: { textAlign: "right", paddingRight: 10, flex: 1 },
  totalVal: { textAlign: "right", width: 60 },
  bruttoRow: { borderTop: "1pt solid #000", marginTop: 4, paddingTop: 4, fontWeight: 700, fontSize: 11 },
  bold: { fontWeight: 700 },
  italic: { fontStyle: "italic" },
  underline: { textDecoration: "underline" },
  paragraph: { fontSize: 9, lineHeight: 1.2, marginBottom: 2, marginTop: 0 },
  liItem: { fontSize: 9, lineHeight: 1.2, marginBottom: 2 },
  listContainer: { marginVertical: 2 },
  bullet: { fontSize: 9 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: "0.5pt solid #eee",
    paddingTop: 5,
    fontSize: 9,
    color: "grey",
  },
});

// --- HTML → react-pdf ---

const hasRenderableContent = (nodes: any[] = []): boolean => {
  for (const node of nodes) {
    if (!node) continue;
    if (node.type === "text" && typeof node.data === "string") {
      if (node.data.trim().length > 0) return true;
      continue;
    }
    if (node.name === "br") return true;
    if (Array.isArray(node.children) && hasRenderableContent(node.children)) return true;
  }
  return false;
};

// Block-level tags treated like <p>. Anything not converted to a react-pdf
// primitive (View/Text) is passed through as a raw DOM element, which react-pdf
// cannot lay out or paginate — it silently clips. Handling these here is what
// keeps long <div>-based descriptions flowing across pages.
const BLOCK_TAGS = new Set([
  "div", "section", "article", "header", "footer", "blockquote",
  "h1", "h2", "h3", "h4", "h5", "h6",
]);

// react-pdf forbids a bare string directly inside a <View>; wrap any string
// child in <Text>. Element children pass through untouched.
const wrapStrings = (children: React.ReactNode): React.ReactNode => {
  const arr = Array.isArray(children) ? children : [children];
  return arr.map((c, i) => (typeof c === "string" ? <Text key={i}>{c}</Text> : c));
};

const hasBlockChild = (nodes: any[] = []): boolean =>
  nodes.some(
    (c) => c && c.name &&
      (c.name === "p" || c.name === "ul" || c.name === "ol" || BLOCK_TAGS.has(c.name)),
  );

const HtmlText = ({ html, preserveEmptyLines = false }: { html: string; preserveEmptyLines?: boolean }) => {
  if (!html) return null;

  const cleanHtml = preserveEmptyLines
    ? html.replace(/>\s+</g, "><").trim()
    : html.replace(/<p><\/p>/g, "").replace(/>\s+</g, "><").trim();

  const options = {
    replace: (domNode: DOMNode) => {
      if (domNode instanceof Element) {
        if (domNode.name === "p" || BLOCK_TAGS.has(domNode.name)) {
          const isInsideLi = domNode.parent && (domNode.parent as any).name === "li";
          if (isInsideLi) return <>{domToReact(domNode.children as DOMNode[], options)}</>;
          if (hasBlockChild(domNode.children as any[])) {
            return <View style={styles.paragraph}>{wrapStrings(domToReact(domNode.children as DOMNode[], options))}</View>;
          }
          const isHeading = /^h[1-6]$/.test(domNode.name);
          const paragraphContent = domToReact(domNode.children as DOMNode[], options);
          const hasVisibleText = hasRenderableContent(domNode.children as any[]);
          return (
            <View style={styles.paragraph}>
              <Text style={isHeading ? styles.bold : undefined}>{preserveEmptyLines ? (hasVisibleText ? paragraphContent : " ") : paragraphContent}</Text>
            </View>
          );
        }
        if (domNode.name === "ul" || domNode.name === "ol") {
          return <View style={styles.listContainer}>{domToReact(domNode.children as DOMNode[], options)}</View>;
        }
        if (domNode.name === "li") {
          const isOrdered = domNode.parent && (domNode.parent as any).name === "ol";
          const index = domNode.parent
            ? domNode.parent.children.filter((c) => (c as any).name === "li").indexOf(domNode) + 1
            : 1;
          // Bullet inlined into a single column <Text> (no flexDirection:row, no
          // wrap={false}) so a long item breaks across pages instead of being clipped.
          return (
            <View style={styles.liItem}>
              <Text>
                <Text style={styles.bullet}>{isOrdered ? `${index}.  ` : "•  "}</Text>
                {domToReact(domNode.children as DOMNode[], options)}
              </Text>
            </View>
          );
        }
        if (domNode.name === "strong" || domNode.name === "b")
          return <Text style={styles.bold}>{domToReact(domNode.children as DOMNode[], options)}</Text>;
        if (domNode.name === "em" || domNode.name === "i")
          return <Text style={styles.italic}>{domToReact(domNode.children as DOMNode[], options)}</Text>;
        if (domNode.name === "u")
          return <Text style={styles.underline}>{domToReact(domNode.children as DOMNode[], options)}</Text>;
        if (domNode.name === "br") return <Text>{"\n"}</Text>;
      }
    },
  };

  // Plain-text fields (no HTML tags) come back from parse() as bare strings.
  // react-pdf forbids a raw string directly inside <View>, so wrap any
  // top-level string child in <Text>. Element nodes pass through untouched.
  const parsed = parse(cleanHtml, options);
  const nodes = Array.isArray(parsed) ? parsed : [parsed];
  return (
    <View>
      {nodes.map((node, i) =>
        typeof node === "string" ? <Text key={i}>{node}</Text> : node,
      )}
    </View>
  );
};

// --- formatters ---

const fmt = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const fmtNum = new Intl.NumberFormat("de-DE");
const formatCurrency = (v: number | null | undefined) => (v == null ? "" : fmt.format(v));
const formatNumber = (v: number | null | undefined) => (v == null ? "" : fmtNum.format(v));
const nz = (s: string | null | undefined) => s ?? "";

// --- position row ---

const PositionBlock = ({ position, idx, isFirst }: { position: OfferPositionDto; idx: number; isFirst: boolean }) => (
  <View key={idx}>
    <View style={styles.positionMainRow} wrap={false}>
      <Text style={styles.colNr}>{(idx + 1).toString().padStart(3, "0")}</Text>
      <Text style={styles.colMe}>{formatNumber(position.quantity)}</Text>
      <Text style={styles.colEinheit}>{nz(position.unit)}</Text>
      <View style={styles.colDesc}>
        {!!position.itemName && <Text style={styles.articleName}>{position.itemName}</Text>}
      </View>
      <Text style={styles.colPrice}>{formatCurrency(position.sellingPrice)}</Text>
      <Text style={styles.colTotal}>{formatCurrency(position.positionSumme)}</Text>
    </View>
    {(position.bigText || position.shortText) && (
      <View style={styles.descriptionBlock}>
        {!!position.bigText && <HtmlText html={position.bigText} />}
        {!!position.shortText && <HtmlText html={position.shortText} />}
      </View>
    )}
  </View>
);

// --- main document ---

export const OfferPdfDocument = ({ request }: { request: OfferPdfRequest }) => {
  const { company, offer } = request;

  return (
    <Document producer={PDF_PRODUCER} creator={PDF_PRODUCER}>
      <Page size="A4" style={styles.page}>
        {/* ── HEADER ── */}
        <View style={{ marginBottom: 20 }}>
          <View style={styles.topSection}>
            <View style={{ width: "60%" }} />
            <View style={styles.logoBox}>
              {company.logoBase64 ? (
                <Image src={company.logoBase64} style={styles.logoImage} />
              ) : (
                <Text style={styles.companyNameFallback}>{company.name}</Text>
              )}
            </View>
          </View>

          <Text style={styles.senderAddress}>
            {[company.name, `${nz(company.street)} ${nz(company.houseNumber)}`.trim(), `${nz(company.zipCode)} ${nz(company.city)}`.trim()]
              .filter(Boolean)
              .join(", ")}
          </Text>

          {/* ── RECIPIENT + META ── */}
          <View style={styles.infoSection}>
            <View style={styles.customerCol}>
              <Text style={styles.customerName}>
                {`${nz(offer.recipient.forename)} ${nz(offer.recipient.lastname)}`.trim()}
              </Text>
              <Text style={styles.customerDetail}>
                {`${nz(offer.recipient.street)} ${nz(offer.recipient.houseNr)}`.trim()}
              </Text>
              <Text style={styles.customerDetail}>
                {`${nz(offer.recipient.plz)} ${nz(offer.recipient.ort)}`.trim()}
              </Text>
            </View>
            <View style={styles.metaCol}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Datum:</Text>
                <Text style={styles.metaValue}>{offer.date}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Bearbeiter:</Text>
                <Text style={styles.metaValue}>{nz(offer.employeeName)}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Telefon:</Text>
                <Text style={styles.metaValue}>{nz(company.phone)}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Mail:</Text>
                <Text style={styles.metaValue}>{nz(company.email)}</Text>
              </View>
            </View>
          </View>

          {/* ── TITLE ── */}
          <View style={styles.titleContainer}>
            <Text style={styles.titleLabel}>Angebot</Text>
            <Text style={styles.titleNumber}>{offer.offerNumber}</Text>
          </View>
        </View>

        {/* ── VORTEXT ── */}
        {offer.vortext && (
          <View style={styles.vortextStyle}>
            <HtmlText html={offer.vortext} preserveEmptyLines />
          </View>
        )}

        {/* ── INSTALLATIONSORT ── */}
        {(offer.installationSite.street || offer.installationSite.city) && (
          <View style={styles.vortextStyle}>
            <Text>
              <Text style={styles.bold}>Installationsort: </Text>
              {[
                `${nz(offer.installationSite.street)} ${nz(offer.installationSite.houseNumber)}`.trim(),
                `${nz(offer.installationSite.zipCode)} ${nz(offer.installationSite.city)}`.trim(),
              ]
                .filter(Boolean)
                .join(", ")}
            </Text>
          </View>
        )}

        {/* ── POSITIONS TABLE ── */}
        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={styles.colNr}>Nr.</Text>
            <Text style={styles.colMe}>ME</Text>
            <Text style={styles.colEinheit}>Einheit</Text>
            <Text style={styles.colDesc}>Artikelbeschreibung</Text>
            <Text style={styles.colPrice}>Einzelpreis</Text>
            <Text style={styles.colTotal}>Gesamtpreis</Text>
          </View>

          {offer.groups.map((group, gIdx) => {
            const first = group.positions[0];
            const rest = group.positions.slice(1);
            return (
              <View key={gIdx}>
                {/* Group title + first position — non-breaking */}
                <View wrap={false}>
                  <View style={styles.titleRow}>
                    <Text style={styles.titleNr}>{(gIdx + 1).toString().padStart(3, "0")}</Text>
                    <Text style={styles.titleContent}>Titel: {group.title}</Text>
                  </View>
                  {first && (
                    <View style={styles.positionMainRow}>
                      <Text style={styles.colNr}>001</Text>
                      <Text style={styles.colMe}>{formatNumber(first.quantity)}</Text>
                      <Text style={styles.colEinheit}>{nz(first.unit)}</Text>
                      <View style={styles.colDesc}>
                        {!!first.itemName && <Text style={styles.articleName}>{first.itemName}</Text>}
                      </View>
                      <Text style={styles.colPrice}>{formatCurrency(first.sellingPrice)}</Text>
                      <Text style={styles.colTotal}>{formatCurrency(first.positionSumme)}</Text>
                    </View>
                  )}
                </View>
                {/* First position description — flows across pages */}
                {first && (first.bigText || first.shortText) && (
                  <View style={styles.descriptionBlock}>
                    {!!first.bigText && <HtmlText html={first.bigText} />}
                    {!!first.shortText && <HtmlText html={first.shortText} />}
                  </View>
                )}
                {/* Remaining positions */}
                {rest.map((pos, pIdx) => (
                  <PositionBlock key={pIdx + 1} position={pos} idx={pIdx + 1} isFirst={false} />
                ))}
                {/* Per-group total */}
                <View style={styles.titleTotalRow}>
                  <Text style={styles.titleTotalText}>
                    Titel {(gIdx + 1).toString().padStart(3, "0")} gesamt:{" "}
                    {formatCurrency(group.positions.reduce((s, p) => s + (p.positionSumme ?? 0), 0))}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── SUMMARY ── */}
        <View style={styles.summarySection} wrap={false}>
          {offer.groups.map((group, idx) => (
            <View key={idx} style={styles.summaryRow}>
              <Text style={styles.summaryNr}>{(idx + 1).toString().padStart(3, "0")}</Text>
              <Text style={styles.summaryName}>{group.title}</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(group.positions.reduce((s, p) => s + (p.positionSumme ?? 0), 0))}
              </Text>
            </View>
          ))}
          <View style={styles.summaryLine} />
        </View>

        {/* ── TOTALS ── */}
        <View style={styles.totalsSection} wrap={false}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Summe netto</Text>
            <Text style={styles.totalVal}>{formatCurrency(offer.netto)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>19,00 % MwSt.</Text>
            <Text style={styles.totalVal}>{formatCurrency(offer.brutto - offer.netto)}</Text>
          </View>
          <View style={[styles.totalRow, styles.bruttoRow]}>
            <Text style={styles.totalLabel}>Summe brutto</Text>
            <Text style={styles.totalVal}>{formatCurrency(offer.brutto)}</Text>
          </View>
        </View>

        {/* ── NACHTEXT ── */}
        {offer.nachtext && (
          <View style={styles.nachtextStyle} break>
            <HtmlText html={offer.nachtext} preserveEmptyLines />
          </View>
        )}

        {/* ── FOOTER ── */}
        <View style={styles.footer} fixed>
          <Text>{company.name}</Text>
          <Text render={({ pageNumber, totalPages }) => `S. ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
