const Blog = require('../../models/blogs/blogModel');
const asyncError = require('../../utils/asyncError');
const factory = require('../factoryController');

/**
 * Get list of users who posted in blogs
 */
exports.getBlogAuthors = asyncError(async (req, res, next) => {
  const BlogAuthors = await Blog.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'createdBy',
        foreignField: '_id',
        as: 'users'
      }
    },
    {
      $group: {
        _id: '$users'
      }
    },
    {
      $project: {
        name: '$_id.name',
        id: '$_id._id',
        _id: 0
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      BlogAuthors
    }
  });
});

exports.getBlog = factory.getOne(Blog);
exports.getAllBlogs = factory.getAll(Blog);
exports.createBlog = factory.createOne(Blog);
exports.updateBlog = factory.updateOne(Blog);
exports.deleteBlog = factory.deleteOne(Blog);
