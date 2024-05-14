const BlogCategory = require('../../models/blogs/blogCategoryModel');
const { BLOG_CATEGORY_KEY } = require('../../utils/crypto');
const factory = require('../factoryController');

exports.getBlogCategory = factory.getOne(BlogCategory);
exports.getAllBlogCategories = factory.getAll(BlogCategory, BLOG_CATEGORY_KEY);
exports.createBlogCategory = factory.createOne(BlogCategory);
exports.updateBlogCategory = factory.updateOne(BlogCategory);
exports.deleteBlogCategory = factory.deleteOne(BlogCategory);
