import { getCollection } from 'astro:content';
import type { APIRoute, GetStaticPaths } from 'astro';

export const getStaticPaths: GetStaticPaths = async () => {
  const albums = await getCollection('albums');
  const allPhotos = await getCollection('photos');

  return albums.map((album) => {
    const photos = allPhotos
      .filter((p) => (p.data.albums || []).includes(album.data.title))
      .sort((a, b) => (a.data.date?.getTime() ?? 0) - (b.data.date?.getTime() ?? 0))
      .map((p) => p.id);

    return {
      params: { slug: album.id },
      props: { photos, title: album.data.title },
    };
  });
};

export const GET: APIRoute = ({ props }) => {
  return new Response(JSON.stringify(props), {
    headers: { 'Content-Type': 'application/json' },
  });
};
