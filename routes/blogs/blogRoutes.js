const express = require('express');

const blogController = require('../../controllers/blogs/blogController');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();

router.get('/blog-authors', blogController.getBlogAuthors);

router
  .route('/')
  .get(blogController.getAllBlogs)
  .post(authMiddleware.protect, blogController.createBlog);

router
  .route('/:id')
  .get(blogController.getBlog)
  .patch(authMiddleware.protect, blogController.updateBlog)
  .delete(authMiddleware.protect, blogController.deleteBlog);

module.exports = router;
