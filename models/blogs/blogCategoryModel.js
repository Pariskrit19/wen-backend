const mongoose = require('mongoose');

const blogCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide blog category name.'],
    unique: true,
    trim: true
  }
});

const BlogCategory = mongoose.model('Blog_Category', blogCategorySchema);
module.exports = BlogCategory;
