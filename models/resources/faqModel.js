const mongoose = require('mongoose');
const slugify = require('slugify');

const faqSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide FAQ title.'],
      unique: true,
      trim: true
    },
    slug: String,
    content: {
      type: String,
      trim: true,
      required: [true, 'Please provide FAQ content.'],
      minlength: [10, 'Content must have more or equal than 50 characters']
    }
  },
  {
    timestamps: true
  }
);

// Generate slug from faq title before save and create document
faqSchema.pre('save', function (next) {
  this.slug = slugify(this.title, { lower: true });
  next();
});

const FAQ = mongoose.model('FAQ', faqSchema);
module.exports = FAQ;
