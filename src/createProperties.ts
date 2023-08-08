import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';
import { FeedEntry } from 'https://deno.land/x/rss@0.6.0/src/types/mod.ts';
import AtprotoAPI from 'npm:@atproto/api';
import defaultsGraphemer from 'npm:graphemer';

const Graphemer = defaultsGraphemer.default;
const splitter = new Graphemer();

const { BskyAgent, RichText } = AtprotoAPI;
const service = 'https://bsky.social';
const agent = new BskyAgent({ service });

export default async (item: FeedEntry) => {
  const title = item.title?.value || '';
  const description = (() => {
    if (!item.description?.value) return '';
    const doc = new DOMParser().parseFromString(
      item.description?.value,
      'text/html'
    );
    return doc?.documentElement?.textContent || '';
  })();
  const link = item.links[0].href || '';

  // Bluesky用のテキストを作成
  const bskyText = await (async () => {
    const max = 300;
    const { host, pathname } = new URL(link);
    const key =
      splitter.splitGraphemes(`${host}${pathname}`).slice(0, 19).join('') +
      '...';
    const text =
      splitter.countGraphemes(`${description}\n\n${title}\n${key}`) <= max
        ? `${description}\n\n${title}\n${key}`
        : `${description}\n\n${key}`;

    const rt = new RichText({ text });
    await rt.detectFacets(agent);
    rt.facets = [
      {
        index: {
          byteStart: rt.unicodeText.length - splitter.countGraphemes(key),
          byteEnd: rt.unicodeText.length,
        },
        features: [
          {
            $type: 'app.bsky.richtext.facet#link',
            uri: link,
          },
        ],
      },
      ...(rt.facets || []),
    ];
    return rt;
  })();

  // X用のテキストを作成
  const xText = (() => {
    const max = 118;
    return splitter.countGraphemes(`${description}\n\n${title}`) <= max
      ? `${description}\n\n${title}\n${link}`
      : `${description}\n\n${link}`;
  })();

  return {
    bskyText,
    xText,
    title,
    link,
  };
};
