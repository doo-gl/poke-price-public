db.createCollection('marketplace.listings');
db.createCollection('search.tags');
db.createCollection('item');
db.marketplace.listings.createIndex({
  tags: 1,
  listingEndsAt: -1
});