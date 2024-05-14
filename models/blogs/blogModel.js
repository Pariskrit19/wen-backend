const mongoose = require('mongoose');
const slugify = require('slugify');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide blog title.'],
      unique: true,
      trim: true
    },
    slug: String,
    content: {
      type: String,
      trim: true,
      required: [true, 'Please provide blog content.'],
      minlength: [10, 'Content must have more or equal than 50 characters']
    },
    blogCategories: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'Blog_Category'
      }
    ],
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Generate slug from blog title before save and create document
blogSchema.pre('save', function (next) {
  this.slug = slugify(this.title, { lower: true });
  next();
});

blogSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'blogCategories',
    select: 'name'
  }).populate({
    path: 'createdBy updatedBy',
    select: '-role -position name'
  });
  next();
});

const Blog = mongoose.model('Blog', blogSchema);
module.exports = Blog;
