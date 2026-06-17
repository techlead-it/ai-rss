import { XMLParser } from "fast-xml-parser";
import type { FeedItem } from "../types";
import { htmlToText } from "../text";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

type XmlNode = Record<string, unknown>;

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/** 文字列・数値・`{ "#text": ... }` ノードからテキストを取り出す。 */
function textOf(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    const text = (value as XmlNode)["#text"];
    if (typeof text === "string") return text;
    if (typeof text === "number") return String(text);
  }
  return "";
}

function toIso(dateText: string): string | null {
  if (!dateText) return null;
  const ms = Date.parse(dateText);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

function pickAtomLink(link: unknown): string {
  for (const node of toArray<unknown>(link)) {
    if (typeof node === "string") return node;
    const href = (node as XmlNode)["@_href"];
    if (typeof href === "string") return href;
  }
  return "";
}

function parseRssItems(channel: XmlNode, source: string): FeedItem[] {
  return toArray<XmlNode>(channel.item as XmlNode | XmlNode[]).map((item) => ({
    url: textOf(item.link).trim(),
    guid: item.guid != null ? textOf(item.guid) : null,
    source,
    title: textOf(item.title).trim(),
    excerpt: htmlToText(textOf(item.description)),
    publishedAt: toIso(textOf(item.pubDate)),
  }));
}

function parseAtomEntries(feed: XmlNode, source: string): FeedItem[] {
  return toArray<XmlNode>(feed.entry as XmlNode | XmlNode[]).map((entry) => ({
    url: pickAtomLink(entry.link).trim(),
    guid: entry.id != null ? textOf(entry.id) : null,
    source,
    title: textOf(entry.title).trim(),
    excerpt: htmlToText(textOf(entry.content ?? entry.summary)),
    publishedAt: toIso(textOf(entry.updated ?? entry.published)),
  }));
}

/** RSS 2.0 / Atom フィードの XML をパースして記事メタの配列に変換する。 */
export function parseFeed(xml: string, source: string): FeedItem[] {
  let doc: XmlNode;
  try {
    doc = parser.parse(xml) as XmlNode;
  } catch {
    return [];
  }
  const rss = doc.rss as XmlNode | undefined;
  if (rss?.channel) return parseRssItems(rss.channel as XmlNode, source);
  const feed = doc.feed as XmlNode | undefined;
  if (feed) return parseAtomEntries(feed, source);
  return [];
}
