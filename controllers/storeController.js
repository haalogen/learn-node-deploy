const mongoose = require('mongoose');
const Store = mongoose.model('Store'); // It's a Singleton (unique global object)
const User = mongoose.model('User'); // It's a Singleton (unique global object)
const jimp = require('jimp'); // For resizing images
const uuid = require('uuid'); // For unique fileNames
const multer = require('multer');
const multerOptions = {
  // Where to keep uploaded file
  storage: multer.memoryStorage(), // Not disk, but memory of the server (temporarily)
  // Filters which file types to accept
  // ES6, same as: fileFilter: function (...args) {...}
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/'); // image/[jpeg|png|...]
    if (isPhoto) {
      next(null, true); // next(error, value); File is OK
    } else {
      next({ message: "That filetype isn't allowed" }, false);
    }
  }
};

const confirmOwner = (store, user) => {
  // "store.author" is ObjectID so we need to use "equals()" method to compare to simple string
  if (!store.author.equals(user._id)) {
    throw Error('You must own a store in order to edit it!');
  }
}

exports.addStore = (req, res) => {
  res.render('editStore', { title: 'Add Store' });
}

exports.createStore = async (req, res) => {
  req.body.author = req.user._id; // Take the ID of the currently logged in user
  // save() is Async: Sends request to MongoDB, returns with new Store state / Error
  const store = await (new Store(req.body)).save();
  /**
   * flash(
   *   type {String} = ['success', 'error', 'warning', 'info', 'yourCustom'],
   *   message {String}
   * )
   */
  req.flash('success', `Successfully created "${store.name}". Care to leave a review?`);
  res.redirect(`/stores/${store.slug}`);
}

exports.editStore = async (req, res) => {
  // 1. Find the store given the ID
  const store = await Store.findOne({ _id: req.params.id });
  // 2. Confirm they are the owner of the store
  confirmOwner(store, req.user);
  // 3. Render out the edit form so the user can update their store
  res.render('editStore', { store, title: `Edit "${store.name}"` });
}

exports.getHearts = async (req, res) => {
  // Query database for a list of stores hearted by current user
  const stores = await Store.find({ // Find any stores
    _id: { $in: req.user.hearts }, // Where the "_id" is in the given array
  });

  res.render('stores', { stores, title: 'Hearted Stores' });
}

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug })
    // Substitutes "author" ObjectId with User object with "_id" that is equal to given ObjectId
    .populate('author reviews');
  if (!store) return next();
  res.render('store', { store, title: store.name });
}

exports.getStoresByTag = async (req, res) => {
  const tagName = req.params.tag;
  const tagQuery = tagName || { $exists: true }; // Stores with "tagName" or not-empty field
  // Our custom method "getTagsList()"
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
  res.render('tag', { stores, tagName, tags, title: 'Tags', })
};

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  if (page < 1) {
    // Handle pages 0 or negative page numbers
    res.redirect('/stores/page/1');
    return;
  }
  const limit = 4;
  const skip = (page - 1) * limit;

  // Query database for a list of stores for current page
  const storesPromise = Store
    .find()
    .sort({ created: 'desc' }) // Sort by creation date
    .skip(skip)
    .limit(limit)

  // Total number of stores in the DB
  const countPromise = Store.count();

  const [stores, count] = await Promise.all([storesPromise, countPromise]);
  const pages = Math.ceil(count / limit);

  if (page > pages) {
    req.flash('info', `Hey! You asked for page ${page}. But that page doesn't exist. So I put you on page ${pages}`);
    res.redirect(`/stores/page/${pages}`);
    return;
  }
  res.render('stores', { count, page, pages, stores, title: 'Stores' });
}

exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores();
  res.render('topStores', { stores, title: 'Top Stores' });
}

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());

  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet' // Remove or Add Unique
  const user = await User
    .findByIdAndUpdate(
      req.user._id,
      { [operator]: { hearts: req.params.id } },
      { new: true }, // Return the updated user
    );

  res.json(user)
}

exports.homePage = (req, res) => {
  res.render('index');
}

exports.mapPage = (req, res) => {
  res.render('map', { title: 'Map' });
}

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  // Mongo query
  const q = {
    location: {
      $near: { // Search for geographically near items
        $geometry: {
          type: 'Point',
          coordinates,
        },
        $maxDistance: 10 * 1000, // Metres
      }
    }
  };

  const stores = await Store
    .find(q)
    .select('description location name photo slug') // Specify which fields of Model we want to get
    .limit(10);
  // '-author -tags -created' -- Specify fields to exclude from result
  res.json(stores);
}

exports.resize = async (req, res, next) => {
  // Check if there is no new file to resize
  // (Multer have put file to req.file)
  if (!req.file) {
    next(); // skip to the next middleware
    return; // stop this function
  }
  const extension = req.file.mimetype.split('/')[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  // Now we resize
  const photo = await jimp.read(req.file.buffer);
  await photo
    .resize(800, jimp.AUTO)
    .quality(60)
    .write(`./public/uploads/${req.body.photo}`);
  // Once we have written the photo to our filesystem, keep going!
  next();
};

exports.searchStores = async (req, res) => {
  const stores = await Store
    // First: find stores that match
    .find({
      $text: {
        $search: req.query.q,
      }
    }, { // Project (add field) with metadata of query
      score: { $meta: 'textScore' } // "textScore" is a metric of text match
    })
    // Then sort the stores
    .sort({ // Mongo Sort by
      score: { $meta: 'textScore' }
    })
    // Limit to only Top-10 results
    .limit(10)

  res.json(stores);
}

exports.updateStore = async (req, res) => {
  // 0. Set the location data type to be 'Point' (MongoDB type)
  req.body.location.type = 'Point';
  // 1. Find and update the store
  /**
   * findOneAndUpdate(
   *   query {Object},
   *   data {Object},
   *   options {Object}
   * )
   */
  // req.body -- Form data sent by them
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // Return new store instead of old one
    runValidators: true, // Force the model to run validators before update
  }).exec();

  req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store</a>`);

  // 2. Redirect them to the store and tell them it worked
  res.redirect(`/stores/${store._id}/edit`)
}

// Upload middleware. It looks for a single upload field by id
exports.upload = multer(multerOptions).single('photo');