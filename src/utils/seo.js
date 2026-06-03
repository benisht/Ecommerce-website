// src/utils/seo.js
// Dynamic head tags manipulator for Single Page Application (SPA) SEO Optimization

export const setSEOTags = (title, description) => {
  // Update Title
  const baseTitle = 'LOOKWALK | Futuristic Fashion & Apparel';
  document.title = title ? `${title} | LOOKWALK` : baseTitle;

  // Update Meta Description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute(
    'content', 
    description || 'LOOKWALK - Trending cutting-edge fashion and apparel for the modern world. Shop hoodies, watches, glasses and more.'
  );

  // Update Open Graph (OG) Tags for Social Media previews
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    ogTitle = document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    document.head.appendChild(ogTitle);
  }
  ogTitle.setAttribute('content', title ? `${title} | LOOKWALK` : baseTitle);

  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (!ogDesc) {
    ogDesc = document.createElement('meta');
    ogDesc.setAttribute('property', 'og:description');
    document.head.appendChild(ogDesc);
  }
  ogDesc.setAttribute(
    'content', 
    description || 'LOOKWALK - Trending cutting-edge fashion and apparel for the modern world.'
  );
};
