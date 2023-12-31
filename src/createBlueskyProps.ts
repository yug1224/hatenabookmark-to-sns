import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts';
import { FeedEntry } from 'https://deno.land/x/rss@0.6.0/src/types/mod.ts';
import defaultsGraphemer from 'npm:graphemer';

const Graphemer = defaultsGraphemer.default;
const splitter = new Graphemer();

import AtprotoAPI, { BskyAgent } from 'npm:@atproto/api';
const { RichText } = AtprotoAPI;

export default async (agent: BskyAgent, item: FeedEntry) => {
  const description = (() => {
    if (!item.description?.value) return '';
    const doc = new DOMParser().parseFromString(
      item.description?.value,
      'text/html',
    );
    return (doc?.documentElement?.textContent || '').trim();
  })();
  const link = item.links[0].href || '';

  // Bluesky用のテキストを作成
  const bskyText = await (async () => {
    const { host, pathname } = new URL(link);
    const key = splitter.splitGraphemes(`${host}${pathname}`).slice(0, 19).join('') + '...';
    const text = `${key}\n${description}`;

    const rt = new RichText({ text });
    await rt.detectFacets(agent);
    rt.facets = [
      {
        index: {
          byteStart: 0,
          byteEnd: splitter.countGraphemes(key),
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

  console.log('success createBlueskyProps');
  return { bskyText, link };
};
