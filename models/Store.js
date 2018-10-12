const mongoose = require('mongoose');
// We gonna use Async/Await and ES6 Promises as Mongoose promises
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
  author: { // Relationship between "Store" and "User"
    type: mongoose.Schema.ObjectId, // Mongo ID
    ref: 'User', // "author" is a reference to "User"
    required: 'You must supply an author',
  },
  created: {
    type: Date,
    default: Date.now,
  },
  description: {
    type: String,
    trim: true,
  },
  location: {
    type: {
      type: String,
      default: 'Point',
    },
    coordinates: [{
      type: Number,
      required: 'You must supply coordinates!',
    }],
    address: {
      type: String,
      trim: true,
      required: 'You must supply an address!',
    },
  },
  name: {
    type: String,
    // Rule of thumb: Do data normalization as close as possible to the model
    trim: true,
    required: 'Please enter a store name!',
  },
  photo: String,
  slug: String,
  tags: [String],
}, {
  // Put virtual fields to resulting JSON and Object
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Define our indexes
storeSchema.index({
  name: 'text',
  description: 'text', // It will be a "Compound Index" (built from several fields)
})

storeSchema.index({ location: '2dsphere' }); // Save geo metadata for field "location"

function autopopulate(next) {
  this.populate('reviews');
  next();
}

// Auto-populate reviews when find any store
storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

// Auto-generate slug before saving Store state
storeSchema.pre('save', async function (next) {
  // Can't be an arrow function because we need `this` to be equal to store
  // that we are trying to save.
  if (!this.isModified('name')) {
    next(); // Skip it
    return; // Stop this function from running
  }
  this.slug = slug(this.name);
  // Find other stores that have a slug of stan, stan-2, ...
  // RegEx: "?" means "optional"
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]+$)?)$`, 'i');
  // "this.constructor" will be equal to Store by the time this function is run
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx });

  if (storesWithSlug.length) {
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }
  next();
});

// Static method bound to Store model
storeSchema.statics.getTagsList = function() {
  // Use "function()" because we need "this" point at the Store model
  return this.aggregate([
    { $unwind: '$tags' }, // Duplicate stores so that each object has single tag
    { $group: { _id: '$tags', count: { $sum: 1 } } }, // Group stores by tag and count number of stores in each group
    { $sort: { count: -1 } }, // Sort by "count" field in descending order (-1)
  ]);
}

storeSchema.statics.getTopStores = function() {
  return this.aggregate([ // Low-level MongoDB function
    // Lookup stores and populate their reviews
    // MongoDB does: 'Review' (model name) -> 'reviews' (lowercase + 's')
    { $lookup: { from: 'reviews', localField: '_id', foreignField: 'store', as: 'reviews' }},
    // Filter for only items that have 2 or more reviews
    // 'reviews.1' -- second item from collection "reviews"
    { $match: { 'reviews.1': { $exists: true }}},
    // Add the average reviews field
    // "$" in "$reviews" means the data is from previous step of pipeline

    // --- (MongoDB 3.2)
    { $project: {
      name: '$$ROOT.name', // '$$ROOT is original document
      photo: '$$ROOT.photo',
      reviews: '$$ROOT.reviews',
      slug: '$$ROOT.slug',
      averageRating: { $avg: '$reviews.rating' },
    }},

    // --- Alternative way (MongoDB 3.4+)
    // { $addFields: { // Adds new fields
    //   averageRating: { $avg: '$reviews.rating' },
    // }}

    // Sort it by our new field, highest reviews first
    { $sort: { averageRating: -1 }},
    // Limit to at most 10
    { $limit: 10 },
  ]);
}

// Find reviews where store._id === review.store (kind of JOIN in SQL)
// Virtual fields (Mongoose feature) don't go to JSON unless you explicitly ask for it: "store.reviews"
storeSchema.virtual('reviews', {
  ref: 'Review', // What model to link?
  localField: '_id', // Which field on the store?
  foreignField: 'store', // Which field on the review?
});

// "Main" export of the file
module.exports = mongoose.model('Store', storeSchema);