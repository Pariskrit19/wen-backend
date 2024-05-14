const mongoose = require('mongoose');
const slugify = require('slugify');

const policySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide policy title.'],
      unique: true,
      trim: true
    },
    slug: String,
    content: {
      type: String,
      trim: true,
      required: [true, 'Please provide policy content.'],
      minlength: [10, 'Content must have more or equal than 50 characters']
    }
  },
  {
    timestamps: true
  }
);

// Generate slug from policy title before save and create document
policySchema.pre('save', function (next) {
  this.slug = slugify(this.title, { lower: true });
  next();
});

const Policy = mongoose.model('Policy', policySchema);
module.exports = Policy;
